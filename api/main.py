"""FastAPI app exposing /v1/activate for the Flow mobile/web app.

The bot writes activation_codes after a paid subscription; the app
posts the user-entered code here. We return validity, tariff, and
expiry so the app can flip the local subscription banner.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from bot.config import get_settings
from bot.db import engine, session_scope
from bot.models import Base
from bot.services.catalog import seed_catalog
from bot.services.codes import redeem_code

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
    title="FlowCare Activation API",
    version="1.0.0",
    description="Validates activation codes issued by the FlowCare Telegram bot.",
    lifespan=lifespan,
)


class ActivateIn(BaseModel):
    code: str = Field(..., min_length=4, max_length=16)
    device_id: str | None = Field(default=None, max_length=128)


class ActivateOut(BaseModel):
    valid: bool
    tariff: str | None = None
    expires: str | None = None
    redeemed_at: str | None = None


@app.post("/v1/activate", response_model=ActivateOut)
async def activate(body: ActivateIn) -> ActivateOut:
    async with session_scope() as session:
        result = await redeem_code(session, body.code, device_id=body.device_id)
    if result is None:
        return ActivateOut(valid=False)
    code, sub = result
    return ActivateOut(
        valid=True,
        tariff=sub.tariff.value,
        expires=sub.expires_at.date().isoformat(),
        redeemed_at=(code.redeemed_at.isoformat() if code.redeemed_at else None),
    )


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


def run() -> None:  # pragma: no cover
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "api.main:app", host=settings.api_host, port=settings.api_port, reload=False
    )
