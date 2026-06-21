# سُكّري — Sukkari

An **Arabic-first, RTL-native** diabetes self-management & wellness logging app
for the Saudi market (MVP prototype).

> ⚠️ This is a **logging and wellness tool only**. It tracks and reflects data
> back to the user. It does **not** diagnose, give clinical advice, calculate
> insulin doses, or interpret readings medically. All glucose thresholds are
> clearly flagged as **placeholders to be confirmed with a clinician**.

## Run it

```bash
cd diabetes-app
npm install
npm run dev
```

Then open the printed local URL on a phone-sized viewport (the layout is
mobile-first). Realistic mock data for ~30 days is already populated.

## The core loop

1. **Glucose logging (the spine)** — the central **+** button opens straight to
   a large number pad. Pick a context chip (Fasting / Before meal / After meal,
   defaulted by time of day), tap save. The moment it's saved you get an instant,
   calm, color-coded reflection: a non-clinical status (ضمن المعدل / مرتفع قليلاً
   / منخفض) and how it compares to your recent average. This single interaction
   is the product.
2. **Home dashboard** — latest reading (big, color-coded), today's meds, and a
   beautiful 7-day / 30-day glucose trend (Recharts, points colored by state).
3. **Medication reminders** — add meds with times, one-tap "taken", and an
   in-app "due now" banner simulating reminders.
4. **Light meal logging** — a curated starter list of Saudi/Gulf foods (kabsa,
   dates, samboosa, …) plus free text. Captures that a meal happened, nothing more.
5. **Doctor-ready export** — a clean, printable 30-day summary to share with a
   clinician (`window.print()`), with a non-clinical disclaimer.

## Architecture

```
src/
  i18n/            Centralized AR/EN strings + RTL-aware language context
  lib/
    glucose.ts     Centralized, clearly-flagged PLACEHOLDER range logic
    types.ts       Shared domain types
    meds.ts        Today's-dose derivation
    datetime.ts    Locale-aware date/time helpers
  data/mockData.ts Seeded in-memory store + curated food list
  services/        glucoseService / medsService / mealsService
                   (promise-based over mock data — swap for a real API here)
  hooks/useAppData Owns app state, calls services
  components/      BottomNav, GlucoseLogModal (number pad + instant feedback),
                   TrendChart, icons
  screens/         Home, Meds, Meals, Export
```

The **data layer is fully decoupled** from the UI: every screen talks to the
`*Service` modules, which today resolve promises over an in-memory mock store.
Dropping in a real HTTP/auth backend later means editing only the services —
no UI changes required. Clean seams are left for future caregiver sharing and a
dietitian marketplace.

## Deliberately out of scope (per MVP brief)

No diagnosis / clinical interpretation / dose calculation, no Bluetooth or
wearable integration, no real backend/auth/DB, no gamification (no streaks,
badges, or points).
