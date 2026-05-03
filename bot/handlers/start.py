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

log = logging.getLogger(__name__)
router = Router(name="start")


WELCOME = (
    "Привет, я <b>Flow</b> 🌸\n\n"
    "Я помогу собрать персональный <b>бокс заботы</b> — каждый месяц "
    "к датам М тебе будет приезжать коробка со средствами гигиены, "
    "уходом и приятностями. Подобрано лично под тебя: твои "
    "предпочтения, аллергии, образ жизни и фаза цикла.\n\n"
    "Сначала зададу несколько вопросов (можно прерваться и вернуться "
    "позже — твои ответы сохраняются), потом покажу тарифы и оформим "
    "подписку через Telegram-оплату. После оплаты дам код для "
    "приложения Flow."
)


@router.message(CommandStart())
async def on_start(message: Message, state: FSMContext) -> None:
    await state.clear()
    if message.from_user is not None:
        async with session_scope() as session:
            await get_or_create_user(session, message.from_user)

    await message.answer(
        WELCOME,
        parse_mode="HTML",
        reply_markup=InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text="✨ Начать настройку бокса",
                        callback_data="onboarding:start",
                    )
                ],
                [
                    InlineKeyboardButton(
                        text="📦 Мой бокс", callback_data="cabinet:status"
                    )
                ],
            ]
        ),
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
