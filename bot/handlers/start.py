from __future__ import annotations

import logging

from aiogram import F, Router
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
    CallbackQuery,
)

from bot.db import session_scope
from bot.services.users import get_or_create_user
from bot.states import Onboarding

log = logging.getLogger(__name__)
router = Router(name="start")


WELCOME = (
    "Привет, я <b>Flow</b> 🌸\n\n"
    "Выбери, что подходит тебе сегодня:\n\n"
    "✨ <b>Премиум — 199 ₽/мес</b>\n"
    "Цифровой тариф: расширенная аналитика, прогноз овуляции, "
    "экспорт PDF/CSV, гайды. Без бокса и <b>без опросника</b>.\n\n"
    "🌸 <b>Твой ритм — 999 ₽/мес</b>\n"
    "Бокс заботы каждый месяц: до 5 предметов под твой профиль.\n\n"
    "💎 <b>Полная симфония — 1999 ₽/мес</b>\n"
    "Расширенный бокс: до 8 предметов + сюрприз, чай, гайды.\n\n"
    "📦 <b>Мой бокс</b> — посмотреть статус действующей подписки.\n\n"
    "🔐 <b>Твои персональные данные используются только для формирования "
    "и доставки бокса</b>, напоминаний о цикле и подтверждения подписки. "
    "Перед опросником я попрошу подтвердить согласие по 152-ФЗ — это "
    "занимает один тап."
)


def _welcome_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="✨ Премиум · 199 ₽/мес (без опроса)",
                    callback_data="tariff_pick:premium",
                )
            ],
            [
                InlineKeyboardButton(
                    text="🌸 Твой ритм · 999 ₽/мес",
                    callback_data="tariff_pick:basic",
                )
            ],
            [
                InlineKeyboardButton(
                    text="💎 Полная симфония · 1999 ₽/мес",
                    callback_data="tariff_pick:vip",
                )
            ],
            [
                InlineKeyboardButton(
                    text="📦 Мой бокс", callback_data="cabinet:status"
                )
            ],
        ]
    )


@router.message(CommandStart(deep_link=True), F.text.regexp(r"^/start\s+premium\b"))
async def on_start_premium(message: Message, state: FSMContext) -> None:
    """Deep link from the app: tariff is preselected as Premium → straight to invoice."""
    await state.clear()
    if message.from_user is not None:
        async with session_scope() as session:
            await get_or_create_user(session, message.from_user)
    from bot.handlers.payment import start_premium_flow

    await start_premium_flow(message, state)


@router.message(CommandStart())
async def on_start(message: Message, state: FSMContext) -> None:
    await state.clear()
    if message.from_user is not None:
        async with session_scope() as session:
            await get_or_create_user(session, message.from_user)

    await message.answer(
        WELCOME,
        parse_mode="HTML",
        reply_markup=_welcome_keyboard(),
    )


@router.message(Command("help"))
async def on_help(message: Message) -> None:
    await message.answer(
        "Команды:\n"
        "/start — приветствие\n"
        "/setup — пройти / продолжить настройку бокса\n"
        "/mybox — личный кабинет (статус подписки, дата ближайшего бокса)\n"
        "/cancel — отменить текущий ввод"
    )


@router.message(Command("cancel"))
async def on_cancel(message: Message, state: FSMContext) -> None:
    await state.clear()
    await message.answer("Окей, отменила. Чтобы начать заново — /start.")
