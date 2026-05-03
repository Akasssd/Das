"""Routers exposed to bot.main."""
from aiogram import Router

from bot.handlers import start, onboarding, payment, cabinet

router = Router(name="root")
router.include_routers(start.router, onboarding.router, payment.router, cabinet.router)

__all__ = ["router"]
