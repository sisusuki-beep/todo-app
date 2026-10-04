import re
from datetime import date, datetime
from enum import Enum
from typing import Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    StringConstraints,
    field_validator,
)

# 半角英小文字と数字のみ、両方を含み、8文字以上（bcryptの上限に合わせ72文字まで）
PASSWORD_PATTERN = re.compile(r"^(?=.*[a-z])(?=.*[0-9])[a-z0-9]{8,72}$")
PASSWORD_MESSAGE = "パスワードは半角英小文字と数字を組み合わせた8文字以上にしてください"


class UserRegister(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email")
    @classmethod
    def _lower_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("password")
    @classmethod
    def _check_password(cls, v: str) -> str:
        if not PASSWORD_PATTERN.fullmatch(v):
            raise ValueError(PASSWORD_MESSAGE)
        return v


class UserLogin(BaseModel):
    email: EmailStr
    # ログイン時は形式を検証しない（規則変更前のパスワードでも入れるように）
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def _lower_email(cls, v: str) -> str:
        return v.strip().lower()


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead

TabName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]
TaskTitle = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


class Priority(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"


class StatusFilter(str, Enum):
    all = "all"
    active = "active"
    completed = "completed"


class SortKey(str, Enum):
    manual = "manual"
    due_date = "due_date"
    priority = "priority"
    created_at = "created_at"


# ---- Tab ----
class TabCreate(BaseModel):
    name: TabName


class TabUpdate(BaseModel):
    name: TabName | None = None
    order: int | None = Field(default=None, ge=0)


class TabRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    order: int
    created_at: datetime
    incomplete_count: int = 0


# ---- Task ----
class TaskCreate(BaseModel):
    tab_id: int
    title: TaskTitle
    description: str | None = Field(default=None, max_length=10000)
    priority: Priority = Priority.medium
    due_date: date | None = None


class TaskUpdate(BaseModel):
    """部分更新可。明示的にnullを送ると description / due_date をクリアできる。"""

    tab_id: int | None = None
    title: TaskTitle | None = None
    description: str | None = Field(default=None, max_length=10000)
    is_completed: bool | None = None
    priority: Priority | None = None
    due_date: date | None = None
    order: int | None = Field(default=None, ge=0)

    @field_validator("title", "priority", "is_completed", "tab_id", "order", mode="before")
    @classmethod
    def _no_explicit_null(cls, v):
        if v is None:
            raise ValueError("null is not allowed for this field")
        return v


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tab_id: int
    title: str
    description: str | None
    is_completed: bool
    priority: Priority
    due_date: date | None
    order: int
    created_at: datetime
    updated_at: datetime
