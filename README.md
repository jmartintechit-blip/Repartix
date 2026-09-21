<div align="center">

# Repartix

**Split group expenses from a photo of the receipt.**
A vision AI extracts the items and prices, each person marks what they had, and the app automatically works out who owes whom — with debt simplification.

[![License: MIT](https://img.shields.io/badge/license-MIT-b9770e)](LICENSE)
![Node](https://img.shields.io/badge/node-%3E%3D20-1b6e64)
![React](https://img.shields.io/badge/frontend-React%20%2B%20Vite-e15b36)
![Tests](https://img.shields.io/badge/tests-14%20passing-1b6e64)
![DB](https://img.shields.io/badge/db-SQLite%20%7C%20Postgres-2e6da4)

🇪🇸 [Leer esto en español](README.es.md)

</div>

---

## Why it exists

Splitting the bill after a group trip or dinner almost always ends up as an improvised spreadsheet, or an "I'll pay you back later" that never happens. Repartix automates the two tedious parts: **reading the receipt** (with a vision AI) and **working out who pays whom** (with a debt-simplification algorithm), so the only thing left to do is tick off which items were yours.

This is a technical portfolio piece built as a real application, not a happy-path-only demo: JWT auth with hashed passwords, a relational database with transactions, input validation on every endpoint, group-membership access control, and money math done in whole cents so a single cent never gets lost to rounding.

## Screenshots

<table>
<tr>
<td width="50%">

**Login**
<img src="docs/screenshots/01-login.png" alt="Repartix login screen" width="100%">

</td>
<td width="50%">

**Your groups**
<img src="docs/screenshots/02-dashboard.png" alt="Dashboard with the list of groups" width="100%">

</td>
</tr>
<tr>
<td width="50%">

**Group detail**
<img src="docs/screenshots/03-grupo.png" alt="Group detail with members and expenses" width="100%">

</td>
<td width="50%">

**Assigning who had what**
<img src="docs/screenshots/04-gasto.png" alt="Expense detail with items assigned to each person" width="100%">

</td>
</tr>
</table>

**Balances and settlements**
<img src="docs/screenshots/05-liquidaciones.png" alt="Balances and settlements screen between members" width="100%">

## Features

- Sign up and log in with hashed passwords (bcrypt) and JWT sessions
- Create a group or join an existing one with a 6-character invite code
- Upload a photo of the receipt → a vision AI (Gemini) extracts the items and total, editable before saving
- Each member marks which items they had, or splits a whole expense equally with one click
- Debt engine: net balance per person, with tax and tip prorated proportionally
- Debt simplification: if A owes B and B owes C, it collapses to A paying C directly, minimizing the number of payments
- Group expense history, with the receipt photo linked
- Mark a settlement as paid (only the two people involved in that debt can do it)

## Stack

| Layer | Technology | Why |
|---|---|---|
| Backend | Node.js + Express | A plain REST API, no over-engineering for a project this size |
| Database | SQLite (better-sqlite3) → Postgres in production | Zero setup in development, migrations wrapped in `ALTER TABLE` so data is never lost |
| Auth | JWT + bcrypt | The same pattern I'd use in a production backend |
| Validation | Zod | Explicit schemas on every endpoint, consistent error messages |
| Frontend | React + Vite | No styling framework — a hand-built design system with CSS Modules |
| Vision AI | Google Gemini (`gemini-2.5-flash`) | Structured extraction (`responseSchema`) of items and prices from the image |
| Images | Cloudinary | Persists across deploys — doesn't depend on the server's own disk |

## How it works out who owes whom

1. **For every expense**, whoever paid is credited the full amount, and that same amount (with tax/tip already prorated proportionally across the items) is split among the people assigned to each item.
2. All of the splitting happens **in whole cents** using the largest-remainder method, so what's collected and what's distributed always add up exactly — no cent ever leaks to `float` rounding errors.
3. Given everyone's net balance, a **greedy algorithm** pairs the biggest debtor with the biggest creditor at each step, minimizing how many transfers are needed to settle the whole group.
4. Settlements already marked as paid are remembered: adding a new expense later never asks someone to pay something they already paid.

## Getting started

Requires Node.js 20 or later.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env` and set a long random value for `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

```bash
npm run migrate   # creates the SQLite database and its tables
npm run dev        # http://localhost:3001
```

To run the debt-calculation logic tests (Vitest):

```bash
npm test
```

### 2. Frontend

In another terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev         # http://localhost:5173
```

At this point the app works end to end: sign up, log in, groups, expenses and settlements. The only piece that needs extra setup is AI receipt scanning (optional, see below) — without it, everything else works the same and expenses are entered by hand.

### 3. Turning on AI receipt scanning (optional)

Without these credentials, the "Scan receipt with AI" button shows a notice and the form is filled in by hand as usual — nothing else in the app is affected.

| Variable | Where to get it |
|---|---|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) — free, no card required |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | [Cloudinary](https://cloudinary.com/users/register/free) — free plan, found on the Dashboard once you sign up |

## Deployment

The backend talks to the database through [Knex](https://knexjs.org/) instead of the SQLite driver directly: the same `services/` code works unchanged against SQLite or Postgres, depending on whether `DATABASE_URL` is set.

```
DATABASE_URL empty → local SQLite (backend/data/repartix.sqlite)
DATABASE_URL set   → Postgres (that connection string)
```

Verified with two test suites: one against real SQLite (the same one used in development) and another against an in-memory Postgres-compatible engine ([pg-mem](https://github.com/oguimbal/pg-mem), since this environment had no Docker available to run real Postgres) — both exercise the same expense/balance scenario with identical results. Even so, it's worth smoke-testing sign up/login right after deploying, as a first check against the real production Postgres.

### Backend on Railway

1. Create a Railway project and connect it to this repo (`backend/` folder).
2. Add Railway's **Postgres** plugin — it generates `DATABASE_URL` automatically, no need to write it by hand.
3. Set the rest of the project's environment variables (same keys as `backend/.env.example`): `JWT_SECRET`, `FRONTEND_URL` (the public URL Vercel gives you), and optionally `GEMINI_API_KEY`/`CLOUDINARY_*`.
4. Start command: `npm start`. Migrations run on their own at startup (`migrate()` runs before the server starts listening), same as locally.

### Frontend on Vercel

1. Import this repo into Vercel, with `frontend/` as the project's root directory.
2. Environment variable: `VITE_API_URL` pointing at the backend's public URL on Railway (e.g. `https://your-backend.up.railway.app/api`).

### CORS

In development, with `FRONTEND_URL` unset, the backend accepts requests from any origin (same as always). In production, setting `FRONTEND_URL` to the Vercel URL restricts CORS to that origin — so no other website can call your API using a logged-in user's session.

## Project structure

```
backend/
  src/
    routes/          Express endpoints, grouped by resource
    controllers/     validate input and orchestrate the response
    services/        business logic and data access (SQL)
    middleware/      auth, group membership, image upload
    validators/      Zod schemas per endpoint
    db/              Knex connection (SQLite/Postgres) and migrations
frontend/
  src/
    pages/           one screen per route
    components/
      ui/            Button, Input, Card, Modal, Avatar... (design system)
      layout/        AuthLayout, AppShell
      routing/       route guards (protected / guest-only)
    api/             one module per resource, all over a shared fetch client
    context/         global authentication state
docs/screenshots/    screenshots used in this README
```

Each folder (`backend/`, `frontend/`) has its own `package.json` and runs independently.

## License

Distributed under the [MIT license](LICENSE): you can use, copy, modify and distribute the code freely, including for commercial purposes, as long as the copyright notice is kept.
