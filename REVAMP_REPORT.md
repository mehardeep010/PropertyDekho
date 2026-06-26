# PropertyDekho — One-Day Revamp Report
**Date:** 26 June 2026 · **Branch:** `main` (and `revamp`) · **Outcome:** 🟢 Live on Railway

> This document explains **what the project was at the start of the day**, and **every improvement
> made through the day**, organised by phase with the exact files touched and the commit message
> for each. It doubles as an interview cheat-sheet: each phase is a defensible talking point.

---

## TL;DR

| | Morning (start) | Evening (now) |
|---|---|---|
| **Structure** | Flat `routes/` + `middleware/` + `db/connection.js`, logic dumped in `server.js` | Layered: `routes → controllers → services → repositories` under `src/` |
| **Data** | 8 hardcoded fake properties | **1756 real listings** from a Kaggle 7-city dataset |
| **Security** | None (no validation, no headers, no rate limit) | express-validator + helmet + rate limiting + body-size guard |
| **Config** | Hardcoded port `8080`, hardcoded DB creds | Fail-fast env config, no secrets in code, `DB_PORT`-aware |
| **Logging** | `console.log` everywhere | Structured Pino logs + per-request trace IDs |
| **Concurrency** | Triggers/procs existed but unproven | Automated load test **proving** `FOR UPDATE` stops double-booking |
| **AI** | A `Math.random()` fake estimate | Pluggable **Gemini** estimator + comparables heuristic fallback |
| **Deploy** | Runs only on localhost | **Dockerised** + **live public URL on Railway** |

**Live:** `https://propertydekho.up.railway.app/`
**Login:** `agent1@propertydekho.in` / `Test@123`

---

## Where we started (this morning)

The project was a DBMS course submission ("Task 6: ACID Transactions in SQL and Triggers").
What existed:

**The good foundation (kept and built upon):**
- A solid **3NF MySQL schema** (`schema.sql`).
- **7 database triggers** (status sync between LEASE/PROPERTY, payment validation, audit).
- **2 stored procedures** — `CreateLeaseTx` and `CreatePaymentTx` — using
  `START TRANSACTION` + `SELECT … FOR UPDATE` row locks for real ACID concurrency.
- A working vanilla HTML/JS frontend (`public/`).

**The problems (what we fixed):**
- All logic crammed into a flat layout: `routes/` (14 files), `middleware/auth.js`,
  `db/connection.js`, and a `server.js` that did everything (DB connect, the auto-expiry
  worker, route mounting) and **hard-coded port 8080**.
- **Hardcoded database credentials**; no environment config.
- **No input validation, no security headers, no rate limiting** — anything could hit the DB.
- **`console.log` debugging** only; no structured/traceable logs.
- Seed data was **8 fake properties** and originally **no login users** (app wasn't loginable).
- Committed macOS junk files (`._*`).
- Couldn't be containerised or deployed; ran on a developer machine only.

---

## What we did — phase by phase

Each phase below lists its **commit**, **what changed**, and **the files**.

### Phase 1 — Layered architecture
`48f1213 · refactor: restructure into layered architecture (routes/controllers/services/repositories)`

Migrated all 14 flat routes into a clean layered structure under `src/`, one responsibility per layer.
Also fixed a real concurrency bug: stored-proc calls now pin `CALL` + `SELECT @vars` to a **single
pooled connection** (MySQL session vars are per-connection; the old two-query approach was racy).
Removed committed macOS `._*` junk and added `.env.example`.

- **Removed (old flat code):** `db/connection.js`, `middleware/auth.js`, all `routes/*.js`
  (14 files), and the bloated `server.js` logic; deleted `._*` junk.
- **Added — `src/api/routes/` (14):** one file per domain, URL → controller mapping only.
- **Added — `src/api/controllers/` (14):** thin HTTP glue via `asyncHandler` (no try/catch).
- **Added — `src/services/` (16):** business rules (e.g. "Sold property is locked", proc status mapping).
- **Added — `src/repositories/` (16):** **all SQL**, fully parameterized — the single audit surface for SQL-injection.
- **Added — `src/config/index.js`:** fail-fast env config, no hardcoded secrets.
- **Added — `src/db/pool.js`:** shared mysql2 connection **pool** (replaces single connection).
- **Added — `src/utils/`:** `ApiError`, `asyncHandler`; `src/api/middlewares/errorHandler.js` central handler.
- **Added — `src/jobs/autoExpiry.js`:** background worker extracted out of `server.js`.
- **Added — `src/app.js` + `server.js`:** app assembly split from `listen()` for testability.

### Phase 1.1 — Seed fix (make it loginable)
`7acf8b5 · fix(seed): make seed trigger-compatible and add login users`

- `seed.sql`: Lease #3 now inserted **Active** so its historical payments pass the payment
  trigger, then set **Terminated** afterward (real-world order). Added **7 USERS** across
  agent/owner/tenant/admin so the app is actually loginable (`Test@123`, bcrypt-hashed).

### Phase 2 — Security & robustness
`fdc826e · feat(security): add input validation, helmet, rate limiting`

- **`src/api/validators/index.js`** + **`src/api/middlewares/validate.js`:** per-domain
  express-validator rules that reject bad/missing input with structured **400s before the DB**.
- **`src/api/middlewares/rateLimiter.js`:** strict limiter on `/api/auth` (brute-force) + general `/api`.
- **`src/app.js`:** wired helmet (security headers), rate limiters, and a `10kb` JSON body limit (DoS guard).
- Applied validators to **every write route and `:id` param** (all 14 route files updated).
- **SQLi audit:** all queries parameterized; only interpolation is whitelisted role table/PK names
  in `profile.repository` (never user input).
- **`.gitattributes`:** enforce LF (silence Windows CRLF noise).

### Phase 3 — Observability (structured logging)
`c15b048 · feat(observability): structured logging with Pino + request IDs`

- **`src/utils/logger.js`:** single Pino logger (pretty in dev, JSON in prod, `LOG_LEVEL` controlled).
- **`src/api/middlewares/httpLogger.js`:** pino-http logs every request with a **per-request ID**
  (honours client `X-Request-Id`, else generates one) echoed in the response header for
  end-to-end tracing. `4xx → warn`, `5xx → error`; redacts auth/cookie headers.
- Replaced **all `console.*`** (`errorHandler`, `server.js`, `autoExpiry`) with the logger.

### Phase 4 — Real data (Kaggle ETL)
`4a9b973 · feat(data): real Kaggle 7-city dataset ETL replacing hardcoded seed`

- **`scripts/etl.js`** (`npm run seed`): parse the Kaggle CSV → clean (price `Cr/L/k` → rupees,
  property type, AI baseline estimate) → **city-stratified sample (~1756, 250/city)** → bulk load.
  Synthesizes FK-safe owner/agent/tenant pools + clean demo logins, and generates demo
  inquiries/leases/payments so dashboards and transaction flows have data.
- Raw 11 MB dataset gitignored; `csv-parse` added as a dev dependency.

### Phase 5 — Concurrency proof (the interview trump card)
`9ba4f09 · test(concurrency): load test proving FOR UPDATE locks stop double-booking`

- **`scripts/concurrency-test.js`** (`npm run test:concurrency`): fires **N parallel
  `CreateLeaseTx` calls** (each on its own connection) at one Available property and asserts
  **exactly 1×201 + (N−1)×409**. Self-cleaning and re-runnable, with a `CONCURRENCY` env knob.
- Verified: 10 and 25 agents → exactly 1 winner, the rest rejected, **zero race conditions**.

### Phase 6 — Smart pricing (pluggable Gemini AI)
`2e21fbb · feat(ai): pluggable Gemini price estimator with heuristic fallback`

- **`src/services/aiEstimator.service.js`:** uses **Gemini** (plain REST, no SDK) when
  `GEMINI_API_KEY` is set, otherwise a **comparables heuristic** (avg price of same type+city).
  Returns `{value, source, rationale}`; any Gemini failure silently falls back (5s timeout) — the
  app never crashes on a missing/bad key.
- New endpoint **`POST /api/properties/:id/estimate`** (auth-gated). `property.service.create`
  now uses the estimator; added `reestimate()` + repo `updateAiPrice()`.

### Phase 8 — Dockerise
`9ceacb1 · build(docker): Dockerfile + compose (app+MySQL) with healthchecks`
`8512258 · fix(docker): ship blank JWT_SECRET in .env.example so prod container boots`

- **`Dockerfile`:** multi-stage `node:22-alpine`, `npm ci --omit=dev`, **non-root** user, `HEALTHCHECK`.
- **`docker-compose.yml`:** MySQL auto-initialises via `initdb.d`; the app waits on
  `db: service_healthy`; all config via `.env` interpolation.
- **`GET /api/health`** (in `src/app.js`): pings the DB, returns 503 if down — used by the
  container and the deploy platform.
- **`.dockerignore`:** trims `node_modules` / `.env` / raw dataset from the build context.

### Phase 8.1 — Committable rich seed
`a9d1ce6 · feat(data): committable rich seed-data.sql so Docker/deploy gets real data sans CSV`

- **`scripts/dump-seed.js`** (`npm run dump`): dumps the loaded DB → **`db/seed-data.sql`**
  (data-only, FK-checks-off, parent→child order; triggers stay in `schema.sql`). 7851 rows /
  1756 properties (374 KB), trigger-safe.
- `docker-compose` now loads `schema.sql` + this rich seed (so Docker/deploy get **real** data
  without needing the 11 MB CSV).

### Phase 9 — Deploy (live link)
`ae93e03 · feat(deploy): Railway config + DB_PORT support for cloud MySQL`

- **`src/config/index.js` + `src/db/pool.js`:** honour **`DB_PORT`** (cloud MySQL is rarely on 3306).
- **`railway.json`:** build from the Dockerfile, `/api/health` healthcheck, restart policy.
- **`RAILWAY_DEPLOY.md`:** step-by-step free, MySQL-only deploy guide.
- Deployed on **Railway** (free tier) with a managed MySQL; live DB seeded with `schema.sql` +
  `db/seed-data.sql`. **Now live with all 1756 properties.**

---

## The stack now

- **Runtime:** Node.js 22 + Express 4
- **DB:** MySQL 8 (3NF, 7 triggers, 2 stored procedures with `FOR UPDATE` row locks)
- **Auth:** JWT (jsonwebtoken) + bcryptjs
- **Security:** helmet, express-rate-limit, express-validator
- **Logging:** Pino + pino-http (request IDs)
- **AI:** Gemini (optional) with deterministic heuristic fallback
- **Container:** Docker + docker-compose (app + MySQL, healthchecks)
- **Hosting:** Railway (managed MySQL + app from GitHub)
- **Frontend:** vanilla HTML/CSS/JS (intentionally unchanged this revamp)

## How to run

```bash
# Local (needs MySQL running + .env)
mysql < schema.sql                 # structure + triggers + procedures
npm run seed                       # load real Kaggle data (needs the CSV)  — OR —
mysql property_mgmt < db/seed-data.sql   # load the committed rich data (no CSV needed)
npm start                          # http://localhost:3000

# Everything in Docker (no local MySQL needed)
docker compose up --build          # app + MySQL, auto-seeded

# Prove the concurrency locks
npm run test:concurrency           # CONCURRENCY=25 npm run test:concurrency
```

## What's intentionally left (optional, for later)
- **Tests (Phase 7):** Jest + supertest integration tests against a test DB.
- **Docs (Phase 10):** ER diagram + OpenAPI/Swagger.
- **Frontend polish:** the UI was deliberately untouched; known inconsistencies to revisit.

---

*Built across 26 June 2026. The backend was rebuilt from a flat course project into a layered,
secured, observable, real-data, concurrency-proven, AI-assisted, containerised, and deployed
application — without changing the database engine (stayed MySQL throughout).*
