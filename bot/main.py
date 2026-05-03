"""FlowCare Telegram bot entrypoint."""
from __future__ import annotations

import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties

from bot.config import get_settings
from bot.db import engine, session_scope
from bot.handlers import router as root_router
from bot.models import Base
from bot.scheduler import schedule
from bot.services.catalog import seed_catalog

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("flowcare-bot")


async def init_db() -> None:
    """Create tables (for SQLite dev mode) and seed the catalog. In Docker
    Compose Alembic owns migrations; this is a safe no-op if tables exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with session_scope() as session:
        added = await seed_catalog(session)
        if added:
            log.info("Seeded %d catalog items", added)


async def main() -> None:
    settings = get_settings()
    await init_db()
    bot = Bot(
        token=settings.bot_token,
        default=DefaultBotProperties(parse_mode=None),
    )
    dp = Dispatcher()
    dp.include_router(root_router)
    scheduler = schedule(bot)
    scheduler.start()
    log.info("FlowCare bot starting…")
    try:
        await dp.start_polling(bot, allowed_updates=dp.resolve_used_update_types())
    finally:
        scheduler.shutdown(wait=False)
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
