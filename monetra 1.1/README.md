# Monetra — Personal Finance Intelligence

A local-first personal finance application: understand where your money goes, keep budgets
under control, project recurring expenses, work toward goals, and explore *what-if* financial
scenarios — all inside your browser, with no backend and no bank connection.

> **Demo notice** — Monetra is a front-end portfolio project. It does not connect to banks or
> financial institutions, executes no payments, and provides no regulated financial advice.
> All projections are estimates. Data is stored in your browser's LocalStorage only.

![Monetra logo](public/logo.svg)

## Screenshots

<!-- Replace these placeholders with real captures after running `npm run dev`.
     Suggested shots: dashboard, transactions table, budgets, simulator. -->

| View | Screenshot |
| --- | --- |
| Overview dashboard | `docs/screenshots/dashboard.png` *(placeholder — to be captured)* |
| Transactions ledger | `docs/screenshots/transactions.png` *(placeholder — to be captured)* |
| Budgets | `docs/screenshots/budgets.png` *(placeholder — to be captured)* |
| What-if simulator | `docs/screenshots/simulator.png` *(placeholder — to be captured)* |

## Key features

- **Overview dashboard** — total balance, income/expenses with month-over-month deltas, net
  cash flow, savings rate, income-vs-expenses chart, category breakdown, budget progress,
  upcoming recurring payments, goal progress and quick actions that open real interfaces.
- **Transactions** — full CRUD with search, category/type/date-range/amount filters, sorting,
  pagination, detail view and confirmation dialogs. Desktop table + mobile card layouts.
- **Budgets** — monthly limits per category with live utilization, near-limit (≥80%) and
  over-budget states, remaining amounts and a 4-month spend history per budget.
- **Analytics** — income vs expenses over time, cumulative cash flow, category donut with
  click-through trends, largest expenses and month-over-month comparison table.
- **Recurring** — weekly/monthly/quarterly/yearly schedules with next-date projection,
  pause/resume, simulated "record payment now", and a 90-day upcoming payments calendar.
- **Goals** — targets, contributions with history, progress bars and transparent pace math
  (required monthly contribution, at-risk detection at 40% of average income).
- **Insights** — deterministic, rule-based observations (spending changes, budget pressure,
  recurring burden, concentration, goal pace). No AI, no fabricated numbers.
- **What-if simulator** — sliders for income, savings and per-category spend multipliers,
  one-time expenses and duration; instant projections of surplus, savings pool, goal
  completion month and delta vs your current trajectory. Never touches real data.
- **Settings** — appearance (dark/light gallery), currency display (no invented conversions),
  date format, financial month start day, CSV export, JSON backup export/import with
  validation + preview, demo-data reset and explicit destructive-action confirmations.

### Dark & light mode

The dark "quiet wealth" gallery from `design.md` is the default. The light theme is its
structural inverse — pale canvas, white cards, dark spotlight tiles — built on shared
semantic tokens (`canvas / inset / card / inverted / lift / action / income / expense …`).
Switching themes is instant, persists with your preferences, applies before first paint
(no flash of wrong theme), and every chart, scrollbar, slider and focus ring follows along.
Accent colors stay identical across themes (with darker text variants in light mode for
contrast).

## Technology stack

| Layer | Choice |
| --- | --- |
| Framework | React 18 + TypeScript (strict) |
| Build | Vite 5 |
| Styling | Tailwind CSS v4 (`@theme` design tokens) |
| Routing | React Router 6 |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Icons | Lucide React |
| State | React Context + reducer, persisted to LocalStorage (versioned schema) |
| Fonts | DM Serif Display, Inter, Roboto Mono (self-hosted via Fontsource) |
| Tests | Vitest + Testing Library (jsdom) |

## Getting started

```bash
# install dependencies
npm install

# start the dev server (http://localhost:5173)
npm run dev

# run unit + smoke tests (34 tests)
npm test

# type-check and build for production
npm run build

# preview the production build
npm run preview
```

No environment variables, API keys or services are required.

## Project structure

```
src/
├── app/                # Route smoke tests
├── components/
│   ├── charts/         # Shared Recharts theming + accessible tooltips
│   ├── layout/         # AppShell: sidebar, glass topbar, mobile nav
│   ├── dashboard/      # (reserved for future dashboard widgets)
│   └── ui/             # Design-system primitives (Button, Card, Modal, …)
├── features/           # Feature modules (transaction form, …)
├── pages/              # One file per route
├── store/              # AppStore (reducer + persistence), ToastContext
├── data/               # Seeded demo dataset
├── lib/                # id/date/format/storage helpers (no React)
├── services/           # CSV export
├── types/              # Domain models
└── utils/              # Financial engine: finance, insights, simulation
```

## Architecture overview

- **Single source of truth.** `AppStoreProvider` holds one `AppData` object (transactions,
  budgets, recurring, goals, preferences) behind a typed reducer. Every page derives its
  numbers from that state via pure functions — no component keeps its own copy of a total,
  and nothing on the dashboard is hardcoded.
- **Persistence.** Each state change is serialized to `localStorage` under `monetra.data.v1`.
  Parsing failures fall back to the demo dataset rather than crashing. The schema carries a
  `version` field for future migrations.
- **Financial engine (`src/utils/`).** All money math lives outside React components:
  `finance.ts` (totals, savings rate, budget status, recurring schedules, goal pace),
  `insights.ts` (rule-based insight generation) and `simulation.ts` (what-if projections).
  These are the functions covered by the unit test suite.

### Financial calculation notes

- Amounts are stored as positive decimals; direction is carried by `type`.
- Savings rate = (income − expenses) / income, `null` when income is zero (never a misleading
  division by zero).
- Budget utilization is measured against the **financial month** (configurable start day,
  default the 1st), using only real expense transactions.
- Recurring schedules advance with calendar months and **end-of-month clamping**
  (Jan 31 + monthly → Feb 28). Monthly normalization uses a 30.44-day month
  (weekly×52/12, quarterly×4/12, yearly/12).
- Goal pace: required monthly = remaining ÷ months left; goals needing more than 40% of
  average monthly income are flagged *at risk*.
- Simulator: constant monthly income and category spend (3-month averages as baseline),
  savings transferred monthly, one-time expenses in their chosen month, no compounding or
  inflation. Results are labeled estimates.

## Data persistence

All data lives in your browser's LocalStorage — a single versioned JSON document. It
survives refreshes, stays on this device and this browser profile, and is never synced or
uploaded anywhere. You can export a full JSON backup or a transactions CSV at any time from
**Settings**, and re-import a backup after reviewing a preview of its contents.

## Demo data & limitations

- The app ships with a **seeded demo dataset** (≈6 months of plausible transactions, budgets,
  recurring schedules and goals) so every chart is meaningful on first launch. The topbar
  badge and Settings page indicate whether you are looking at demo data; any edit marks the
  data as your own, and you can reset to the demo set or clear everything at any time.
- Limitations: no accounts/authentication, no multi-device sync, no real bank feeds, no
  automatic recurring charging (schedules are planning projections only), currency setting
  changes the display symbol without converting amounts, and charts/insights are only as
  good as the data you enter.

## Future improvement ideas

- Budget period selection beyond monthly (weekly/quarterly), envelope budgeting
- CSV *import* with column mapping and duplicate detection
- Rule-based auto-categorization of imported records
- Multi-currency with explicit, user-supplied exchange rates
- PWA support for install/offline usage
- Visual regression + broader component tests

## License

Released under the [MIT License](LICENSE).
