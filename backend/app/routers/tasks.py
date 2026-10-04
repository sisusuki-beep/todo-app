from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(tags=["tasks"])


def _404(e: crud.NotFoundError) -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, str(e))


@router.get("/tabs/{tab_id}/tasks", response_model=list[schemas.TaskRead])
def list_tasks(
    tab_id: int,
    status_filter: schemas.StatusFilter = Query(schemas.StatusFilter.all, alias="status"),
    sort: schemas.SortKey = schemas.SortKey.manual,
    q: str | None = Query(None, max_length=200, description="タブ内キーワード検索"),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    try:
        return crud.list_tasks(db, user.id, tab_id, status_filter, sort, q)
    except crud.NotFoundError as e:
        raise _404(e)


@router.get("/tasks", response_model=list[schemas.TaskRead])
def search_tasks(
    q: str = Query(..., min_length=1, max_length=200, description="全タブ横断キーワード検索"),
    status_filter: schemas.StatusFilter = Query(schemas.StatusFilter.all, alias="status"),
    sort: schemas.SortKey = schemas.SortKey.manual,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return crud.search_tasks(db, user.id, q, status_filter, sort)


@router.post("/tasks", response_model=schemas.TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(
    data: schemas.TaskCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    try:
        return crud.create_task(db, user.id, data)
    except crud.NotFoundError as e:
        raise _404(e)


@router.get("/tasks/{task_id}", response_model=schemas.TaskRead)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    try:
        return crud.get_task(db, user.id, task_id)
    except crud.NotFoundError as e:
        raise _404(e)


@router.put("/tasks/{task_id}", response_model=schemas.TaskRead)
def update_task(
    task_id: int,
    data: schemas.TaskUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    try:
        return crud.update_task(db, user.id, task_id, data)
    except crud.NotFoundError as e:
        raise _404(e)


@router.patch("/tasks/{task_id}/toggle", response_model=schemas.TaskRead)
def toggle_task(
    task_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    try:
        return crud.toggle_task(db, user.id, task_id)
    except crud.NotFoundError as e:
        raise _404(e)


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    try:
        crud.delete_task(db, user.id, task_id)
    except crud.NotFoundError as e:
        raise _404(e)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
