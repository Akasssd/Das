"""
Static configuration of the FlowCare subscription questionnaire.

The bot walks the user through these steps in order. Each step has either
a fixed list of options (single- or multi-select) or accepts free text.

Editing this file is the only thing needed to change the questionnaire:
the runtime FSM (`bot/main.py`) reads from `STEPS` and renders the
keyboards / validates answers automatically.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal


StepKind = Literal["single", "multi", "text"]


@dataclass(frozen=True)
class Step:
    key: str
    title: str
    prompt: str
    kind: StepKind
    options: tuple[str, ...] = field(default_factory=tuple)
    optional: bool = False


TARIFFS: dict[str, dict[str, object]] = {
    "basic": {
        "label": "Базовый бокс — 999 ₽/мес",
        "price_rub": 999,
        "summary": [
            "Средства гигиены под твой цикл",
            "Шоколадка / снек",
            "1 средство ухода (маска / патчи / крем)",
        ],
    },
    "vip": {
        "label": "VIP бокс — 1999 ₽/мес",
        "price_rub": 1999,
        "summary": [
            "Органическая гигиена",
            "Шоколад ручной работы",
            "3 средства ухода",
            "Чай и сюрприз-подарок",
            "Персональные гайды",
            "Бесплатная доставка к началу цикла",
        ],
    },
}


STEPS: tuple[Step, ...] = (
    Step(
        key="hygiene",
        title="Шаг 1 / 5 · Средства гигиены",
        prompt=(
            "Какие средства гигиены тебе подходят? "
            "Можно выбрать несколько — нажимай по очереди, потом «Готово»."
        ),
        kind="multi",
        options=(
            "Прокладки обычные",
            "Прокладки органические",
            "Тампоны",
            "Менструальная чаша",
            "Менструальные трусы",
            "Ничего из этого",
        ),
    ),
    Step(
        key="flow",
        title="Шаг 2 / 5 · Обильность",
        prompt="Как обычно проходят месячные?",
        kind="single",
        options=(
            "Лёгкие",
            "Средние",
            "Обильные",
            "Очень обильные",
            "По-разному",
        ),
    ),
    Step(
        key="allergies",
        title="Шаг 3 / 5 · Аллергии и чувствительность",
        prompt=(
            "Есть ли у тебя аллергии или чувствительность? Можно выбрать несколько."
        ),
        kind="multi",
        options=(
            "Шоколад / какао",
            "Орехи",
            "Глютен",
            "Лактоза",
            "Эфирные масла",
            "Ароматизаторы / отдушки",
            "Латекс",
            "Чувствительная кожа",
            "Ничего нет",
        ),
    ),
    Step(
        key="diet",
        title="Шаг 4 / 5 · Питание и сладости",
        prompt="Какой стиль питания ближе?",
        kind="single",
        options=(
            "Обычное",
            "ПП / без сахара",
            "Вегетарианство",
            "Веганство",
            "Кето / низкоуглеводное",
        ),
    ),
    Step(
        key="care",
        title="Шаг 5 / 5 · Уход",
        prompt="Какой уход добавить в бокс? Можно выбрать несколько.",
        kind="multi",
        options=(
            "Маски для лица",
            "Патчи под глаза",
            "Бальзам / крем для тела",
            "Травяной чай",
            "Свечи / арома",
            "Скраб",
            "Сюрприз на усмотрение",
        ),
    ),
    Step(
        key="notes",
        title="Дополнительно",
        prompt=(
            "Хочешь добавить заметки — любимые бренды, ароматы или что-то "
            "важное? Напиши одним сообщением или отправь «—», чтобы пропустить."
        ),
        kind="text",
        optional=True,
    ),
    Step(
        key="address",
        title="Адрес доставки",
        prompt=(
            "Напиши адрес доставки одним сообщением: индекс, страна, город, "
            "улица, дом, квартира. И телефон для курьера."
        ),
        kind="text",
    ),
    Step(
        key="name",
        title="Имя получателя",
        prompt="На какое имя оформить доставку?",
        kind="text",
    ),
)
