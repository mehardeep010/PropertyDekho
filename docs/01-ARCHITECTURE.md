# 01 — Architecture & File Walkthrough

## The big idea: layered architecture

Old version: everything was dumped in `server.js` + flat `routes/` files (SQL, rules, and HTTP all
mixed). New version: **4 clean layers**, each with ONE job. This is the "separation of concerns"
principle — and it's the #1 thing interviewers check in a backend project.

```
HTTP request
   │
   ▼
ROUTE          src/api/routes/*.routes.js       → "which function handles this URL?"
   │                                               (also runs validation middleware)
   ▼
CONTROLLER     src/api/controllers/*.controller.js → reads req, calls service, sends res (HTTP glue)
   │
   ▼
SERVICE        src/services/*.service.js         → BUSINESS RULES ("is this allowed?")
   │
   ▼
REPOSITORY     src/repositories/*.repository.js  → ALL the SQL (parameterized queries)
   │
   ▼
DATABASE       MySQL (schema.sql)                → tables, triggers, stored procedures
```

**Why this matters (say this in the interview):**
- "If a recruiter asks *is your app SQL-injection safe?* — I only have to show one folder,
  `repositories/`, because that's the only place SQL exists."
- "If business rules change, I touch `services/` only — routes and SQL stay untouched."
- "Each layer is testable in isolation."

---

## Folder-by-folder map

```
PropertyDekho/
├── server.js              ← ENTRY POINT. Starts the app (see lifecycle below).
├── schema.sql             ← THE DATABASE: tables, 7 triggers, 2 stored procedures. (Your core work.)
├── seed.sql               ← small demo data (8 properties) — fallback.
├── db/seed-data.sql       ← RICH data dump (1756 real Kaggle properties) for Docker/deploy.
│
├── public/                ← FRONTEND (vanilla HTML/CSS/JS). The browser loads this.
│
├── src/                   ← ALL BACKEND CODE
│   ├── app.js             ← builds the Express app: middleware + mounts all routes + error handler.
│   ├── config/index.js    ← reads .env (DB creds, JWT secret). Fail-fast if a required one is missing.
│   ├── db/pool.js         ← the MySQL connection POOL (shared, reused across requests).
│   │
│   ├── api/
│   │   ├── routes/        ← 14 files: URL → controller mapping (+ validation).
│   │   ├── controllers/   ← 14 files: thin HTTP glue (read request, call service, send JSON).
│   │   ├── middlewares/   ← auth (JWT), validate, rateLimiter, httpLogger, errorHandler.
│   │   └── validators/    ← input rules (express-validator) per domain.
│   │
│   ├── services/          ← 16 files: business logic / rules.
│   ├── repositories/      ← 16 files: all SQL queries (parameterized).
│   ├── jobs/autoExpiry.js ← background worker: cancels unpaid leases after 2h, frees the property.
│   └── utils/             ← ApiError (typed errors), asyncHandler (try/catch wrapper), logger (Pino).
│
├── scripts/
│   ├── etl.js             ← loads the Kaggle CSV into MySQL (npm run seed).
│   ├── dump-seed.js       ← exports the loaded DB to db/seed-data.sql (npm run dump).
│   └── concurrency-test.js← PROVES the row locks work (npm run test:concurrency).
│
├── Dockerfile             ← recipe to build the app into a container image.
├── docker-compose.yml     ← runs app + MySQL together with one command.
├── railway.json           ← tells Railway how to build/deploy.
└── .env / .env.example    ← secrets/config (real .env is gitignored).
```

**The 14 domains** (each has a route + controller + service + repository): `agent, owner, tenant,
property, amenity, inquiry, lease, payment, dashboard, profile, auth, agentPortal, ownerPortal,
tenantPortal`. "Portal" routes are the role-specific dashboards (a tenant paying rent, an agent
creating a lease, etc.).

---

## Server startup lifecycle (`server.js`)

When the container boots and runs `node server.js`:

1. **Load config** (`src/config`) — reads `.env`. If `DB_PASSWORD` or (in prod) `JWT_SECRET` is
   missing, it **crashes immediately** ("fail-fast" — better than running misconfigured).
2. **Build the app** (`src/app.js`) — wires up all middleware + routes (but doesn't listen yet).
3. **Check the DB** (`pool.assertConnection()`) — confirms MySQL is reachable; logs success/failure.
4. **Start the background worker** (`startAutoExpiry()`) — every 5 min, expire stale unpaid leases.
5. **Listen** on the port (`app.listen(3000)`) — now it accepts HTTP requests.

> Interview note: app-building (`app.js`) is split from `app.listen()` (`server.js`) **on purpose**
> — so tests can import the app and hit it without opening a real network port.

---

## What `src/app.js` sets up (in order — order matters!)

Middleware runs top-to-bottom for every request:

1. `httpLogger` — log the request + assign a trace ID.
2. `helmet()` — set security headers.
3. `cors()` + `express.json({limit:'10kb'})` — parse JSON body, cap its size.
4. serve `public/` static frontend.
5. `GET /api/health` — DB ping (used by Docker/Railway healthcheck).
6. `apiLimiter` on `/api` — general rate limit.
7. **Public routes:** `/api/auth` (+ strict `authLimiter`), `/api/properties`, `/api/amenities`.
8. **Protected routes:** everything else, behind `verifyToken` (must have a valid JWT).
9. **Role routes:** `/api/tenant-portal` etc., behind `verifyToken` + `requireRole('tenant')`.
10. SPA fallback → send `index.html`.
11. **`errorHandler` LAST** — every thrown error funnels here and becomes a clean JSON response.

---

## Trace ONE request end-to-end: "Login"

`POST /api/auth/login` with body `{ "email": "...", "password": "..." }`

1. **Route** (`auth.routes.js`): matches `/login` → runs `validators.auth.login` (email valid?
   password present?) → `validate` (if errors, throw 400) → calls `AuthController.login`.
2. **Controller** (`auth.controller.js`): pulls `email, password` from `req.body`, calls
   `AuthService.login(email, password)`, sends the result as JSON.
3. **Service** (`auth.service.js`): the rules — find the user by email (via repository), compare the
   password with the stored **bcrypt** hash, and if it matches, create a signed **JWT** containing
   the user's id/role. If not, throw `ApiError.unauthorized('Invalid email or password')`.
4. **Repository** (`auth.repository.js`): runs the actual `SELECT … FROM USERS WHERE Email = ?`
   (parameterized — the `?` is why it's injection-safe).
5. **Response**: `{ token: "eyJ..." }`. The browser stores it and sends it on future requests as
   `Authorization: Bearer eyJ...`.

## Trace the star request: "Create a lease" (the concurrency one)

`POST /api/leases` → controller → `LeaseService` → `LeaseRepository.createViaProc()` which:
- grabs ONE connection from the pool,
- runs `CALL CreateLeaseTx(...)` then `SELECT @statusCode, @msg, @newLeaseId` on the **same**
  connection (MySQL session vars are per-connection),
- returns `{status, message, leaseId}`. The controller maps `status` (201/409/500) to the HTTP code.

The interesting logic (the row lock) lives **inside** `CreateLeaseTx` in `schema.sql` — that's the
next file. This is the key handoff: **Node just calls the procedure; the database does the locking.**
