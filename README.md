# Sakan Home — Finance & Operations Console

A web-based financial solution for the **Sakan Home** e-commerce store. It
captures expenses, assets, liabilities, sales (orders), payments and
operational workflow (tasks + admin broadcasts) with full multi-currency
support, role-based access, and an immutable audit log.

## Stack

- **Backend:** Django 5.1 + Django REST Framework (token auth) + SQLite
- **Frontend:** React 18 + Vite 5 + React Router 6 (separate dev server)
- **Design:** Olive-green palette with dark mode, sidebar + drawer navigation

## Features

- **Dashboard** — filterable (date range, currency, status, category).
  KPIs for revenue, expenses, net profit, margin %, AOV, cash, runway.
  Monthly timelines, top vendors / categories / customers, task &
  order-status breakdowns.
- **Finance data**: Accounts, Currencies, FX rates (admin-managed),
  Vendors, Customers, Categories, Orders (+ line items), Expenses
  (with receipt uploads), Assets, Liabilities, Payments.
- **Reports**: Profit & Loss, Cash Flow, Balance Sheet, each filterable
  by date range (or as-of date), with CSV export.
- **CSV Imports**: Shopify orders export, Stripe balance CSV (auto-creates
  Stripe fee expenses), and a generic expenses template.
- **Tasks**: Admins assign tasks to users; both sides follow up with
  threaded comments and status updates. Filterable by status, priority,
  assignee.
- **Email broadcast (admin only)**: Send email with attachments to all
  Standard users at once. Uses the console backend in dev — look at the
  Django terminal output to see the email.
- **Audit log (admin only)**: Every login (success + failure), logout,
  create / update / delete, upload, download, import run, and broadcast
  is recorded with user, IP, and target.
- **Roles**:
  - **Admin** — full access (CRUD + delete, user management, FX rates,
    broadcasts, audit log).
  - **Standard** — view everything, create & update records; cannot
    delete, cannot manage users, FX rates, broadcasts or audit.
- **Dark mode**, collapsible sidebar / drawer menu, filters on every
  list page.

## Repository layout

```
myproject/                Django project
├── myproject/            settings / urls / wsgi
├── accounts/             existing auth scaffold (unchanged)
└── finance/              this app — models, API, importers, reports, tasks, audit

frontend/                 Vite + React SPA
├── src/
│   ├── App.jsx           sidebar + routing + theming
│   ├── lib/api.js        API client (Token auth)
│   ├── components/       ResourcePage + helpers
│   └── pages/            one page per domain + Dashboard / Reports / Tasks / etc.
└── package.json
```

## Running locally (two terminals)

### 1. Backend

```bash
cd myproject
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo        # loads Sakan Home demo data + 2 users
python manage.py runserver 0.0.0.0:8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                       # http://localhost:5173
```

The Vite dev server proxies `/api` and `/media` to `http://localhost:8000`,
so there is no CORS setup needed in dev.

### Demo credentials (after `seed_demo`)

| Role      | Username | Password     |
|-----------|----------|--------------|
| Admin     | `admin`  | `admin12345` |
| Standard  | `user`   | `user12345`  |

Sign in at `http://localhost:5173`. Use the admin to see everything —
users, broadcast, audit log, FX rates. The standard user has a
restricted sidebar.

## Testing

```bash
cd myproject
python manage.py test finance     # 20 tests
```

The suite covers FX conversion, report math, importers (Shopify /
Stripe / generic), login + audit trail, role permissions, task
assignment + comments, email broadcast, and dashboard KPIs.

## API quick reference

| Endpoint | Method | Notes |
|---|---|---|
| `/api/auth/login/` | POST | returns `{ token, user }` |
| `/api/auth/logout/` | POST | |
| `/api/auth/me/` | GET | |
| `/api/accounts/` `/api/orders/` `/api/expenses/` … | CRUD | all list views accept filter query params |
| `/api/reports/pnl/?from=&to=&format=csv` | GET | |
| `/api/reports/cashflow/?from=&to=` | GET | |
| `/api/reports/balance-sheet/?as_of=` | GET | |
| `/api/reports/dashboard/?from=&to=&currency=&status=&category=` | GET | |
| `/api/imports/shopify-orders/` | POST (file) | admin + standard |
| `/api/imports/stripe-payouts/` | POST (file) | admin + standard |
| `/api/imports/expenses-generic/` | POST (file) | admin + standard |
| `/api/tasks/` `/api/task-comments/` | CRUD | delete = admin only |
| `/api/users/` | CRUD | admin only (invite / set role / reset password) |
| `/api/broadcast/email/` | POST (multipart) | admin only, attachments supported |
| `/api/audit-logs/` | GET | admin only |

Auth header on every API call: `Authorization: Token <token-from-login>`.

## Configuration notes

- `BASE_CURRENCY` defaults to USD. All reports normalise to USD.
- FX rates are entered manually by admins (page: **FX rates**). For
  each non-USD transaction, the report picks the latest rate on or
  before the transaction date.
- Email backend is `console` by default — `runserver` will print the
  broadcast to stdout. Replace `EMAIL_BACKEND` in `settings.py` with
  SMTP settings for production.
- `DEBUG=True` and `ALLOWED_HOSTS=['*']` are dev defaults — tighten
  before deploying.
