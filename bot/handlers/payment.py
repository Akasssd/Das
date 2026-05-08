"""Tariff selection + Telegram Payments (no activation codes — bot→app sync)."""
from __future__ import annotations

import logging

from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
    PreCheckoutQuery,
)

from bot.config import get_settings
from bot.db import session_scope
from bot.models import Tariff
from bot.services.payments import TARIFF_META, finalize_payment, send_invoice
from bot.services.users import get_or_create_user
from bot.states import Onboarding

log = logging.getLogger(__name__)
router = Router(name="payment")


# ---- Entry points from welcome menu ------------------------------------ #


@router.callback_query(F.data.startswith("tariff_pick:"))
async def on_tariff_pick(cb: CallbackQuery, state: FSMContext) -> None:
    """User clicked one of the 4 menu buttons."""
    if cb.message is None or cb.from_user is None:
        await cb.answer()
        return
    raw = (cb.data or "").split(":", 1)[1]
    try:
        tariff = Tariff(raw)
    except ValueError:
        await cb.answer("Неизвестный тариф", show_alert=True)
        return

    await state.clear()
    async with session_scope() as session:
        await get_or_create_user(session, cb.from_user)

    try:
        await cb.message.edit_reply_markup(reply_markup=None)
    except Exception:
        pass

    if tariff == Tariff.PREMIUM:
        await start_premium_flow(cb.message, state)
    else:
        await _start_box_flow(cb.message, state, tariff)
    await cb.answer()


async def start_premium_flow(message: Message, state: FSMContext) -> None:
    """Premium 199 ₽: skip onboarding, go straight to invoice."""
    tariff = Tariff.PREMIUM
    await state.set_state(Onboarding.waiting_payment)
    await state.update_data(_tariff=tariff.value)
    await message.answer(
        "✨ <b>Премиум — 199 ₽/мес</b>\n\n"
        "Без опросника. Сейчас отправлю счёт — после оплаты подписка "
        "автоматически появится в приложении (нужно нажать «Синхронизация "
        "с Telegram» в приложении).",
        parse_mode="HTML",
    )
    sent = await send_invoice(message.bot, message.chat.id, tariff)
    if not sent:
        await _offer_test_pay(message, tariff)


async def _start_box_flow(message: Message, state: FSMContext, tariff: Tariff) -> None:
    """Tvoy Ritm / Polnaya Simfonia: consent → questionnaire → invoice."""
    await state.update_data(_tariff=tariff.value)
    await message.answer(
        f"<b>{TARIFF_META[tariff]['title']}</b>\n\n"
        f"{TARIFF_META[tariff]['description']}\n\n"
        "Сейчас задам несколько вопросов, чтобы собрать бокс под тебя. "
        "Можно прерваться — ответы сохраняются.",
        parse_mode="HTML",
    )
    # Defer to onboarding's consent step
    from bot.handlers.onboarding import _show_consent

    await _show_consent(message, state)


# ---- Pre-selected-tariff invoicing (called after questionnaire) ------- #


async def show_tariffs(message: Message, state: FSMContext | None = None) -> None:
    """End-of-questionnaire: just send the invoice for the preselected tariff.

    Falls back to a 3-button picker if the user somehow reached step 7
    without preselecting (e.g. via /setup).
    """
    tariff: Tariff | None = None
    if state is not None:
        data = await state.get_data()
        raw = data.get("_tariff")
        if raw:
            try:
                tariff = Tariff(raw)
            except ValueError:
                tariff = None

    if tariff is None:
        # Legacy path: show picker (Twoy Ritm / Polnaya Simfonia)
        await message.answer(
            "<b>Шаг 7/7. Выбери тариф</b>\n\n"
            f"🌸 <b>{TARIFF_META[Tariff.BASIC]['title']}</b>\n"
            f"{TARIFF_META[Tariff.BASIC]['description']}\n\n"
            f"💎 <b>{TARIFF_META[Tariff.VIP]['title']}</b>\n"
            f"{TARIFF_META[Tariff.VIP]['description']}",
            parse_mode="HTML",
            reply_markup=InlineKeyboardMarkup(
                inline_keyboard=[
                    [
                        InlineKeyboardButton(
                            text=f"🌸 Твой ритм — {TARIFF_META[Tariff.BASIC]['price']} ₽",
                            callback_data="tariff:basic",
                        )
                    ],
                    [
                        InlineKeyboardButton(
                            text=f"💎 Полная симфония — {TARIFF_META[Tariff.VIP]['price']} ₽",
                            callback_data="tariff:vip",
                        )
                    ],
                ]
            ),
        )
        return

    if state is not None:
        await state.set_state(Onboarding.waiting_payment)
    await message.answer(
        f"Спасибо! Сейчас отправлю счёт на <b>{TARIFF_META[tariff]['title']}</b>. "
        "После оплаты подписка появится в приложении автоматически — нажми "
        "«Синхронизация с Telegram» в приложении.",
        parse_mode="HTML",
    )
    sent = await send_invoice(message.bot, message.chat.id, tariff)
    if not sent:
        await _offer_test_pay(message, tariff)


async def _offer_test_pay(message: Message, tariff: Tariff) -> None:
    """Demo / no-provider mode: confirm subscription right in the chat.

    Used while the Tinkoff merchant token is not yet wired in. The button
    just creates the subscription in the DB so the bot→app sync flow can
    be exercised end-to-end without a real charge.
    """
    await message.answer(
        "💳 Оплата сейчас оформляется в демо-режиме (приём платежей "
        "подключим, как только будет ключ Tinkoff). Нажми кнопку — подписка "
        "активируется сразу, а в приложении нажми <b>«Синхронизация с "
        "Telegram»</b>, чтобы её увидеть.",
        parse_mode="HTML",
        reply_markup=InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text=f"✅ Оформить — {TARIFF_META[tariff]['price']} ₽",
                        callback_data=f"manualpay:{tariff.value}",
                    )
                ]
            ]
        ),
    )


# ---- Legacy step-7 picker (for /setup fallback) ----------------------- #


@router.callback_query(Onboarding.tariff, F.data.startswith("tariff:"))
async def pick_tariff(cb: CallbackQuery, state: FSMContext) -> None:
    raw = (cb.data or "").split(":", 1)[1]
    try:
        tariff = Tariff(raw)
    except ValueError:
        await cb.answer("Неизвестный тариф", show_alert=True)
        return
    await state.update_data(_tariff=tariff.value)
    await state.set_state(Onboarding.waiting_payment)
    if cb.message is not None:
        try:
            await cb.message.edit_reply_markup(reply_markup=None)
        except Exception:
            pass
        sent = await send_invoice(cb.message.bot, cb.message.chat.id, tariff)
        if not sent:
            await _offer_test_pay(cb.message, tariff)
    await cb.answer()


@router.callback_query(F.data.startswith("manualpay:"))
async def manual_pay(cb: CallbackQuery, state: FSMContext) -> None:
    raw = (cb.data or "").split(":", 1)[1]
    try:
        tariff = Tariff(raw)
    except ValueError:
        await cb.answer()
        return
    if cb.message is not None:
        try:
            await cb.message.edit_reply_markup(reply_markup=None)
        except Exception:
            pass
    await _complete_payment(
        cb,
        state,
        tariff=tariff,
        payment_id="manual-test",
        amount_rub=TARIFF_META[tariff]["price"],
    )


# ---- Telegram Payments callbacks --------------------------------------- #


@router.pre_checkout_query()
async def on_pre_checkout(pre_checkout: PreCheckoutQuery) -> None:
    await pre_checkout.answer(ok=True)


@router.message(F.successful_payment)
async def on_successful_payment(message: Message, state: FSMContext) -> None:
    sp = message.successful_payment
    if sp is None:
        return
    payload = sp.invoice_payload or ""
    if not payload.startswith("flowcare:"):
        return
    raw = payload.split(":", 1)[1]
    try:
        tariff = Tariff(raw)
    except ValueError:
        return
    await _complete_payment(
        message,
        state,
        tariff=tariff,
        payment_id=sp.provider_payment_charge_id or sp.telegram_payment_charge_id,
        amount_rub=sp.total_amount // 100,
    )


async def _complete_payment(
    event,
    state: FSMContext,
    *,
    tariff: Tariff,
    payment_id: str,
    amount_rub: int,
) -> None:
    settings = get_settings()
    user_tg = event.from_user
    async with session_scope() as session:
        user = await get_or_create_user(session, user_tg)
        await finalize_payment(
            session,
            user=user,
            tariff=tariff,
            payment_id=payment_id,
            amount_rub=amount_rub,
        )

    if tariff == Tariff.PREMIUM:
        tail = (
            "Открой приложение <b>Lira</b> → вкладка «Подписка» → нажми "
            "<b>«Синхронизация с Telegram»</b>. Подписка подтянется автоматически — "
            "сразу разблокируются расширенная аналитика, история циклов и гайды.\n\n"
            "Команда /mybox — посмотреть статус подписки в боте."
        )
    else:
        tail = (
            "Открой приложение <b>Lira</b> → вкладка «Подписка» → нажми "
            "<b>«Синхронизация с Telegram»</b>. Подписка и даты цикла "
            "подтянутся автоматически.\n\n"
            "Я начну собирать твой первый бокс к ближайшим месячным. "
            "Команда /mybox — посмотреть статус."
        )
    text = (
        "✨ Готово! Подписка оформлена.\n\n"
        f"<b>Тариф:</b> {TARIFF_META[tariff]['title']}\n"
        f"<b>Срок:</b> 30 дней\n\n" + tail
    )
    await _send(event, text)

    bot = event.bot if hasattr(event, "bot") else event.message.bot
    if settings.admin_chat_id:
        try:
            await bot.send_message(
                settings.admin_chat_id,
                f"💰 Новая оплата от <a href='tg://user?id={user_tg.id}'>"
                f"{user_tg.first_name or user_tg.username or user_tg.id}</a>\n"
                f"Тариф: {TARIFF_META[tariff]['short']} • {amount_rub} ₽",
                parse_mode="HTML",
            )
        except Exception:  # noqa: BLE001
            log.exception("Failed to notify admin chat")

    await state.clear()


async def _send(event, text: str) -> None:
    if isinstance(event, CallbackQuery):
        if event.message is not None:
            await event.message.answer(text, parse_mode="HTML")
        await event.answer()
    else:
        await event.answer(text, parse_mode="HTML")
