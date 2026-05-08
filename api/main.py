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

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from bot.config import get_settings
from bot.db import engine, session_scope
from bot.models import Base
from bot.services.catalog import seed_catalog
from bot.services.gigachat import (
    DEFAULT_SYSTEM_PROMPT,
    get_client as get_gigachat_client,
    non_medical_disclaimer,
)
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


class LiraChatMessage(BaseModel):
    role: str = Field(..., pattern=r"^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=4000)


class LiraChatIn(BaseModel):
    messages: list[LiraChatMessage] = Field(..., min_length=1, max_length=24)
    cycle_day: int | None = Field(default=None, ge=1, le=120)
    phase: str | None = Field(default=None, max_length=32)


class LiraChatOut(BaseModel):
    reply: str
    disclaimer: str
    enabled: bool = True


@app.get("/v1/lira/status")
async def lira_status() -> dict[str, bool]:
    """Quick check whether GigaChat is configured on this backend."""
    return {"enabled": get_gigachat_client() is not None}


@app.post("/v1/lira/chat", response_model=LiraChatOut)
async def lira_chat(body: LiraChatIn) -> LiraChatOut:
    client = get_gigachat_client()
    if client is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Lira assistant is not configured on this server "
                "(GIGACHAT_CLIENT_ID / GIGACHAT_CLIENT_SECRET missing)."
            ),
        )
    system_prompt = DEFAULT_SYSTEM_PROMPT
    if body.cycle_day is not None or body.phase:
        ctx_bits = []
        if body.cycle_day is not None:
            ctx_bits.append(f"день цикла {body.cycle_day}")
        if body.phase:
            ctx_bits.append(f"фаза «{body.phase}»")
        system_prompt += "\n\nКонтекст пользовательницы: " + ", ".join(ctx_bits) + "."
    try:
        reply = await client.chat(
            [m.model_dump() for m in body.messages],
            system_prompt=system_prompt,
        )
    except httpx.HTTPStatusError as exc:
        log.warning("GigaChat HTTP %s: %s", exc.response.status_code, exc.response.text[:200])
        raise HTTPException(status_code=502, detail="GigaChat upstream error") from exc
    except Exception as exc:  # pragma: no cover - network noise
        log.exception("GigaChat unexpected failure: %s", exc)
        raise HTTPException(status_code=502, detail="GigaChat unreachable") from exc
    return LiraChatOut(reply=reply.strip(), disclaimer=non_medical_disclaimer())


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


def run() -> None:  # pragma: no cover
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "api.main:app", host=settings.api_host, port=settings.api_port, reload=False
    )
