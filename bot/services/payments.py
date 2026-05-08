"""Telegram Payments helpers + payment completion."""
from __future__ import annotations

import logging

from aiogram import Bot
from aiogram.types import LabeledPrice
from sqlalchemy.ext.asyncio import AsyncSession

from bot.config import get_settings
from bot.models import Order, OrderStatus, Tariff, User
from bot.services.subscriptions import create_subscription

log = logging.getLogger(__name__)

TARIFF_META: dict[Tariff, dict] = {
    Tariff.PREMIUM: {
        "title": "Премиум — 199 ₽/мес",
        "short": "Премиум",
        "description": "Цифровой тариф: расширенная аналитика, прогноз "
        "овуляции, экспорт PDF/CSV, гайды. Без бокса и без опросника.",
        "price": 199,
        "needs_onboarding": False,
    },
    Tariff.BASIC: {
        "title": "Твой ритм — 999 ₽/мес",
        "short": "Твой ритм",
        "description": "Бокс заботы каждый месяц: до 5 предметов — гигиена, "
        "шоколад, средство ухода. Подбор под твой профиль.",
        "price": 999,
        "needs_onboarding": True,
    },
    Tariff.VIP: {
        "title": "Полная симфония — 1999 ₽/мес",
        "short": "Полная симфония",
        "description": "Расширенный бокс: до 8 предметов + сюрприз — органика, "
        "шоколад ручной работы, 3 средства ухода, чай, гайды.",
        "price": 1999,
        "needs_onboarding": True,
    },
}


async def send_invoice(bot: Bot, chat_id: int, tariff: Tariff) -> bool:
    """Send a Telegram Payments invoice. Returns False if PROVIDER_TOKEN is
    not configured (caller should fall back to manual flow)."""
    settings = get_settings()
    meta = TARIFF_META[tariff]
    if not settings.payment_provider_token:
        return False
    await bot.send_invoice(
        chat_id=chat_id,
        title=meta["title"],
        description=meta["description"],
        payload=f"flowcare:{tariff.value}",
        provider_token=settings.payment_provider_token,
        currency="RUB",
        prices=[LabeledPrice(label=meta["title"], amount=meta["price"] * 100)],
        start_parameter="subscription",
        need_email=False,
        need_shipping_address=False,
        is_flexible=False,
    )
    return True


async def finalize_payment(
    session: AsyncSession,
    *,
    user: User,
    tariff: Tariff,
    payment_id: str,
    amount_rub: int,
) -> Order:
    """Persist Order + create Subscription. The app reads the resulting
    subscription state via the bot→app sync flow (no activation codes)."""
    sub = await create_subscription(
        session, user=user, tariff=tariff, payment_id=payment_id
    )
    order = Order(
        user_id=user.id,
        subscription_id=sub.id,
        status=OrderStatus.PAID,
        amount_rub=amount_rub,
        payment_provider="telegram",
        provider_payment_id=payment_id,
        paid_at=sub.started_at,
        snapshot={"tariff": tariff.value},
    )
    session.add(order)
    await session.flush()
    return order
