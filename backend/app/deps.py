from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from . import models
from .database import get_db
from .security import decode_access_token

_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> models.User:
    user_id = decode_access_token(creds.credentials) if creds else None
    user = db.get(models.User, user_id) if user_id is not None else None
    if user is None:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "認証が必要です",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
