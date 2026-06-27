# 04 — Interview Q&A (Top 30)

Answers are written in first person — read them aloud until they feel natural. Don't memorise
word-for-word; memorise the **shape** of each answer.

---

## A. Project & design (1–6)

**1. Tell me about your project.**
> "PropertyDekho is a real-estate management backend — like the engine behind 99acres. Owners list
> properties, agents manage them, tenants inquire, lease, and pay. It began as my DBMS course
> project where I designed the ER model, a 3NF schema, 7 triggers, and stored procedures with ACID
> transactions. I rebuilt it into a layered Node/Express + MySQL API with JWT auth, validation,
> structured logging, ~1700 real listings from a Kaggle dataset, Docker, and a live Railway deploy.
> My favourite part is the concurrency control that stops two agents leasing the same property."

**2. Why MySQL and not MongoDB?**
> "The data is highly relational — properties, owners, agents, leases, payments all reference each
> other — and I need ACID transactions and foreign-key integrity for money/lease operations. A
> relational DB fits naturally; a document store would push that integrity work into app code."

**3. Walk me through your architecture.**
> "Four layers: routes map URLs, controllers handle HTTP, services hold business rules, repositories
> hold all SQL. Separation of concerns — e.g. all SQL is in one folder, so auditing for injection or
> swapping the DB is localised. Errors funnel to one central handler."

**4. What is 3NF and is your schema in it?**
> "3NF means no partial or transitive dependencies — every non-key attribute depends on the whole
> key and nothing but the key. Yes: e.g. an agent's name lives only in AGENT; PROPERTY just stores
> Agent_ID. No derived or duplicated data, so updates stay consistent."

**5. Explain a many-to-many relationship in your schema.**
> "A property can have many amenities and an amenity belongs to many properties. I resolve that with
> a junction table `PROPERTY_AMENITY` whose primary key is the pair (Property_ID, Amenity_ID) —
> which also prevents duplicate links. `TENANT_LEASE` does the same for tenants and leases."

**6. Why is USERS separate from AGENT/OWNER/TENANT?**
> "Authentication is a separate concern from the business entity. USERS holds credentials + a role +
> a Ref_ID pointing to the actual agent/owner/tenant row. It keeps auth clean and lets any entity
> type log in through one table."

---

## B. Triggers & integrity (7–11)

**7. What is a trigger and why did you use them?**
> "A trigger is SQL that auto-runs on INSERT/UPDATE/DELETE. I used 7 to enforce rules the
> application can never bypass — even raw SQL can't violate them. They keep property status in sync
> with leases and reject illegal operations."

**8. Give an example of a trigger that prevents bad data.**
> "`trg_lease_before_insert` rejects a new lease if the property is Sold or if a date-overlapping
> active lease exists — using `SIGNAL SQLSTATE '45000'` to abort. That single guard prevents
> double-leasing at the data level."

**9. How does property status stay correct automatically?**
> "Triggers 2, 3, 4 form a state machine: inserting an active lease sets the property Rented;
> deleting/terminating the last active lease frees it back to Available. The app never manually
> updates status — the DB does, so it can't drift out of sync."

**10. What's an audit trigger?**
> "`trg_audit_inquiry_status` writes the old/new status to `INQUIRY_AUDIT` whenever an inquiry's
> status changes — an immutable history for accountability."

**11. Trigger vs stored procedure — difference?**
> "A trigger fires *automatically* on a table event and guards single statements. A procedure is
> *called explicitly* and groups multiple statements into one transaction. I use triggers for
> invariants and procedures for multi-step atomic operations like creating a lease."

---

## C. Transactions, locks, concurrency (12–20) — go deep here

**12. What is a transaction? Explain ACID.**
> "A transaction is a group of statements that all commit or all roll back. ACID: Atomicity (all or
> nothing), Consistency (constraints stay valid), Isolation (concurrent txns don't see each other's
> partial work), Durability (committed data survives crashes). In `CreateLeaseTx`, the lease and
> tenant_lease inserts are atomic, and an EXIT HANDLER rolls back on any error."

**13. Your headline scenario: two users book the same flat — what happens?**
> "Classic race condition. Both transactions would read 'Available' and both insert a lease. I
> prevent it with `SELECT … FOR UPDATE` — an exclusive row lock, like a mutex on that property row.
> The first transaction locks it, inserts the lease (a trigger flips the property to Pending), and
> commits. The second blocks on the lock, then re-reads 'Pending' and aborts with a 409. Exactly one
> lease is created."

**14. What does `FOR UPDATE` actually do?**
> "It takes an exclusive lock on the selected rows until the transaction commits or rolls back. Other
> transactions trying to `FOR UPDATE` the same row block and wait. It's pessimistic locking."

**15. Pessimistic vs optimistic locking — which did you use and why?**
> "Pessimistic — lock first, then act — because lease conflicts are high-stakes and I want the loser
> to fail fast. Optimistic locking (a version column checked at commit) suits low-contention,
> read-heavy workloads and avoids holding locks, but can waste work on retry."

**16. What is Two-Phase Locking (2PL)?**
> "A protocol with a growing phase (acquire locks) and a shrinking phase (release them). InnoDB uses
> *strict* 2PL — it holds all locks until COMMIT — which guarantees conflict-serialisable,
> recoverable schedules. That's why the second agent stays blocked until the first commits."

**17. What's a deadlock and how do you handle it?**
> "Two transactions each holding a lock the other needs — a circular wait. InnoDB detects it
> automatically and rolls back one victim with an error. My EXIT HANDLER catches that, rolls back,
> and returns 500 so data is never corrupted. I also lock rows in a consistent order to avoid
> circular waits in the first place."

**18. How does this relate to OS concepts you've studied?**
> "It's the critical-section problem on a database row. `FOR UPDATE` is the mutex; the transaction
> is the critical section; InnoDB's lock manager is the OS scheduler granting/blocking the lock.
> Deadlock's four conditions — mutual exclusion, hold-and-wait, no preemption, circular wait — apply
> directly; InnoDB breaks the cycle by preempting a victim."

**19. What isolation level do you use?**
> "InnoDB's default, REPEATABLE READ — within a transaction, re-reads return the same snapshot, which
> prevents non-repeatable reads. For the lease check I use `FOR UPDATE` to take an explicit lock so
> the decision is made on the current, locked row, not a stale snapshot."

**20. How did you *prove* the locking works?**
> "An automated test, `npm run test:concurrency`. It fires N parallel `CreateLeaseTx` calls — each on
> its own DB connection — at one Available property and asserts exactly 1 success and N−1 conflicts.
> I ran it with 10 and 25 agents: one winner every time, zero races."

---

## D. Backend / Node (21–24)

**21. What is Node.js / Express?**
> "Node lets me run JavaScript on the server. Express is a minimal web framework that maps HTTP
> routes to handler functions and chains middleware. My app is Express over a MySQL connection pool."

**22. What is a connection pool and why use one?**
> "Opening a DB connection per request is slow. A pool keeps a set of reusable connections; requests
> borrow and return them. Important detail: when I call a stored procedure I pin the `CALL` and the
> `SELECT @out_vars` to the *same* pooled connection, because MySQL session variables are
> per-connection."

**23. How do you handle errors?**
> "Every async handler is wrapped so thrown errors flow to one central error-handling middleware. It
> maps typed `ApiError`s and known MySQL errors (duplicate key → 409, trigger SIGNAL → 409) to clean
> HTTP responses, and logs 5xx with full context while returning a generic message to the client."

**24. What's middleware? Give examples from your app.**
> "Functions that run before the route handler in a chain. Mine: httpLogger (trace ID), helmet
> (headers), the JSON body parser, rate limiters, `verifyToken` (auth), `requireRole` (authorization),
> and validators. Order matters — they run top to bottom."

---

## E. Security, Docker, deploy (25–30)

**25. How do you store passwords?**
> "Hashed with bcrypt — one-way and salted, so identical passwords get different hashes and you can't
> reverse them. At login I use bcrypt.compare. The plaintext is never stored or logged."

**26. What is a JWT and why is it secure?**
> "A signed token with a payload (userId, role) and an HMAC signature made with my secret. The client
> can read it but can't forge a valid one without the secret. On each request `verifyToken` checks
> the signature and expiry. 401 if missing/invalid."

**27. Is your app safe from SQL injection?**
> "Yes — every query is parameterized with `?` placeholders, so user input is data, never executable
> SQL. The only place I build SQL with a string is a whitelisted column name in one repository,
> never from user input. Because all SQL lives in the repositories folder, it's easy to audit."

**28. Why Docker?**
> "It packages the app + exact runtime + dependencies into one portable image so it runs identically
> on my machine, a teammate's, and the cloud — no 'works on my machine'. My docker-compose brings up
> the app and MySQL together, with the DB auto-seeded and a healthcheck."

**29. How is it deployed?**
> "On Railway, which builds my Dockerfile from the GitHub main branch and runs the container against
> a managed MySQL. I picked Railway because it offers free MySQL — Render's free tier is Postgres
> only, and my app relies on MySQL stored procedures and triggers. It's live with all 1756 listings."

**30. What would you improve / add next?**
> "Automated integration tests with Jest + supertest, an OpenAPI/Swagger spec and an ER diagram in
> the README, optimistic-locking benchmarks, a notification service on lease/payment events (the
> event hooks are already clean for it), and frontend polish. I deliberately kept the frontend
> minimal to focus on backend depth."

---

### Final tips for the day
- **Lead with the concurrency story** — it's your differentiator. Steer "tell me about your project"
  toward it.
- If you don't know something, say **"I haven't gone deep there, but my understanding is…"** and
  reason from fundamentals. Interviewers reward honest reasoning over bluffing.
- Keep `schema.sql` and `02-DATABASE-AND-CONCURRENCY.md` open while practising — point at real code.
- You designed the hard part. Own it: **"I designed the schema, the triggers, and the transaction
  logic myself."**
