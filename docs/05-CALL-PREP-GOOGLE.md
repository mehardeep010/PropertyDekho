# 05 — Google Initial Discussion · Call Prep (15 min)

**What this call is:** a recruiter/screening chat ("understand your interest and candidature") — NOT
a coding round. They're checking: can you communicate clearly, are you genuinely interested, and is
your résumé real (can you talk about your projects?). So: **be warm, be clear, sound excited.** You
don't need to derive algorithms; you need to *tell good stories about your own work.*

**Mindset:** you are not begging for a chance — you're a Codeforces Specialist, IIIT-Delhi CS,
PwC + IIT-Delhi intern who shipped a live, concurrency-safe backend. Walk in as a builder sharing
cool work.

---

## 1. The intro — "Tell me about yourself" (your opening 45 seconds)

### Hook lines (pick the one that feels like *you* — say it first, with a smile)
- **(Recommended)** "Hi! I'm Mehardeep — I'm the kind of engineer who gets genuinely excited when a
  system stays *correct* even while a thousand things happen at once."
- "Hi, I'm Mehardeep — I love the backend, the part users never see but that has to never break."
- "Hi! I'm Mehardeep — I do competitive programming for the thrill, and systems engineering for the
  satisfaction of building something that actually holds up."

### Full script (≈45–55 sec — structure: who → what drives me → proof → why here)
> "Hi, I'm Mehardeep, a second-year CS undergrad at IIIT-Delhi. What really drives me is the
> systems and backend side of computing — making things that stay correct and fast under pressure.
> A good example is PropertyDekho, a real-estate platform where I designed the database and the
> concurrency control so two agents can never lease the same property at the same time — I used
> row-level locks and ACID transactions, and wrote a test that fires 25 requests at once to prove
> exactly one wins. Alongside that I love competitive programming — I'm a Specialist on Codeforces
> with 900+ problems solved — and I've interned at IIT-Delhi on a computer-vision pipeline and I'm
> currently at PwC working on distributed backend services. I'm really excited about Google because
> it's where systems run at a scale where correctness and concurrency genuinely matter — exactly the
> problems I enjoy."

### Ultra-short version (if they say "quickly introduce yourself" — ~20 sec)
> "I'm Mehardeep, second-year CS at IIIT-Delhi. I love backend and systems engineering — I built a
> concurrency-safe real-estate platform with ACID transactions and row-level locking — and I'm a
> Codeforces Specialist who's interned at IIT-Delhi and PwC. I'm excited about Google for the scale
> of systems problems."

**Delivery tips:** smile (it's audible), slow down, land the first line, then breathe. End on
enthusiasm for Google — recruiters screen for *interest* as much as skill.

---

## 2. "Why Google?" (have 2 honest reasons ready)
> "Two reasons. First, scale — Google runs systems where the concurrency, consistency, and
> reliability problems I find fun aren't edge cases, they're the whole job. Second, the engineering
> culture and mentorship; as a second-year I'd learn an enormous amount from how Google builds and
> tests software at that scale."

---

## 3. The PropertyDekho story (your 90-second project pitch)
Lead with this if they say "tell me about a project." (Full depth is in docs 01–04.)

> "PropertyDekho is a real-estate management backend — think the engine behind 99acres. Owners list
> properties, agents manage them, tenants inquire, lease, and pay. It started as my DBMS course
> project — I designed the ER model, a normalized 3NF schema across 14 tables, 7 triggers, and
> stored procedures with ACID transactions. The core challenge was concurrency: if two agents try to
> lease the same property simultaneously, you can double-book it. I solved that with pessimistic
> row-level locking — `SELECT … FOR UPDATE` inside a transaction, which is basically a mutex on that
> property row — so the second agent blocks, re-reads the now-pending status, and gets a clean
> conflict instead of a double booking. I later rebuilt it into a layered Node/Express API with JWT
> auth, loaded ~1700 real listings from a Kaggle dataset, containerized it with Docker, and deployed
> it live on Railway."

**If they go deeper, you have docs 02 + 04. If they don't, you've already shown the highlight.**

---

## 4. Your résumé tech stack — be confident on EACH (what · how you used it · example · hardest part)

These are the skills on your résumé that this project demonstrates. Know one solid line for each.

### JavaScript
- **What:** the language the entire backend is written in (runs on Node.js, not the browser).
- **In project:** all API logic, the layered controllers/services/repositories.
- **Example:** the login handler reads the request, checks the bcrypt hash, signs a JWT.
- **Hardest part:** async/await everywhere — DB calls are asynchronous, so I had to reason about
  promises and make sure errors propagate to one central handler instead of crashing the server.

### Node.js
- **What:** a runtime that lets JavaScript run on a server; event-driven, non-blocking I/O.
- **In project:** the whole API server; a background worker that expires unpaid leases every 5 min.
- **Example:** Node handles many requests on one thread because DB/network waits are non-blocking.
- **Hardest part:** understanding the single-threaded event loop — why a slow synchronous operation
  would block *everyone*, so DB work must stay asynchronous. (Ties to OS: cooperative scheduling.)

### Express.js
- **What:** a minimal web framework for Node — maps HTTP routes to functions and chains middleware.
- **In project:** all routing + middleware (auth, validation, rate-limiting, logging, error handler).
- **Example:** `app.use('/api/tenant-portal', verifyToken, requireRole('tenant'), routes)` — auth
  and role checks run *before* the handler.
- **Hardest part:** middleware ordering — e.g. the body parser must run before validators; the error
  handler must be last so every thrown error funnels into it.

### REST APIs
- **What:** an API convention — GET reads, POST creates, PUT updates, DELETE deletes; resources as
  URLs; meaningful status codes.
- **In project:** ~14 resource groups (`/api/properties`, `/api/leases`, …) returning JSON.
- **Example:** `POST /api/leases` → 201 created, or 409 if the property's already taken.
- **Hardest part:** designing clean status-code semantics — mapping a database trigger's rejection or
  a lock conflict to the right HTTP code (409 Conflict, 403 Forbidden, 400 Bad Request).

### MySQL / SQL  ← **your strongest area; steer here**
- **What:** the relational database; SQL is the query language.
- **In project:** 3NF schema, 14 tables, foreign keys, CHECK constraints, ENUMs, **7 triggers**, and
  **2 stored procedures** with transactions + row locks.
- **Example:** `CreateLeaseTx` runs `START TRANSACTION → SELECT … FOR UPDATE → INSERT → COMMIT`,
  with an auto-rollback handler on any error.
- **Problem scope:** keep property status consistent with leases, prevent double-booking, prevent
  payments on dead leases — all enforced in the DB so the app can't bypass it.
- **Hardest part:** the concurrency design — choosing pessimistic locking, getting the lock + commit
  inside one procedure on one connection, and reasoning about 2PL/deadlocks (InnoDB auto-detects a
  deadlock and rolls back a victim; my handler catches it).

### Git
- **What:** version control.
- **In project:** I rebuilt the project over many small, descriptive commits (one per concern:
  security, logging, data, Docker, deploy), on a feature branch merged into main.
- **Hardest part:** a real-world one — during deploy, the host kept building an old commit; I used
  `git log`/branch inspection to confirm my latest code was pushed and re-pointed the deploy.

### DBMS (coursework → shown in project)
- **What:** the theory — normalization, transactions, ACID, indexing, concurrency control.
- **In project:** literally the foundation — 3NF, triggers, transactions, isolation, locking.
- **Talking point:** "My DBMS course is where the project's design came from — I applied
  normalization and transaction theory directly."

### Operating Systems (coursework → connects to the project + NexusShell)
- **What:** processes/threads, synchronization (mutex, semaphores), scheduling, deadlocks, paging.
- **Connection:** `SELECT … FOR UPDATE` is a **mutex on a DB row**; the lease transaction is a
  **critical section**; InnoDB's lock manager is like the **OS scheduler** granting/blocking locks;
  deadlock's four conditions apply directly. (And your NexusShell project literally built a
  Round-Robin scheduler + mutex/condition-variable key–value store — same concepts, lower level.)
- **Why this is gold:** you can connect database concurrency to OS theory — that's the kind of
  cross-layer understanding that impresses.

### (Mention if relevant) C++ / Python / Java + Competitive Programming
- **C++:** your competitive-programming language (Codeforces Specialist, 900+ problems) — strong DSA.
- **Python:** the IIT-Delhi CV pipeline (OpenCV) + the Kaggle ETL script in this project.
- **Java:** coursework/OOP.
- **One line:** "C++ is my CP language for DSA; Python I use for ML/data work like the computer-vision
  pipeline and this project's data-loading script."

---

## 5. Likely questions for THIS call (+ one-line answers)
- **"Walk me through your résumé."** → 60-sec arc: school → what excites you (backend/systems + CP)
  → PropertyDekho highlight → IIT-Delhi/PwC → enthusiasm for Google.
- **"What's your favourite project and why?"** → PropertyDekho, because the concurrency problem was
  a real intellectual challenge and I can *prove* my solution works.
- **"What was the hardest bug/challenge?"** → the double-booking race condition; solved with
  pessimistic row locking inside a stored procedure. (Or the deploy-stuck-on-old-commit debugging.)
- **"What are you most proud of?"** → designing the DB + concurrency myself, and that it's live.
- **"Strengths?"** → systems thinking + persistence (I debugged a deploy for a full day until live).
- **"Weakness?"** → "I used to over-focus on backend depth and under-invest in frontend; I'm
  consciously broadening." (honest, improvable, not fatal).
- **"Are you comfortable with data structures/algorithms?"** → yes — Codeforces Specialist, 900+
  problems, taught 300+ students DSA at Coding Blocks.
- **"When can you intern / availability?"** → know your Summer 2027 availability and say it plainly.

## 6. Smart questions to ask THEM (always have 2 — shows interest)
- "What does the internship interview process look like after this, and how should I best prepare?"
- "What kinds of teams or problems do SWE interns typically work on?"
- "What does a great intern do in the first month?"

## 7. Delivery checklist (the 2 minutes before the call)
- Quiet room, stable internet, earphones, water nearby. Test the Google Meet link beforehand.
- Résumé open + this file + `02-DATABASE-AND-CONCURRENCY.md` open in tabs.
- Smile, slightly slower than feels natural, and **let the first line land.**
- It's 15 minutes and friendly. You've done the hard work — tomorrow you just *talk about it.*

**You've got this. 🟢**
