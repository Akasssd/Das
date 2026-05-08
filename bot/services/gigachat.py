"""Thin async client for GigaChat (Sber) used by the Lira AI assistant.

Uses an OAuth-style POST to the NGW endpoint to mint an access token,
then talks to the GigaChat chat-completions endpoint. Tokens are cached
in-memory for ~25 minutes (Sber issues 30-min tokens).
"""
from __future__ import annotations

import asyncio
import base64
import logging
import os
import ssl
import time
import uuid
from dataclasses import dataclass
from typing import Iterable

import httpx

log = logging.getLogger("lira-gigachat")

OAUTH_URL = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth"
CHAT_URL = "https://gigachat.devices.sberbank.ru/api/v1/chat/completions"

DEFAULT_SYSTEM_PROMPT = (
    "Ты — Лира, тёплая подружка-собеседница в приложении-трекере цикла. "
    "Тон: лёгкий, заботливый, на «ты», как близкая подруга. Можно мягкие "
    "эмодзи (1-2 на ответ), но без перебора. Отвечай по-русски, кратко, "
    "обычно 2-5 предложений.\n\n"
    "ЧТО МОЖНО:\n"
    "• спрашивать про самочувствие, настроение, сон, симптомы, отношения, "
    "бытовые штуки;\n"
    "• давать общие лайфстайл-идеи: тёплая ванна, прогулка, мягкая еда, "
    "вода, дыхание, отдых, тёплая грелка;\n"
    "• подбадривать, поддерживать, напоминать что чувствовать всё это — нормально.\n\n"
    "ЧТО НЕЛЬЗЯ:\n"
    "• ставить диагноз, рекомендовать препараты, дозы, обследования, "
    "анализы, БАДы — это работа врача;\n"
    "• обещать терапевтический эффект;\n"
    "• давать советы при тревожных симптомах (сильная боль, кровотечение, "
    "обмороки, температура и т.п.) — здесь только: «срочно к врачу или 103/112».\n\n"
    "Если девушка делится тревожным симптомом — мягко, без паники, "
    "напомни про врача, и предложи поддержку. Никогда не выдавай себя за врача."
)

_NON_MEDICAL_DISCLAIMER = (
    "ℹ️ Я не врач — это дружеская поддержка, а не медицинский совет. "
    "При сомнениях — обратись к специалисту."
)


@dataclass
class GigaChatConfig:
    client_id: str
    client_secret: str
    scope: str = "GIGACHAT_API_PERS"
    model: str = "GigaChat"
    verify_tls: bool = False  # GigaChat uses Russian root CA not in Mozilla store

    @property
    def auth_basic(self) -> str:
        raw = f"{self.client_id}:{self.client_secret}".encode("utf-8")
        return base64.b64encode(raw).decode("ascii")


def _looks_like_authorization_key(value: str) -> tuple[str, str] | None:
    """Return (client_id, client_secret) if value is base64('cid:secret'), else None.

    Sber's developer cabinet hands users a pre-assembled "Authorization key"
    (base64 of `client_id:client_secret`, ~96+ chars, ends with `=`).
    People sometimes paste it into a field labeled "Client Secret" by accident,
    so we tolerate either label.
    """
    if not value or len(value) < 60 or not value.rstrip().endswith("="):
        return None
    try:
        decoded = base64.b64decode(value, validate=True).decode("utf-8")
    except Exception:
        return None
    cid, _, sec = decoded.partition(":")
    cid, sec = cid.strip(), sec.strip()
    if cid and sec:
        return cid, sec
    return None


def _config_from_env() -> GigaChatConfig | None:
    cid = os.environ.get("GIGACHAT_CLIENT_ID", "").strip()
    sec = os.environ.get("GIGACHAT_CLIENT_SECRET", "").strip()
    auth_key = os.environ.get("GIGACHAT_AUTHORIZATION_KEY", "").strip()

    # 1. Explicit pre-assembled Authorization key.
    if (parsed := _looks_like_authorization_key(auth_key)) is not None:
        return GigaChatConfig(client_id=parsed[0], client_secret=parsed[1])

    # 2. User pasted the Authorization key into the SECRET field by mistake.
    if (parsed := _looks_like_authorization_key(sec)) is not None:
        return GigaChatConfig(client_id=parsed[0], client_secret=parsed[1])

    # 3. User pasted the Authorization key into the CLIENT_ID field by mistake.
    if (parsed := _looks_like_authorization_key(cid)) is not None:
        return GigaChatConfig(client_id=parsed[0], client_secret=parsed[1])

    # 4. Normal split CID + secret.
    if cid and sec:
        return GigaChatConfig(client_id=cid, client_secret=sec)
    return None


class GigaChatClient:
    """OAuth-with-cache + chat completions."""

    def __init__(self, config: GigaChatConfig) -> None:
        self._config = config
        self._token: str | None = None
        self._token_expires_at: float = 0.0
        self._lock = asyncio.Lock()
        ctx = ssl.create_default_context()
        if not config.verify_tls:
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
        self._ssl = ctx

    async def _refresh_token(self) -> str:
        async with httpx.AsyncClient(verify=self._ssl, timeout=20.0) as client:
            resp = await client.post(
                OAUTH_URL,
                data={"scope": self._config.scope},
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept": "application/json",
                    "RqUID": str(uuid.uuid4()),
                    "Authorization": f"Basic {self._config.auth_basic}",
                },
            )
            resp.raise_for_status()
            payload = resp.json()
            self._token = payload["access_token"]
            # GigaChat returns expires_at in ms epoch; fall back to 25 min.
            expires_ms = payload.get("expires_at")
            if isinstance(expires_ms, (int, float)) and expires_ms > 0:
                self._token_expires_at = float(expires_ms) / 1000.0
            else:
                self._token_expires_at = time.time() + 25 * 60
            assert self._token is not None
            return self._token

    async def _get_token(self) -> str:
        async with self._lock:
            if self._token and time.time() < self._token_expires_at - 60:
                return self._token
            return await self._refresh_token()

    async def chat(
        self,
        user_messages: Iterable[dict[str, str]],
        *,
        system_prompt: str = DEFAULT_SYSTEM_PROMPT,
        temperature: float = 0.7,
        max_tokens: int = 320,
    ) -> str:
        token = await self._get_token()
        msgs: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
        msgs.extend(user_messages)
        async with httpx.AsyncClient(verify=self._ssl, timeout=40.0) as client:
            resp = await client.post(
                CHAT_URL,
                json={
                    "model": self._config.model,
                    "messages": msgs,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                },
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
            )
            if resp.status_code == 401:
                # Token rotated mid-flight — refresh once.
                self._token = None
                token = await self._get_token()
                resp = await client.post(
                    CHAT_URL,
                    json={
                        "model": self._config.model,
                        "messages": msgs,
                        "temperature": temperature,
                        "max_tokens": max_tokens,
                    },
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]


_singleton: GigaChatClient | None = None


def get_client() -> GigaChatClient | None:
    """Lazy-init the GigaChat client from env, or return None if unconfigured."""
    global _singleton
    if _singleton is not None:
        return _singleton
    cfg = _config_from_env()
    if cfg is None:
        return None
    _singleton = GigaChatClient(cfg)
    return _singleton


def non_medical_disclaimer() -> str:
    return _NON_MEDICAL_DISCLAIMER
