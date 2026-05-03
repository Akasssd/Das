"""Daily background task that finds users due for a box ship and notifies
the assembly chat."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from aiogram import Bot
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from bot.config import get_settings
from bot.db import session_scope
from bot.models import (
    DeliveryHistory,
    Profile,
    Subscription,
    Tariff,
    User,
)
from bot.services.recommender import build_box
from bot.services.subscriptions import get_active_subscription

log = logging.getLogger(__name__)


async def daily_box_assembly(bot: Bot) -> int:
    """Inspect every active subscription and emit assembly requests for
    those whose next box should ship today (heuristic).

    Returns the number of assembly requests sent.
    """
    settings = get_settings()
    chat = settings.assembly_chat_id or settings.admin_chat_id
    if not chat:
        log.info("No ASSEMBLY_CHAT_ID/ADMIN_CHAT_ID — skipping scheduler run")
        return 0

    sent = 0
    today = datetime.now(timezone.utc).date()
    async with session_scope() as session:
        subs = (
            await session.execute(
                select(Subscription).where(Subscription.status == "active")
            )
        ).scalars().all()
        for sub in subs:
            user = await session.get(User, sub.user_id)
            if user is None:
                continue
            profile = (
                await session.execute(
                    select(Profile).where(Profile.user_id == user.id)
                )
            ).scalar_one_or_none()
            if profile is None or not profile.cycle_length_days:
                continue
            # crude T-5 days check from start_date + cycle_length
            cycle = profile.cycle_length_days
            anchor = sub.started_at
            next_period = anchor + timedelta(days=cycle)
            ship_at = next_period - timedelta(days=settings.box_lead_days)
            # Re-compute monthly cadence
            while ship_at.date() < today:
                anchor = anchor + timedelta(days=cycle)
                next_period = anchor + timedelta(days=cycle)
                ship_at = next_period - timedelta(days=settings.box_lead_days)
            if ship_at.date() != today:
                continue

            items = await build_box(
                session, user=user, profile=profile, tariff=sub.tariff, today=today
            )
            history = DeliveryHistory(
                user_id=user.id,
                subscription_id=sub.id,
                shipped_at=None,
                items=[
                    {"sku": it.sku, "name": it.name, "category": it.category.value}
                    for it in items
                ],
                status="planned",
            )
            session.add(history)

            label = (
                f"@{user.username}"
                if user.username
                else (user.first_name or str(user.telegram_id))
            )
            box_lines = [
                f"📦 <b>Сборка для {label}</b>",
                f"Тариф: {sub.tariff.value.upper()}  •  Состав:",
                "",
            ]
            for it in items:
                box_lines.append(f" • [{it.category.value}] {it.name} ({it.brand or '—'})")
            try:
                await bot.send_message(
                    chat, "\n".join(box_lines), parse_mode="HTML"
                )
                sent += 1
            except Exception:  # noqa: BLE001
                log.exception("Failed to send assembly request to chat=%s", chat)
    return sent


def schedule(bot: Bot) -> AsyncIOScheduler:
    """Spin up an APScheduler that runs the assembly task once a day at 09:00 UTC."""
    scheduler = AsyncIOScheduler(timezone="UTC")
    scheduler.add_job(daily_box_assembly, "cron", hour=9, minute=0, args=[bot])
    return scheduler
