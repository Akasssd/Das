"""Routers exposed to bot.main."""
from aiogram import Router

from bot.handlers import start, onboarding, payment, cabinet, sync

router = Router(name="root")
router.include_routers(
    sync.router,
    start.router,
    onboarding.router,
    payment.router,
    cabinet.router,
)

__all__ = ["router"]
