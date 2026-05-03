"""Subscription lifecycle helpers."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from bot.config import get_settings
from bot.models import Subscription, Tariff, User


async def create_subscription(
    session: AsyncSession,
    *,
    user: User,
    tariff: Tariff,
    payment_id: str | None = None,
    days: int | None = None,
) -> Subscription:
    settings = get_settings()
    duration = days or settings.subscription_days
    now = datetime.now(timezone.utc)
    sub = Subscription(
        user_id=user.id,
        tariff=tariff,
        started_at=now,
        expires_at=now + timedelta(days=duration),
        payment_id=payment_id,
        status="active",
    )
    session.add(sub)
    await session.flush()
    return sub


async def get_active_subscription(
    session: AsyncSession, user: User
) -> Subscription | None:
    stmt = (
        select(Subscription)
        .where(Subscription.user_id == user.id, Subscription.status == "active")
        .order_by(desc(Subscription.expires_at))
    )
    sub = (await session.execute(stmt)).scalars().first()
    if sub is None:
        return None
    expires = sub.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        sub.status = "expired"
        return None
    return sub
