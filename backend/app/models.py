from datetime import date, datetime, timezone

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def _now() -> datetime:
    # 列は timezone なしの DateTime。PostgreSQL がセッションのタイムゾーンで値をずらさないよう、
    # UTC の naive datetime で保存する
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(254), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=_now)

    tabs: Mapped[list["Tab"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )


class Tab(Base):
    __tablename__ = "tabs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # 認証導入前に作られた既存タブは NULL（最初に登録したユーザーが引き継ぐ）
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=_now)

    user: Mapped[User | None] = relationship(back_populates="tabs")
    tasks: Mapped[list["Task"]] = relationship(
        back_populates="tab", cascade="all, delete-orphan", passive_deletes=True
    )


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tab_id: Mapped[int] = mapped_column(
        ForeignKey("tabs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    priority: Mapped[str] = mapped_column(String(10), nullable=False, default="medium")
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=_now, onupdate=_now
    )

    tab: Mapped[Tab] = relationship(back_populates="tasks")
