import os
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from .database import BASE_DIR

ALGORITHM = "HS256"
TOKEN_TTL = timedelta(days=7)


def _load_secret() -> str:
    """本番は SECRET_KEY 環境変数で必ず指定する。未指定の開発時のみファイルに生成・保存する。"""
    env = os.getenv("SECRET_KEY")
    if env:
        return env
    path = BASE_DIR / ".secret_key"
    if path.exists():
        return path.read_text().strip()
    key = secrets.token_urlsafe(48)
    path.write_text(key)
    return key


SECRET_KEY = _load_secret()

# 存在しないメールでもbcrypt照合と同程度の時間を使い、ユーザーの有無を時間差で推測されにくくする
_DUMMY_HASH = bcrypt.hashpw(b"dummy-password", bcrypt.gensalt()).decode()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str | None) -> bool:
    try:
        ok = bcrypt.checkpw(password.encode()[:72], (password_hash or _DUMMY_HASH).encode())
    except ValueError:
        return False
    return ok and password_hash is not None


def create_access_token(user_id: int) -> str:
    exp = datetime.now(timezone.utc) + TOKEN_TTL
    return jwt.encode({"sub": str(user_id), "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
