"""Bot → app sync service.

Looks up a Profile by the `device_id` that was bound via the deep-link
`/start app_<device_id>` handler, and returns the current subscription
+ cycle dates for the Lira app to consume via REST.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from bot.models import Profile, User
from bot.services.subscriptions import get_active_subscription


async def find_user_by_device(
    session: AsyncSession, device_id: str
) -> User | None:
    """Find the User that bound `device_id` to their bot account."""
    stmt = select(Profile).where(
        Profile.extra["synced_app_device_id"].as_string() == device_id
    )
    profile = (await session.execute(stmt)).scalar_one_or_none()
    if profile is None:
        return None
    return await session.get(User, profile.user_id)


async def build_sync_payload(
    session: AsyncSession, device_id: str
) -> dict[str, Any]:
    """Build the JSON payload returned by /v1/sync/pull."""
    user = await find_user_by_device(session, device_id)
    if user is None:
        return {"linked": False}

    profile = (
        await session.execute(select(Profile).where(Profile.user_id == user.id))
    ).scalar_one_or_none()
    sub = await get_active_subscription(session, user)

    payload: dict[str, Any] = {
        "linked": True,
        "telegram_user_id": user.telegram_id,
        "telegram_username": user.username,
        "subscription": None,
        "cycle": None,
    }

    if sub is not None:
        expires = sub.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        started = sub.started_at
        if started.tzinfo is None:
            started = started.replace(tzinfo=timezone.utc)
        payload["subscription"] = {
            "tariff": sub.tariff.value,
            "started_at": started.isoformat(),
            "renews_at": expires.isoformat(),
            "status": sub.status,
        }

    if profile is not None and profile.last_period_start is not None:
        payload["cycle"] = {
            "last_period_start": profile.last_period_start.isoformat(),
            "cycle_length_days": profile.cycle_length_days,
            "period_length_days": profile.period_length_days,
        }

    extra = profile.extra if profile is not None else None
    if extra and isinstance(extra, dict) and "synced_at" in extra:
        payload["synced_at"] = extra["synced_at"]
    else:
        payload["synced_at"] = datetime.utcnow().isoformat() + "Z"

    return payload
