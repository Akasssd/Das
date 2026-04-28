# Cycle Tracker

A privacy-first menstrual cycle tracking app built with **React Native + Expo**. Designed for iPhone but also runs on Android and the web because it ships as a single Expo project.

> Все данные хранятся **локально на устройстве** (AsyncStorage). Никаких аккаунтов, никаких облаков, никакой телеметрии.

## Features (MVP)

- 📅 **Monthly calendar** with cycle phases highlighted (period, predicted period, fertile window, ovulation, today)
- 🩸 **Period logging** with five flow levels: spotting / light / medium / heavy / none
- 🔮 **Predictions**:
  - Next period start & end
  - Ovulation day (luteal-phase model)
  - Fertile window (ovulation − 5 ... ovulation + 1)
  - Days remaining / late
- 🤒 **Day log**: 10 symptoms, 8 mood tags, basal body temperature (°C), free-form notes, intimacy flag
- 📊 **Statistics**: average / shortest / longest cycle, average period length, full history
- ⚙️ **Settings**: cycle length, period length, luteal-phase length, language (auto / RU / EN), fertile-window visibility, data export, full reset
- 🌗 **Light & dark themes** (follows iOS system appearance)
- 🇷🇺🇬🇧 **Russian and English** localization (auto-detected from system locale)
- 🎁 **Monthly box subscription** (Basic 999 ₽ / VIP 1999 ₽) — payments, address collection and a 5-step preference questionnaire all live in the **[FlowCare Telegram bot](./bot/README.md)**. The app exposes a marketing-only «Подписка» tab that links into the bot; subscription state syncs back to the app via a future bot API (placeholder hook is already wired up).

## Subscription flow

1. User opens the **Подписка** tab in the app and taps **«Оформить через Telegram»** on either tariff card — this opens `https://t.me/FlowCareBot?start=subscription`.
2. The Telegram bot greets the user and walks them through the questionnaire (hygiene → allergies → diet → care → notes → address → name).
3. The bot persists the order to `orders.jsonl` and forwards a formatted summary to the admin chat.
4. Bot accepts payment (Telegram Payments / YooKassa — currently a placeholder) and will push the active tier + `renewsAt` to the app via a small HTTP API once that's wired up. See `TODO(bot-sync)` in [`src/hooks/useSubscription.ts`](src/hooks/useSubscription.ts).

The bot itself lives in [`./bot/`](./bot/) and is a self-contained Python project — see [`bot/README.md`](./bot/README.md) for setup and deployment instructions.

## Stack

- [Expo SDK 54](https://docs.expo.dev/) + React Native 0.81 + React 19
- TypeScript (strict)
- React Navigation (native-stack + bottom-tabs)
- AsyncStorage for local persistence
- `date-fns` for date math
- `i18n-js` + `expo-localization` for translations
- `node:test` + `tsx` for unit tests

## Getting started

```bash
npm install
npm start
```

Then scan the QR code with the **Expo Go** app on your iPhone, or press `i` in the terminal to launch the iOS simulator (macOS only).

### Other commands

```bash
npm run ios         # Open in iOS simulator (macOS + Xcode required)
npm run android     # Open in Android emulator
npm run web         # Run in a browser
npm run typecheck   # tsc --noEmit
npm test            # Run unit tests for cycle prediction logic
```

### Building a real iOS app

For a `.ipa` you can install on a physical iPhone (or upload to TestFlight / the App Store), build with [EAS](https://docs.expo.dev/build/setup/):

```bash
npx eas build --platform ios
```

## Project layout

```
App.tsx                      # Root: navigation + providers
app.json                     # Expo config (iOS bundle id, splash, etc.)
src/
  AppContext.tsx             # Global state: data, settings, predictions, theme
  cycle.ts                   # Pure cycle math (predictions, stats, calendar markers)
  storage.ts                 # AsyncStorage persistence + import/export helpers
  theme.ts                   # Light & dark color palettes
  i18n.ts                    # i18n-js wrapper with auto-detect
  navigation.ts              # Typed RootStackParamList
  types.ts                   # Domain types: DayLog, Settings, Symptom/Mood enums
  components/
    Calendar.tsx             # Reusable monthly grid with markers + legend
  locales/
    en.json
    ru.json
  screens/
    CalendarScreen.tsx       # Hero card + month grid
    DayDetailScreen.tsx      # Flow / symptoms / mood / temp / notes / intimacy
    StatsScreen.tsx          # Cycle aggregates and history
    SettingsScreen.tsx       # Cycle params, language, export, reset
test/
  cycle.test.ts              # Unit tests for prediction & calendar markers
```

## How predictions work

1. **Period starts** are detected as bleeding days where the previous day was *not* bleeding.
2. **Cycle length** = days between consecutive period starts. Lengths outside `[15, 60]` are ignored as data-entry noise.
3. **Average cycle length** = mean of detected cycle lengths (rounded). Falls back to the user-configured value when there isn't enough history.
4. **Next period start** = `lastPeriodStart + averageCycleLength`, rolled forward by full cycles until it lands on or after today (so a "late" cycle still produces a meaningful next-cycle date plus a `daysUntilNextPeriod` of 0 or negative).
5. **Ovulation** = `nextPeriodStart - lutealPhaseLength` (default 14, configurable).
6. **Fertile window** = `[ovulation - 5, ovulation + 1]`.

The logic lives in [`src/cycle.ts`](src/cycle.ts) and is fully covered by unit tests in [`test/cycle.test.ts`](test/cycle.test.ts).

## Disclaimer

This app is for **informational purposes only** and is **not a contraceptive**. Predictions are estimates based on past cycle history and do not replace medical advice.
