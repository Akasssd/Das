# FlowCare Telegram bot

Subscription onboarding bot for the **Cycle Tracker** app. Runs the
questionnaire, collects address, forwards every confirmed order to the admin
chat and persists a JSONL log for QA.

Built with [aiogram 3](https://docs.aiogram.dev/) on Python 3.11+.

## Quick start

```bash
cd bot/
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env and fill in BOT_TOKEN + ADMIN_CHAT_ID
#   - BOT_TOKEN: send /newbot to https://t.me/BotFather, copy the token
#   - ADMIN_CHAT_ID: forward any message to https://t.me/userinfobot, copy your "Id"

python -m bot.main
```

The bot uses long-polling, so no webhook server / public IP is required.

## Flow

1. User taps "Оформить через Telegram" inside the app or types `/start` to the
   bot.
2. Bot greets them and shows tariff buttons (Basic 999 ₽ / VIP 1999 ₽).
3. After tariff choice, the bot walks the user through the 5-step
   questionnaire defined in [`questions.py`](./questions.py):

   1. Hygiene products (multi-select)
   2. Allergies / sensitivities (multi-select)
   3. Diet style (single)
   4. Care items to add (multi-select)
   5. Free-form notes (optional)

4. Bot collects address and recipient name as free-form text.
5. Bot shows a summary card and asks for confirmation.
6. On confirm, the bot:
   - Appends the order to `orders.jsonl`
   - Sends a formatted notification to `ADMIN_CHAT_ID`
   - Shows the user a payment placeholder (to be replaced with Telegram
     Payments / YooKassa later)
7. `/cancel` aborts the current flow at any time.

## Editing the questionnaire

`bot/questions.py` is the only file you need to edit to add/remove/reorder
questions. Each `Step` has:

- `kind="single"` — radio-style; user must pick one option
- `kind="multi"`  — checkbox-style; user toggles options, taps "✅ Готово"
- `kind="text"`   — free-form text answer
- `optional=True` — adds a "Пропустить" button (only meaningful for `text`)

The runtime FSM and the keyboards regenerate automatically.

## Deployment

The bot has zero external dependencies beyond Telegram and a writable
filesystem for `orders.jsonl`. Any of these will work:

- **Local laptop / Mac mini** — just `python -m bot.main` in a screen/tmux
  session.
- **VPS** — wrap in a `systemd` unit (example below).
- **Railway / Fly.io / Render** — any PaaS that runs a Python long-poll
  process.

### systemd example (`/etc/systemd/system/flowcare-bot.service`)

```ini
[Unit]
Description=FlowCare Telegram bot
After=network-online.target

[Service]
WorkingDirectory=/opt/flowcare/bot
ExecStart=/opt/flowcare/bot/.venv/bin/python -m bot.main
EnvironmentFile=/opt/flowcare/bot/.env
Restart=always
RestartSec=5
User=flowcare

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now flowcare-bot
sudo journalctl -u flowcare-bot -f
```

## Future work

- Replace `simulate_payment` with real Telegram Payments / YooKassa.
- Expose a small HTTP API (e.g. `/v1/subscription/{user_id}`) so the mobile
  app can sync the active tier and `renewsAt` directly. The hook stub in
  [`src/hooks/useSubscription.ts`](../src/hooks/useSubscription.ts) (search
  for `TODO(bot-sync)`) marks where the call goes.
- Move from JSONL to Postgres / Firestore once the order volume grows.
