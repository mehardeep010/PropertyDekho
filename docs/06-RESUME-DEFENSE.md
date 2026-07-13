# 06 — Résumé Line-by-Line Defense (PropertyDekho)

Interviewers who "discuss your résumé" do three things to each line: **(1) explain this →
(2) why did you build it this way → (3) what would you do if [scale / requirement change /
failure].** So for every phrase below you get: what it means, the **proof in your code** (so it's
true and you can point at it), the likely deep-dive question, and a "what-if" scenario.

Your two bullets:
> **1.** "Architected a full-stack real estate platform with a Node.js/Express REST API for property
> search, lease bookings, and role-based access, backed by a normalized 3NF schema across 14 tables."
>
> **2.** "Handled concurrent traffic with transactional stored procedures using row-level locks
> (FOR UPDATE) and auto-rollbacks for ACID guarantees, plus 7 triggers that block double-booked or
> sold-property leases."

---

# BULLET 1 — phrase by phrase

### "Architected … full-stack platform"
- **Means:** you designed all three tiers — frontend (`public/`, vanilla HTML/CSS/JS), backend
  (Node/Express in `src/`), database (MySQL, `schema.sql`).
- **Proof:** the layered backend — routes → controllers → services → repositories.
- **Q: "What does your architecture look like?"** → "Four layers, each with one job: routes map
  URLs, controllers handle HTTP, services hold business rules, repositories hold all SQL. So all SQL
  lives in one folder — easy to audit for injection, easy to swap the DB."
- **What-if: "Why layers, not one file?"** → "Separation of concerns: I can change a business rule
  without touching SQL or routing, and each layer is testable in isolation."

### "Node.js/Express REST API"
- **Means:** the server is Node (JS on the server) using Express (routing + middleware); it follows
  REST — verbs (GET/POST/PUT/DELETE) on resource URLs, meaningful status codes, JSON.
- **Proof:** ~14 resource groups (`/api/properties`, `/api/leases`, …); `POST /api/leases` → 201 or 409.
- **Q: "What is REST?"** → "A convention where resources are URLs and HTTP verbs express intent; GET
  reads, POST creates, etc., with status codes carrying meaning — 200 ok, 201 created, 400 bad
  input, 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict."

### "property search"  ⚠️ know the honest version
- **Reality:** the API serves the property catalogue (with owner/agent names joined in), and the
  frontend does **real-time filtering by type, location, price range, status, and amenities**
  client-side. Say it exactly like that — don't imply a heavy search engine.
- **Q: "How does search work?"** → "The API returns the listings; the UI filters them in real time
  by type/location/price/status/amenities. It's a client-side filter over the served catalogue."
- **⭐ What-if (they WILL ask): "How would you scale search to millions of properties?"** →
  "I'd move filtering into the database: indexed `WHERE` clauses on Type/Location/Price, add
  pagination (`LIMIT/OFFSET` or keyset), a composite/covering index for common filters, full-text
  search on Title/Location, and for real scale a dedicated search engine like Elasticsearch plus a
  cache (Redis) for hot queries." *(This answer alone shows senior-level thinking.)*

### "lease bookings"
- **Means:** tenants/agents can create a lease on a property — the core transaction.
- **Proof:** `CreateLeaseTx` stored procedure via `POST /api/leases`.
- **Q: "Walk me through booking a lease."** → "Request hits the lease route → controller → service →
  repository calls `CreateLeaseTx`. Inside a transaction it locks the property row `FOR UPDATE`,
  checks it's Available, inserts the lease (a trigger flips the property to Pending), links the
  tenant, and commits — or rolls back and returns 409 if it's already taken."

### "role-based access"
- **Means:** different users (tenant/owner/agent/admin) can only do what their role allows.
- **Proof:** JWT login + `verifyToken` + `requireRole('tenant')` guarding `/api/tenant-portal`, etc.
- **Q: "How do you implement it?"** → "On login I issue a JWT containing the user's role. Protected
  routes run `verifyToken` (valid token? → sets req.user), and role routes add `requireRole` which
  checks req.user.role. 401 means not logged in; 403 means logged in but not allowed."
- **What-if: "Add a new role, say Manager."** → "Add it to the USERS role enum, issue it in the JWT,
  and add `requireRole('manager')` on the relevant routes — no core change, because authorization is
  centralized in one middleware."

### "normalized 3NF schema across 14 tables"
- **Means:** no redundant/derived data; every non-key column depends on the whole key. 14 tables.
- **Proof:** people (AGENT/OWNER/TENANT), catalogue (PROPERTY, AMENITY, PROPERTY_AMENITY), txns
  (LEASE, TENANT_LEASE, PAYMENT, SALE), support (INQUIRY, INQUIRY_AUDIT, CUSTOMER_ANALYSIS, USERS).
- **Q: "Show me a M:N relationship."** → "Property↔Amenity via the `PROPERTY_AMENITY` junction table
  whose PK is the pair of FKs — prevents duplicates. Same for Tenant↔Lease."
- **What-if: "When would you denormalize?"** → "For read-heavy dashboards I might store a derived
  aggregate (e.g. total revenue) to avoid recomputing joins — trading write complexity/consistency
  for read speed. I'd only do it if profiling showed the joins were a bottleneck."

---

# BULLET 2 — phrase by phrase (your strongest bullet)

### "Handled concurrent traffic"
- **Means:** multiple users acting on the same data at the same time — the double-booking risk.
- **Proof:** `scripts/concurrency-test.js` fires 25 parallel lease attempts → exactly 1 wins.
- **Q: "What concurrency problem did you solve?"** → the race condition (full story below).

### "transactional stored procedures"
- **Means:** the multi-step operations run inside SQL stored procedures wrapped in a transaction.
- **Proof:** `CreateLeaseTx`, `CreatePaymentTx` — each `START TRANSACTION … COMMIT`.
- **Q: "Why a stored procedure, not transaction logic in Node?"** → "The whole critical section —
  lock, check, insert, commit — runs in one round-trip on one DB connection, with no network gap
  between taking the lock and committing. It's faster and removes bugs like a pooled connection
  being reused mid-transaction."

### "row-level locks (FOR UPDATE)"
- **Means:** an exclusive lock on the specific property/lease row until commit — a mutex on that row.
- **Proof:** `SELECT Status … WHERE Property_ID=? FOR UPDATE` in `CreateLeaseTx`.
- **Q: "What does FOR UPDATE do exactly?"** → "Takes an exclusive lock on the selected row; any other
  transaction trying to lock the same row blocks until I commit or roll back. Pessimistic locking."
- **What-if: "10,000 people rush the same property (a hot listing)?"** → "They serialize on that one
  row lock — one succeeds, the rest get 409 quickly. The lock is held only for the microseconds of
  the transaction, so throughput stays high. If a single row became a genuine hotspot I'd consider a
  queue or optimistic checks, but correctness is never sacrificed."

### "auto-rollbacks for ACID guarantees"
- **Means:** on any DB error the transaction undoes itself, so data is never left half-written.
- **Proof:** `DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; … END`.
- **Q: "Explain ACID on your lease creation."** → "Atomicity: lease + tenant_lease inserts both
  happen or neither (the handler rolls back). Consistency: constraints + triggers keep status valid.
  Isolation: the FOR UPDATE lock hides half-done work from others; InnoDB default is REPEATABLE
  READ. Durability: after COMMIT it survives a crash via InnoDB's redo log."

### "7 triggers that block double-booked or sold-property leases"  ⚠️ be precise
Don't claim all 7 do the blocking — know exactly which do what (so a follow-up can't rattle you):
- **The guards (these do the "blocking"):** `trg_lease_before_insert` rejects a lease on a **Sold**
  property or one with a **date-overlapping active lease**; `trg_payment_before_insert` rejects
  payments on a **Terminated/Expired** lease. (Both via `SIGNAL SQLSTATE '45000'`.)
- **The status state-machine (3 triggers):** after insert/delete/update on LEASE, they auto-sync
  `PROPERTY.Status` (Rented/Pending/Available) so it always matches the leases.
- **Integrity + audit (2 triggers):** one auto-corrects an inquiry's Agent_ID to the property's real
  agent; one logs inquiry status changes to `INQUIRY_AUDIT`.
- **Q: "Do all 7 block leases?"** → "No — two are guards that reject illegal leases/payments, three
  form a state machine keeping property status consistent, and two handle integrity and audit. Bullet
  refers to the guard triggers for the double-booking/sold guarantee."

---

# The end-to-end flow (say this if asked "how does it all work?")
> "Browser sends an HTTP request → Express routes it, running middleware first (logging, auth,
> validation) → the controller calls a service (business rules) → the service calls a repository
> (SQL) → for critical operations the repository calls a stored procedure that runs a transaction
> with a `FOR UPDATE` lock; triggers fire inside MySQL to keep state consistent → rows come back →
> the controller sends JSON → the browser renders it. Errors anywhere bubble to one central handler
> that maps them to the right HTTP status."

---

# STAR answers (the exact questions from your prep bank)

**"What problems did you face in your project?"** (STAR)
> - **Situation:** properties can be leased by multiple agents through the platform.
> - **Task:** ensure two agents can never lease the same property at the same instant.
> - **Action:** I made lease creation a stored-procedure transaction that takes an exclusive
>   row lock with `SELECT … FOR UPDATE`, re-checks availability under the lock, and rolls back on
>   conflict; I also added a trigger that rejects overlapping/sold leases at the data level.
> - **Result:** zero double-bookings; I proved it with a test firing 25 concurrent requests — exactly
>   one succeeds every time.

**"How did you debug the problems you faced?"** (STAR)
> - **Situation:** during deployment the live app kept failing to connect to the database.
> - **Task:** find why, without much cloud experience.
> - **Action:** I read the deploy logs carefully — the startup banner and the `npm start`/Nixpacks
>   output told me the host was building an *old commit*, not my latest code, and connecting to
>   localhost. I confirmed with `git log` that my code was pushed, then re-pointed the deploy to the
>   correct branch and set explicit DB connection variables.
> - **Result:** the app deployed and connected; it's live with all 1756 listings. I learned to
>   diagnose from logs first instead of guessing.
>
> *(Alternate debugging story: the concurrency test itself — I used it to verify the lock works by
> observing exactly one 201 and N−1 409s under parallel load.)*

---

# Scenario "what-would-you-do-if" bank (rapid-fire)
1. **Millions of properties / slow search** → DB-side indexed WHERE + pagination + full-text/Elastic + cache.
2. **Hot listing, thousands of concurrent lease attempts** → they serialize on the row lock; one wins, rest 409; lock held microseconds. Queue only if a row is a true hotspot.
3. **Add a payment gateway** → keep `CreatePaymentTx` but call the gateway first, record on success; use an idempotency key to avoid double charges.
4. **A lease with multiple tenants (co-tenants)** → already modeled: `TENANT_LEASE` is M:N.
5. **Deadlocks under load** → InnoDB auto-detects & rolls back a victim; my EXIT HANDLER catches it; I lock in a consistent order (property first) to avoid cycles; client can retry.
6. **Reads are slow at scale** → add read replicas + caching (Redis); route reads to replicas, writes to primary.
7. **Schema must change in production** → versioned migrations, backward-compatible steps, no destructive change without a backup.
8. **A trigger becomes a bottleneck** → move that logic into the application/service layer or make it asynchronous; triggers are great for integrity but run synchronously in the write path.
9. **Should you go microservices?** → "Not yet — it's a modular monolith, which is the right call for this scope. I'd split out a service only when a part needs independent scaling or a separate team, to avoid premature distributed-systems complexity." *(Knowing when NOT to is a plus.)*
10. **How do you know it works?** → automated concurrency test + a health endpoint + structured logs with request IDs.

---

# Design trade-offs you chose (defend them confidently)
| Decision | Why | Alternative & when |
|---|---|---|
| Pessimistic locking (`FOR UPDATE`) | Lease conflicts are high-stakes; fail the loser fast | Optimistic (version column) — better for low-contention, read-heavy |
| Logic in stored procedure | Lock+commit in one round-trip, one connection; no network gap | App-level txn — more flexible, but riskier with pooled connections |
| Triggers for integrity | Rules the app can never bypass, enforced at the data | App-level rules — easier to read/test, but bypassable via raw SQL |
| MySQL (relational) | Highly relational data + ACID + FKs | NoSQL — better for unstructured/huge-scale, weaker integrity |
| Modular monolith | Right complexity for the scope; easy to reason about | Microservices — only when independent scaling/teams needed |

---

# Honesty guardrails (protect your credibility)
- **"Property search"** = client-side filtering today; say so, then give the scaling story. Never
  imply an Elastic cluster exists.
- **Team of 3** → own **your** part clearly: "I designed the database — the schema, the 14 tables,
  the 7 triggers, and the transaction/locking logic. That data-and-concurrency layer is mine."
- **If asked something you didn't build** → "That part was a teammate's; my focus was the database
  and concurrency, but here's my understanding of how it fits…" Honest + still competent.
- **Never bluff a term.** If unsure: "I haven't gone deep there, but from fundamentals I'd expect…"
  Interviewers reward reasoning over fake certainty.

**Bottom line:** you built the hard, correct, provable part. Point at it, use precise words, and give
the scaling/failure story for each line. That's a top-tier résumé defense.
