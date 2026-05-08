"""FastAPI app exposing the bot→app sync endpoint.

The Lira app generates a stable `device_id`, opens the deep link
``t.me/<bot>?start=app_<device_id>`` so the bot binds that id to a
user, then long-polls ``GET /v1/sync/pull?device_id=...`` to fetch
the current Telegram subscription + cycle data.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from bot.config import get_settings
from bot.db import engine, session_scope
from bot.models import Base
from bot.services.catalog import seed_catalog
from bot.services.sync import build_sync_payload

log = logging.getLogger("flowcare-api")
logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with session_scope() as session:
        await seed_catalog(session)
    yield


app = FastAPI(
    title="Lira Sync API",
    version="2.0.0",
    description=(
        "One-way sync: pulls subscription + cycle data from the Lira "
        "Telegram bot into the Lira app via a per-device id."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/v1/sync/pull")
async def sync_pull(
    device_id: str = Query(..., min_length=6, max_length=64, regex=r"^[A-Za-z0-9_\-]+$"),
) -> dict[str, Any]:
    async with session_scope() as session:
        return await build_sync_payload(session, device_id)


@app.get("/v1/sync/bot")
async def sync_bot_info() -> dict[str, str]:
    """Return the public bot username so the app can build deep links."""
    settings = get_settings()
    return {
        "bot_username": settings.bot_username or "lowerBsk24_bot",
        "deep_link_prefix": "app_",
    }


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


def run() -> None:  # pragma: no cover
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "api.main:app", host=settings.api_host, port=settings.api_port, reload=False
    )
