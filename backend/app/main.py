import os
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import init_db
from .routers import auth, tabs, tasks


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="ToDo API", version="0.2.0", lifespan=lifespan)

# 開発時のフロントエンドオリジンのみ許可（CORS_ORIGINS でカンマ区切り上書き可）
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api")
api.include_router(auth.router)
api.include_router(tabs.router)
api.include_router(tasks.router)
app.include_router(api)


@app.get("/health", include_in_schema=False)
def health():
    return {"status": "ok"}
