"""Sync handlers — bind a Lira-app device to this Telegram user.

Old direction (app → bot via /sync code) was removed.
New direction is one-way bot → app:

  • App generates a UUIDv4 `device_id` on first sync attempt.
  • App opens a deep link `t.me/<bot>?start=app_<device_id>`.
  • This handler stores `device_id` in `Profile.extra` so that the
    public REST API (`GET /v1/sync/pull?device_id=...`) can return
    that user's subscription + cycle dates back to the app.
"""
from __future__ import annotations

import logging
import re
from datetime import datetime

from aiogram import F, Router
from aiogram.filters import CommandObject, CommandStart
from aiogram.types import Message

from bot.db import session_scope
from bot.services.users import get_or_create_profile, get_or_create_user

log = logging.getLogger(__name__)
router = Router(name="sync")


_DEVICE_ID_RE = re.compile(r"^[A-Za-z0-9_\-]{6,64}$")


async def _bind_device(message: Message, device_id: str) -> None:
    if not _DEVICE_ID_RE.match(device_id):
        await message.answer(
            "Не получилось привязать приложение: некорректный код "
            "устройства. Попробуй ещё раз через приложение Lira → "
            "«Подписка» → «Синхронизация с Telegram».",
        )
        return
    if message.from_user is None:
        return
    async with session_scope() as session:
        user = await get_or_create_user(session, message.from_user)
        profile = await get_or_create_profile(session, user)
        extra = dict(profile.extra or {})
        extra["synced_app_device_id"] = device_id
        extra["synced_at"] = datetime.utcnow().isoformat() + "Z"
        profile.extra = extra
    await message.answer(
        "🔗 Готово! Приложение Lira привязано к этому чату.\n\n"
        "Возвращайся в приложение — подписка и даты цикла подтянутся "
        "автоматически в течение пары секунд.",
    )


@router.message(
    CommandStart(deep_link=True),
    F.text.regexp(r"^/start\s+app_"),
)
async def on_start_with_app(message: Message, command: CommandObject) -> None:
    raw = (command.args or "").strip()
    if raw.startswith("app_"):
        raw = raw[len("app_"):]
    await _bind_device(message, raw)
