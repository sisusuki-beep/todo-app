from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db
from ..deps import get_current_user
from ..security import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


def _token_response(user: models.User) -> schemas.TokenResponse:
    return schemas.TokenResponse(
        access_token=create_access_token(user.id),
        user=schemas.UserRead.model_validate(user),
    )


@router.post("/register", response_model=schemas.TokenResponse, status_code=status.HTTP_201_CREATED)
def register(data: schemas.UserRegister, db: Session = Depends(get_db)):
    try:
        user = crud.create_user(db, data)
    except crud.ConflictError as e:
        raise HTTPException(status.HTTP_409_CONFLICT, str(e))
    return _token_response(user)


@router.post("/login", response_model=schemas.TokenResponse)
def login(data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = crud.authenticate(db, data.email, data.password)
    if user is None:
        # メール未登録とパスワード違いを区別しない
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "メールアドレスまたはパスワードが正しくありません",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _token_response(user)


@router.get("/me", response_model=schemas.UserRead)
def me(user: models.User = Depends(get_current_user)):
    return user
