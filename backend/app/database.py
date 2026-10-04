import os
from pathlib import Path
from typing import Iterator

from dotenv import load_dotenv
from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

BASE_DIR = Path(__file__).resolve().parent.parent
# backend/.env があれば読み込む（既に設定済みの環境変数は上書きしない）
load_dotenv(BASE_DIR / ".env")


def normalize_database_url(url: str) -> str:
    """ホスティング各社が出す `postgres://` / `postgresql://` を psycopg 3 用の形式にそろえる。"""
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix) :]
    return url


# 本番は PostgreSQL（例: postgresql://user:pass@host:5432/dbname）。未設定なら開発用のSQLite。
DATABASE_URL = normalize_database_url(os.getenv("DATABASE_URL") or f"sqlite:///{BASE_DIR / 'todo.db'}")

_is_sqlite = DATABASE_URL.startswith("sqlite")
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
    # マネージドPostgreSQLはアイドル接続を切ることがあるため、使用前に生存確認する
    pool_pre_ping=not _is_sqlite,
)

if _is_sqlite:

    @event.listens_for(engine, "connect")
    def _enable_sqlite_fk(dbapi_conn, _record) -> None:
        # SQLiteは既定で外部キー制約が無効のため有効化する
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def init_db() -> None:
    from . import models  # noqa: F401  (モデルをメタデータに登録)

    Base.metadata.create_all(bind=engine)
    _migrate_tabs_user_id()


def _migrate_tabs_user_id() -> None:
    """認証導入前に作成された tabs テーブルへ user_id 列を追加する（create_all は既存表を変更しない）。"""
    insp = inspect(engine)
    if "user_id" in {c["name"] for c in insp.get_columns("tabs")}:
        return
    with engine.begin() as conn:
        conn.execute(
            text("ALTER TABLE tabs ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE")
        )
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_tabs_user_id ON tabs (user_id)"))


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
