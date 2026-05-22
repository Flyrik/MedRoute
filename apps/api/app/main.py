import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .db.redis import close_redis
from .routers import health, parcours, praticiens, pdf

logging.basicConfig(level=settings.log_level)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await close_redis()


app = FastAPI(title="MedRoute API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    allow_credentials=True,
)

app.include_router(health.router)
app.include_router(parcours.router, prefix="/parcours", tags=["parcours"])
app.include_router(praticiens.router, prefix="/praticiens", tags=["praticiens"])
app.include_router(pdf.router, tags=["pdf"])
