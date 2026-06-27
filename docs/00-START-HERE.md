# 📚 PropertyDekho — Interview Study Pack (START HERE)

You built the brain of this project (the ER model, tables, triggers, ACID logic). The rest is
plumbing that wraps your database. This pack makes **every layer explainable** so you can defend
the project with confidence. Read in this order:

1. **00-START-HERE.md** ← you are here (the pitch, the mental model, jargon demystified)
2. **01-ARCHITECTURE.md** — what each folder/file does + one request traced end-to-end
3. **02-DATABASE-AND-CONCURRENCY.md** — every table, all 7 triggers, both procedures, and the
   locks/2PL/deadlock/rollback story (this is your strongest material — the "two users book the
   same flat" scenario interviewers love)
4. **03-SECURITY-DOCKER-DEPLOY.md** — JWT, bcrypt, validation, SQL-injection, Docker, Railway
5. **04-INTERVIEW-QA.md** — 30 likely questions with crisp answers

---

## The 60-second pitch (memorise this)

> "PropertyDekho is a real-estate management system — like a backend for 99acres/MagicBricks.
> Owners list properties, agents manage them, tenants inquire, lease, and pay. It started as my
> DBMS course project where I designed the ER model, a 3NF schema, 7 triggers, and stored
> procedures with ACID transactions. I then rebuilt it into a production-style backend: a layered
> Node/Express API over MySQL, secured with JWT + validation, with structured logging, real data
> from a Kaggle dataset of ~1700 listings across 7 Indian cities, Docker for containerisation, and
> it's deployed live on Railway. The part I'm proudest of is the concurrency control — I use
> `SELECT … FOR UPDATE` row locks inside stored procedures so two agents can't lease the same
> property at the same time, and I have an automated test that proves it."

That paragraph alone answers "tell me about your project" and seeds 10 follow-up questions you can control.

---

## The mental model (how a web app actually works)

When you open `propertydekho.up.railway.app` in a browser:

```
BROWSER (frontend: HTML/CSS/JS in public/)
   │  sends an HTTP request, e.g.  POST /api/auth/login  with {email, password}
   ▼
NODE/EXPRESS SERVER (your backend, the src/ folder)
   │  routes the URL → runs your logic → talks to the database
   ▼
MySQL DATABASE (schema.sql: tables, triggers, procedures)
   │  returns rows
   ▼
SERVER sends back JSON  →  BROWSER shows it on screen
```

- **Frontend** = what the user sees (we left it as plain HTML/CSS/JS on purpose).
- **Backend** = the rules + database access. This is Node.js running `Express` (a web framework).
- **Node.js** = lets you run JavaScript *outside* the browser, on a server. That's all it is.
- **`.js` files** = your backend code. **Express** = the library that maps URLs to functions.
- **The database** = MySQL, exactly the DBMS you already know. Your SQL skills apply directly.

**Key reassurance:** ~70% of the "impressive" part of this project lives in `schema.sql` and the
two stored procedures — which are pure SQL/DBMS, your home turf. The Node layer is mostly "receive
request → call a function → return JSON."

---

## Scary words, demystified (one line each)

| Word | What it actually means here |
|---|---|
| **API** | URLs your frontend calls to get/save data (e.g. `/api/properties`). |
| **Endpoint / route** | One such URL + method (e.g. `GET /api/properties/5`). |
| **REST** | A convention: GET=read, POST=create, PUT=update, DELETE=delete. |
| **JWT** | A signed token the server gives you at login; you send it back to prove who you are. |
| **bcrypt** | One-way password hashing — we store the hash, never the real password. |
| **Middleware** | A function that runs *before* your route (e.g. "check the token first"). |
| **Connection pool** | A reusable set of DB connections so we don't open/close one per request. |
| **Stored procedure** | A function that lives *inside* MySQL, written in SQL. |
| **Trigger** | SQL code that auto-runs on INSERT/UPDATE/DELETE to enforce rules. |
| **Transaction** | A group of SQL statements that all succeed or all roll back (ACID). |
| **`FOR UPDATE`** | A row lock — "nobody else touch this row until I commit." |
| **2PL** | Two-Phase Locking — acquire locks, then release them all at commit (what MySQL does). |
| **Deadlock** | Two transactions each waiting for a lock the other holds; DB kills one. |
| **Docker** | Packages the app + its environment into one portable "container." |
| **Container** | A lightweight, isolated box that runs your app the same everywhere. |
| **CI/CD / deploy** | Getting the code running on a public server (we used Railway). |
| **Rate limiting** | Capping how many requests one client can make (anti brute-force). |

Don't try to learn all of these abstractly — each one is explained **in context, on your own code**,
in the next files. That's the trick to making it stick.
