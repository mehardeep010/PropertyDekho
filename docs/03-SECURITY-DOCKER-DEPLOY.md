# 03 — Security, Docker & Deployment (plain English)

## Part A — Authentication & Authorization

**Authentication = "who are you?" · Authorization = "what are you allowed to do?"**

### Login flow (bcrypt + JWT)
1. At **registration**, the password is hashed with **bcrypt** and only the hash is stored in
   `USERS.Password`. bcrypt is **one-way** — you can't reverse a hash to get the password. It's also
   **salted** (random data added) so two identical passwords produce different hashes, defeating
   rainbow-table attacks.
2. At **login**, we `bcrypt.compare(entered, storedHash)`. If it matches, we issue a **JWT**.
3. A **JWT** (JSON Web Token) is three Base64 parts: header.payload.signature. The payload holds
   `{ userId, role }`. The **signature** is an HMAC made with our secret `JWT_SECRET`. The client
   can read the payload but **cannot forge** a valid token without the secret.
4. On every protected request the client sends `Authorization: Bearer <token>`. Our
   **`verifyToken`** middleware checks the signature + expiry and attaches `req.user`. No valid
   token → **401 Unauthorized**.

### Role-based access (authorization)
`requireRole('tenant')` middleware reads `req.user.role` and blocks anyone who isn't a tenant with
**403 Forbidden**. That's how `/api/tenant-portal/*` is locked to tenants, agent-portal to agents, etc.

> Interview line: "Authentication is JWT + bcrypt; authorization is role middleware. 401 = not
> logged in, 403 = logged in but not allowed."

---

## Part B — Defensive layers (the other security work)

1. **Input validation** (`express-validator` in `validators/` + `validate` middleware): every write
   route checks types/ranges/required fields and rejects bad input with a **400** *before* it
   reaches the database. Stops garbage data and malformed payloads.
2. **SQL-injection safety:** every query uses **parameterized placeholders** (`?`) — user input is
   sent separately from the SQL text, so it can never be executed as code. The only string
   interpolation in the whole repo is a **whitelisted** table/column name in `profile.repository`
   (never user input). *That's why the layered design helps — all SQL is in one folder to audit.*
3. **helmet:** sets protective HTTP headers (anti-clickjacking, etc.).
4. **Rate limiting** (`express-rate-limit`): `/api/auth` has a strict cap (brute-force / password
   guessing defence); `/api` has a general cap (abuse/DoS defence).
5. **Body-size limit:** `express.json({ limit: '10kb' })` blocks huge-payload DoS.
6. **Fail-fast config:** the app refuses to start in production with a default/blank `JWT_SECRET`.
7. **Secrets in `.env`** (gitignored) — never committed. `.env.example` shows the shape only.

---

## Part C — Docker (containerisation)

**Problem it solves:** "works on my machine" — different Node versions, missing MySQL, OS
differences. A **container** packages the app + exact runtime + dependencies into one portable image
that runs identically anywhere.

### `Dockerfile` (recipe to build the app image) — key choices
- **`node:22-alpine`** base — Alpine is a tiny Linux, keeps the image small.
- **Multi-stage build:** stage 1 installs dependencies (cached); stage 2 copies them + the source.
  Smaller final image, faster rebuilds.
- **`npm ci --omit=dev`** — installs only production dependencies (no dev tools in prod).
- **`USER node`** — runs as a non-root user (if the app is compromised, damage is limited).
- **`HEALTHCHECK`** — Docker periodically hits `/api/health`; marks the container unhealthy if the
  DB is down.

### `docker-compose.yml` (run app + DB together)
- Defines two **services**: `db` (MySQL 8) and `app` (built from the Dockerfile).
- MySQL **auto-loads** `schema.sql` + `db/seed-data.sql` on first boot (via `initdb.d`).
- `app` **waits for** `db: service_healthy` before starting (no race on startup).
- One command — `docker compose up --build` — brings the whole stack up. Verified: 1756 properties.

**Analogy:** the Dockerfile is a *recipe*; the image is the *cooked dish*; a container is a *served
plate*; docker-compose is the *menu* that serves the app + database plates together.

---

## Part D — Deployment (Railway)

**Deployment = running your code on a public server so anyone can use it.**

- We chose **Railway** because it offers managed **MySQL** on a free tier (Render's free tier is
  Postgres-only, and our app is MySQL-native — stored procedures, triggers, `FOR UPDATE`).
- Railway watches the **GitHub `main` branch**, builds the **Dockerfile**, and runs the container.
- A managed **MySQL service** holds the data; the app connects via env vars (`DB_HOST`, `DB_PORT`,
  …). We added `DB_PORT` support because cloud MySQL isn't on the default 3306.
- We seeded the live DB once (`schema.sql` + `db/seed-data.sql`).
- `/api/health` is the healthcheck Railway uses to know the app is alive.
- **Live:** `https://propertydekho.up.railway.app/`

> Honest talking point if asked about the deploy struggle: "The trickiest bug was Railway initially
> building an old commit and connecting to localhost; I diagnosed it from the logs — the banner and
> Nixpacks output proved it wasn't my Dockerfile — and fixed it by re-pointing the service to the
> correct branch and using explicit DB connection variables." (Real debugging = a *plus*.)

---

## Part E — Observability (logging)

- **Pino** structured logger: JSON logs in production (machine-parseable for tools like CloudWatch),
  pretty colored logs in dev.
- **`httpLogger`** assigns every request a **trace ID** (`X-Request-Id`) echoed in the response, so
  you can follow one request across all its log lines. 4xx→warn, 5xx→error; auth headers redacted.
- Why it matters: "in production you can't `console.log` and read a terminal — you need structured,
  searchable, correlated logs."
