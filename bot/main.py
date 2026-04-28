"""
FlowCare Telegram bot — subscription onboarding.

Run:
    cp .env.example .env
    # edit .env: BOT_TOKEN, ADMIN_CHAT_ID
    pip install -r requirements.txt
    python -m bot.main

The bot owns:
  • Tariff selection (Basic / VIP)
  • 5-step preference questionnaire (see bot/questions.py)
  • Address & recipient name
  • Order forwarding to the admin chat
  • Local persistence of orders (JSONL) for QA / future API sync

Payment is intentionally out of scope here — once Telegram Payments / YooKassa
credentials are wired in, replace the `simulate_payment` placeholder.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from aiogram import Bot, Dispatcher, F, Router
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
    ReplyKeyboardMarkup,
    ReplyKeyboardRemove,
    KeyboardButton,
    CallbackQuery,
)
from dotenv import load_dotenv

from bot.questions import STEPS, TARIFFS, Step

logger = logging.getLogger("flowcare-bot")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
ADMIN_CHAT_ID = os.getenv("ADMIN_CHAT_ID", "")
ORDERS_FILE = Path(os.getenv("ORDERS_FILE", "orders.jsonl"))

if not BOT_TOKEN:
    raise SystemExit(
        "BOT_TOKEN is missing. Copy .env.example to .env and fill it in."
    )

# ---------------------------------------------------------------------------
# FSM state
# ---------------------------------------------------------------------------


class Order(StatesGroup):
    choosing_tariff = State()
    answering = State()  # one state for all questionnaire steps; index in data
    confirming = State()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

DONE_LABEL = "✅ Готово"
SKIP_LABEL = "Пропустить"
RESTART_LABEL = "↺ Начать заново"


def tariff_keyboard() -> InlineKeyboardMarkup:
    rows = [
        [InlineKeyboardButton(text=str(meta["label"]), callback_data=f"tariff:{key}")]
        for key, meta in TARIFFS.items()
    ]
    return InlineKeyboardMarkup(inline_keyboard=rows)


def step_keyboard(step: Step, picked: list[str] | None = None) -> ReplyKeyboardMarkup | ReplyKeyboardRemove:
    if step.kind == "text":
        return ReplyKeyboardRemove()
    rows: list[list[KeyboardButton]] = []
    picked_set = set(picked or [])
    for option in step.options:
        marker = "• " if option in picked_set else ""
        rows.append([KeyboardButton(text=f"{marker}{option}")])
    if step.kind == "multi":
        rows.append([KeyboardButton(text=DONE_LABEL)])
    if step.optional:
        rows.append([KeyboardButton(text=SKIP_LABEL)])
    return ReplyKeyboardMarkup(keyboard=rows, resize_keyboard=True, one_time_keyboard=False)


def strip_marker(text: str) -> str:
    return text.removeprefix("• ").strip()


def render_summary(answers: dict[str, Any], tariff_key: str, user: Any) -> str:
    tariff = TARIFFS[tariff_key]
    lines: list[str] = []
    lines.append(f"<b>Тариф:</b> {tariff['label']}")
    for step in STEPS:
        value = answers.get(step.key)
        if value is None:
            continue
        if isinstance(value, list):
            value = ", ".join(value) if value else "—"
        lines.append(f"<b>{step.title}:</b> {value}")
    if user is not None:
        username = f"@{user.username}" if getattr(user, "username", None) else "—"
        lines.append("")
        lines.append(f"<b>Telegram:</b> {username} (id {user.id})")
    return "\n".join(lines)


def persist_order(payload: dict[str, Any]) -> None:
    try:
        ORDERS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with ORDERS_FILE.open("a", encoding="utf-8") as f:
            f.write(json.dumps(payload, ensure_ascii=False) + "\n")
    except OSError as exc:
        logger.warning("Failed to persist order: %s", exc)


async def forward_order_to_admin(bot: Bot, summary: str) -> None:
    if not ADMIN_CHAT_ID:
        logger.warning("ADMIN_CHAT_ID not set — order not forwarded.")
        return
    try:
        await bot.send_message(
            chat_id=int(ADMIN_CHAT_ID),
            text=f"<b>🆕 Новый заказ FlowCare</b>\n\n{summary}",
        )
    except Exception as exc:  # pragma: no cover — network errors
        logger.exception("Failed to send admin notification: %s", exc)


# ---------------------------------------------------------------------------
# Handlers
# ---------------------------------------------------------------------------

router = Router(name="flowcare-onboarding")


@router.message(CommandStart())
async def on_start(message: Message, state: FSMContext) -> None:
    await state.clear()
    await state.set_state(Order.choosing_tariff)
    welcome = (
        "<b>Привет!</b> Я помогу оформить ежемесячный бокс заботы 🎁\n\n"
        "Выбирай тариф — дальше я задам пару вопросов про твои предпочтения, "
        "соберу адрес и пришлю ссылку на оплату."
    )
    await message.answer(welcome, reply_markup=tariff_keyboard())


@router.message(Command("cancel"))
async def on_cancel(message: Message, state: FSMContext) -> None:
    await state.clear()
    await message.answer(
        "Отменила. Когда захочешь оформить — напиши /start.",
        reply_markup=ReplyKeyboardRemove(),
    )


@router.callback_query(F.data.startswith("tariff:"))
async def on_pick_tariff(call: CallbackQuery, state: FSMContext) -> None:
    if call.data is None:
        return
    tariff_key = call.data.split(":", 1)[1]
    if tariff_key not in TARIFFS:
        await call.answer("Неизвестный тариф")
        return
    await state.update_data(tariff=tariff_key, step_index=0, answers={})
    await state.set_state(Order.answering)
    if call.message:
        bullet_lines = "\n".join(f"• {item}" for item in TARIFFS[tariff_key]["summary"])
        await call.message.answer(
            f"<b>Ок, оформляю {TARIFFS[tariff_key]['label']}</b>\n\n{bullet_lines}",
        )
    await call.answer()
    await ask_current_step(call.message, state)


async def ask_current_step(message: Message | None, state: FSMContext) -> None:
    if message is None:
        return
    data = await state.get_data()
    idx = int(data.get("step_index", 0))
    if idx >= len(STEPS):
        await ask_for_confirmation(message, state)
        return
    step = STEPS[idx]
    answers = data.get("answers", {})
    picked = answers.get(step.key) if step.kind == "multi" else None
    text = f"<b>{step.title}</b>\n\n{step.prompt}"
    await message.answer(text, reply_markup=step_keyboard(step, picked))


async def ask_for_confirmation(message: Message, state: FSMContext) -> None:
    data = await state.get_data()
    summary = render_summary(
        answers=data.get("answers", {}),
        tariff_key=str(data.get("tariff", "basic")),
        user=message.from_user,
    )
    confirm_kb = ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="Подтвердить и оплатить")],
            [KeyboardButton(text=RESTART_LABEL)],
        ],
        resize_keyboard=True,
    )
    await state.set_state(Order.confirming)
    await message.answer(
        f"<b>Проверь, всё верно?</b>\n\n{summary}",
        reply_markup=confirm_kb,
    )


@router.message(Order.answering)
async def on_step_answer(message: Message, state: FSMContext) -> None:
    if message.text is None:
        return
    text = message.text.strip()
    data = await state.get_data()
    idx = int(data.get("step_index", 0))
    answers: dict[str, Any] = dict(data.get("answers", {}))
    step = STEPS[idx]

    if step.optional and text == SKIP_LABEL:
        answers[step.key] = None
        await advance(message, state, answers, idx)
        return

    if step.kind == "text":
        if step.optional and text in {"-", "—", ""}:
            answers[step.key] = None
        else:
            answers[step.key] = text
        await advance(message, state, answers, idx)
        return

    if step.kind == "single":
        cleaned = strip_marker(text)
        if cleaned not in step.options:
            await message.answer("Выбери один из вариантов кнопками ниже 👇")
            return
        answers[step.key] = cleaned
        await advance(message, state, answers, idx)
        return

    # multi
    if text == DONE_LABEL:
        picked = answers.get(step.key) or []
        if not picked:
            await message.answer("Выбери хотя бы один вариант или нажми «Ничего из этого».")
            return
        await advance(message, state, answers, idx)
        return

    cleaned = strip_marker(text)
    if cleaned not in step.options:
        await message.answer("Используй кнопки ниже, чтобы выбрать варианты 👇")
        return
    picked = list(answers.get(step.key) or [])
    if cleaned in picked:
        picked.remove(cleaned)
    else:
        picked.append(cleaned)
    answers[step.key] = picked
    await state.update_data(answers=answers)
    await message.answer(
        f"Выбрано: {', '.join(picked) if picked else '—'}.\n"
        "Можешь добавить ещё варианты или нажать «✅ Готово».",
        reply_markup=step_keyboard(step, picked),
    )


async def advance(message: Message, state: FSMContext, answers: dict[str, Any], idx: int) -> None:
    next_idx = idx + 1
    await state.update_data(answers=answers, step_index=next_idx)
    if next_idx >= len(STEPS):
        await ask_for_confirmation(message, state)
    else:
        await ask_current_step(message, state)


@router.message(Order.confirming)
async def on_confirm(message: Message, state: FSMContext) -> None:
    if message.text is None:
        return
    text = message.text.strip()
    if text == RESTART_LABEL:
        await state.clear()
        await on_start(message, state)
        return
    if text != "Подтвердить и оплатить":
        await message.answer("Жми «Подтвердить и оплатить» или «↺ Начать заново».")
        return

    data = await state.get_data()
    summary = render_summary(
        answers=data.get("answers", {}),
        tariff_key=str(data.get("tariff", "basic")),
        user=message.from_user,
    )
    payload = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "user_id": getattr(message.from_user, "id", None),
        "username": getattr(message.from_user, "username", None),
        "tariff": data.get("tariff"),
        "answers": data.get("answers"),
    }
    persist_order(payload)
    if message.bot is not None:
        await forward_order_to_admin(message.bot, summary)

    # Payment placeholder. Replace with Telegram Payments / YooKassa.
    await simulate_payment(message, data)

    await state.clear()


async def simulate_payment(message: Message, data: dict[str, Any]) -> None:
    tariff_key = str(data.get("tariff", "basic"))
    price = TARIFFS[tariff_key]["price_rub"]
    await message.answer(
        f"<b>Спасибо!</b> Заказ принят.\n\n"
        f"К оплате: {price} ₽. В реальной версии бот пришлёт сюда ссылку "
        f"на оплату (Telegram Payments / YooKassa). После оплаты доступ "
        f"в приложении активируется автоматически.\n\n"
        f"Поддержка — /start заново или напиши в этот чат.",
        reply_markup=ReplyKeyboardRemove(),
    )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


async def main() -> None:
    logging.basicConfig(level=logging.INFO)
    bot = Bot(
        token=BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dp = Dispatcher(storage=MemoryStorage())
    dp.include_router(router)
    logger.info("FlowCare bot starting…")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
