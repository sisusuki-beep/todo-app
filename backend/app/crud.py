from typing import Sequence

from sqlalchemy import case, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from . import models, schemas
from .security import hash_password, verify_password

DEFAULT_TAB_NAME = "タスク"


class NotFoundError(Exception):
    pass


class ConflictError(Exception):
    pass


# ---------------------------------------------------------------- helpers
def _like_pattern(q: str) -> str:
    escaped = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def _move(items: list, target, new_index: int) -> None:
    """items 内で target を new_index へ移動し、order を0から振り直す。"""
    items.remove(target)
    items.insert(max(0, min(new_index, len(items))), target)
    for i, item in enumerate(items):
        item.order = i


# ------------------------------------------------------------------ users
def get_user_by_email(db: Session, email: str) -> models.User | None:
    return db.scalar(select(models.User).where(models.User.email == email))


def create_user(db: Session, data: schemas.UserRegister) -> models.User:
    if get_user_by_email(db, data.email):
        raise ConflictError("このメールアドレスは既に登録されています")
    is_first_user = db.scalar(select(func.count()).select_from(models.User)) == 0
    user = models.User(email=data.email, password_hash=hash_password(data.password))
    db.add(user)
    try:
        db.flush()
    except IntegrityError:  # 同時登録で一意制約に当たった場合
        db.rollback()
        raise ConflictError("このメールアドレスは既に登録されています")
    if is_first_user:
        # 認証導入前から存在するタブ（所有者なし）を最初のユーザーが引き継ぐ
        db.execute(update(models.Tab).where(models.Tab.user_id.is_(None)).values(user_id=user.id))
    ensure_default_tab(db, user.id)
    db.commit()
    return user


def authenticate(db: Session, email: str, password: str) -> models.User | None:
    user = get_user_by_email(db, email)
    if not verify_password(password, user.password_hash if user else None):
        return None
    return user


# ------------------------------------------------------------------- tabs
def _incomplete_counts(db: Session, user_id: int) -> dict[int, int]:
    rows = db.execute(
        select(models.Task.tab_id, func.count())
        .join(models.Tab)
        .where(models.Tab.user_id == user_id, models.Task.is_completed.is_(False))
        .group_by(models.Task.tab_id)
    ).all()
    return {tab_id: count for tab_id, count in rows}


def _tab_read(tab: models.Tab, counts: dict[int, int]) -> schemas.TabRead:
    out = schemas.TabRead.model_validate(tab)
    out.incomplete_count = counts.get(tab.id, 0)
    return out


def _user_tabs(db: Session, user_id: int) -> list[models.Tab]:
    return list(
        db.scalars(
            select(models.Tab)
            .where(models.Tab.user_id == user_id)
            .order_by(models.Tab.order, models.Tab.id)
        )
    )


def list_tabs(db: Session, user_id: int) -> list[schemas.TabRead]:
    ensure_default_tab(db, user_id)
    counts = _incomplete_counts(db, user_id)
    return [_tab_read(t, counts) for t in _user_tabs(db, user_id)]


def get_tab(db: Session, user_id: int, tab_id: int) -> models.Tab:
    tab = db.scalar(
        select(models.Tab).where(models.Tab.id == tab_id, models.Tab.user_id == user_id)
    )
    if tab is None:
        raise NotFoundError(f"Tab {tab_id} not found")
    return tab


def tab_to_read(db: Session, user_id: int, tab: models.Tab) -> schemas.TabRead:
    return _tab_read(tab, _incomplete_counts(db, user_id))


def create_tab(db: Session, user_id: int, data: schemas.TabCreate) -> models.Tab:
    next_order = db.scalar(
        select(func.coalesce(func.max(models.Tab.order), -1) + 1).where(
            models.Tab.user_id == user_id
        )
    )
    tab = models.Tab(user_id=user_id, name=data.name, order=next_order)
    db.add(tab)
    db.commit()
    return tab


def update_tab(db: Session, user_id: int, tab_id: int, data: schemas.TabUpdate) -> models.Tab:
    tab = get_tab(db, user_id, tab_id)
    if data.name is not None:
        tab.name = data.name
    if data.order is not None:
        _move(_user_tabs(db, user_id), tab, data.order)
    db.commit()
    return tab


def delete_tab(db: Session, user_id: int, tab_id: int) -> None:
    tab = get_tab(db, user_id, tab_id)
    if len(_user_tabs(db, user_id)) <= 1:
        raise ConflictError("The last remaining tab cannot be deleted")
    db.delete(tab)
    db.flush()
    for i, t in enumerate(_user_tabs(db, user_id)):
        t.order = i
    db.commit()


def ensure_default_tab(db: Session, user_id: int) -> None:
    """最低1つのタブが常に存在する不変条件をユーザーごとに保証する。"""
    exists = db.scalar(select(models.Tab.id).where(models.Tab.user_id == user_id).limit(1))
    if exists is None:
        db.add(models.Tab(user_id=user_id, name=DEFAULT_TAB_NAME, order=0))
        db.commit()


# ------------------------------------------------------------------ tasks
_PRIORITY_RANK = case(
    (models.Task.priority == "high", 0),
    (models.Task.priority == "medium", 1),
    else_=2,
)


def _user_tasks(user_id: int):
    """ログインユーザーのタブに属するタスクだけを対象にするクエリの起点。"""
    return select(models.Task).join(models.Tab).where(models.Tab.user_id == user_id)


def list_tasks(
    db: Session,
    user_id: int,
    tab_id: int,
    status: schemas.StatusFilter = schemas.StatusFilter.all,
    sort: schemas.SortKey = schemas.SortKey.manual,
    q: str | None = None,
) -> Sequence[models.Task]:
    get_tab(db, user_id, tab_id)
    stmt = _user_tasks(user_id).where(models.Task.tab_id == tab_id)
    stmt = _apply_filters(stmt, status, q)
    return db.scalars(_apply_sort(stmt, sort)).all()


def search_tasks(
    db: Session,
    user_id: int,
    q: str,
    status: schemas.StatusFilter = schemas.StatusFilter.all,
    sort: schemas.SortKey = schemas.SortKey.manual,
) -> Sequence[models.Task]:
    """全タブ横断のキーワード検索。"""
    stmt = _apply_filters(_user_tasks(user_id), status, q)
    return db.scalars(_apply_sort(stmt, sort)).all()


def _apply_filters(stmt, status: schemas.StatusFilter, q: str | None):
    if status == schemas.StatusFilter.active:
        stmt = stmt.where(models.Task.is_completed.is_(False))
    elif status == schemas.StatusFilter.completed:
        stmt = stmt.where(models.Task.is_completed.is_(True))
    if q and q.strip():
        pattern = _like_pattern(q.strip())
        stmt = stmt.where(
            models.Task.title.ilike(pattern, escape="\\")
            | models.Task.description.ilike(pattern, escape="\\")
        )
    return stmt


def _apply_sort(stmt, sort: schemas.SortKey):
    if sort == schemas.SortKey.due_date:
        # 期限なしは末尾
        return stmt.order_by(
            models.Task.due_date.is_(None), models.Task.due_date, models.Task.order, models.Task.id
        )
    if sort == schemas.SortKey.priority:
        return stmt.order_by(_PRIORITY_RANK, models.Task.order, models.Task.id)
    if sort == schemas.SortKey.created_at:
        return stmt.order_by(models.Task.created_at.desc(), models.Task.id.desc())
    return stmt.order_by(models.Task.tab_id, models.Task.order, models.Task.id)


def get_task(db: Session, user_id: int, task_id: int) -> models.Task:
    task = db.scalar(_user_tasks(user_id).where(models.Task.id == task_id))
    if task is None:
        raise NotFoundError(f"Task {task_id} not found")
    return task


def _next_task_order(db: Session, tab_id: int) -> int:
    return db.scalar(
        select(func.coalesce(func.max(models.Task.order), -1) + 1).where(
            models.Task.tab_id == tab_id
        )
    )


def create_task(db: Session, user_id: int, data: schemas.TaskCreate) -> models.Task:
    get_tab(db, user_id, data.tab_id)
    task = models.Task(
        tab_id=data.tab_id,
        title=data.title,
        description=data.description,
        priority=data.priority.value,
        due_date=data.due_date,
        order=_next_task_order(db, data.tab_id),
    )
    db.add(task)
    db.commit()
    return task


def update_task(db: Session, user_id: int, task_id: int, data: schemas.TaskUpdate) -> models.Task:
    task = get_task(db, user_id, task_id)
    sent = data.model_fields_set

    if data.tab_id is not None and data.tab_id != task.tab_id:
        get_tab(db, user_id, data.tab_id)  # 他人のタブへは移動できない
        task.tab_id = data.tab_id
        # 移動先タブの末尾に置く（order 指定があれば後段で上書き）
        task.order = _next_task_order(db, data.tab_id)
    if data.title is not None:
        task.title = data.title
    if "description" in sent:
        task.description = data.description
    if data.is_completed is not None:
        task.is_completed = data.is_completed
    if data.priority is not None:
        task.priority = data.priority.value
    if "due_date" in sent:
        task.due_date = data.due_date
    if data.order is not None:
        siblings = list(
            db.scalars(
                select(models.Task)
                .where(models.Task.tab_id == task.tab_id)
                .order_by(models.Task.order, models.Task.id)
            )
        )
        if task not in siblings:  # タブ移動直後でflush前の場合
            siblings.append(task)
        _move(siblings, task, data.order)
    db.commit()
    return task


def toggle_task(db: Session, user_id: int, task_id: int) -> models.Task:
    task = get_task(db, user_id, task_id)
    task.is_completed = not task.is_completed
    db.commit()
    return task


def delete_task(db: Session, user_id: int, task_id: int) -> None:
    db.delete(get_task(db, user_id, task_id))
    db.commit()
