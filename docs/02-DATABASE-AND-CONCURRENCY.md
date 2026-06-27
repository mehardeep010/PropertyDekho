# 02 — Database, Triggers, Procedures & Concurrency
**This is your strongest material. Know it cold.**

---

## Part A — The tables (13 of them)

Think of them in groups:

**People:** `AGENT`, `OWNER`, `TENANT` — each has a unique Phone/Email.
**Catalogue:** `PROPERTY` (the listing), `AMENITY`, `PROPERTY_AMENITY` (many-to-many bridge).
**Transactions:** `LEASE` (rental agreement), `TENANT_LEASE` (which tenant on which lease — M:N),
`PAYMENT`, `SALE` (outright purchase).
**Support:** `INQUIRY` (tenant asks about a property), `INQUIRY_AUDIT` (history of inquiry status
changes), `CUSTOMER_ANALYSIS` (flags high-value tenants), `USERS` (login accounts).

### Design decisions you should be able to defend
- **3NF (normalised):** no repeating/derived data. E.g. an agent's name lives only in `AGENT`;
  `PROPERTY` references it by `Agent_ID`. Update once, consistent everywhere.
- **`PROPERTY_AMENITY` & `TENANT_LEASE` are junction tables** resolving **many-to-many**
  relationships (a property has many amenities; an amenity belongs to many properties). Their
  primary key is the *pair* of foreign keys — prevents duplicates.
- **`USERS` is separate from AGENT/OWNER/TENANT** by design: login/auth is a different concern from
  the business entity. `USERS.Role` + `USERS.Ref_ID` point to the right business row.
- **CHECK constraints** enforce validity *at the DB level* (defence in depth): `Price > 0`,
  `Commission_Rate BETWEEN 0 AND 25`, `End_Date > Start_Date`, status values restricted to a set.
- **ENUMs** for `Lease_Status`, `Payment_Type`, `Sale_Status` — only legal values can be stored.
- **Foreign keys with `ON DELETE RESTRICT`**: you can't delete an owner who still has properties
  (protects referential integrity). Junction tables use `ON DELETE CASCADE` (delete the property →
  its amenity links vanish automatically).

### The status lifecycle (the heart of the domain)
- **PROPERTY.Status:** `Available → Pending → Rented → (back to Available)` or `→ Sold`.
- **LEASE.Lease_Status:** `Pending_Payment → Active → Terminated/Expired`.
- These two are kept **in sync automatically by triggers** (next section). That's the elegant part:
  the application never has to remember to update property status — the database does it.

---

## Part B — The 7 triggers (what each does & WHY)

A **trigger** is SQL that auto-fires on INSERT/UPDATE/DELETE. You used them to enforce rules the
application can never bypass — even someone using raw SQL can't break the invariants.

| # | Trigger | Fires on | Purpose |
|---|---|---|---|
| 1 | `trg_lease_before_insert` | BEFORE INSERT LEASE | **Reject** a lease if the property is `Sold`, or if a **date-overlapping** active lease already exists. |
| 2 | `trg_lease_after_insert` | AFTER INSERT LEASE | Auto-set PROPERTY → `Rented` (if lease Active) or `Pending` (if Pending_Payment). |
| 3 | `trg_lease_after_delete` | AFTER DELETE LEASE | If no active leases remain (and not Sold), free the property → `Available`. |
| 4 | `trg_lease_after_update` | AFTER UPDATE LEASE | On Terminate/Expire → free property if no other active lease. On Pending→Active → set `Rented`. |
| 5 | `trg_payment_before_insert` | BEFORE INSERT PAYMENT | **Reject** a payment if its lease is missing/Terminated/Expired. |
| 6 | `trg_inquiry_before_insert` | BEFORE INSERT INQUIRY | Auto-correct the inquiry's `Agent_ID` to the property's real agent (data integrity). |
| 7 | `trg_audit_inquiry_status` | AFTER UPDATE INQUIRY | If status changed, write a row to `INQUIRY_AUDIT` (audit trail). |

**How a trigger rejects something:** `SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '...'` — this
throws a SQL error that aborts the statement. Our Node error handler maps that to HTTP **409 Conflict**.

**The pattern to articulate:** "Triggers 2, 3, 4 form a state machine that keeps `PROPERTY.Status`
consistent with the leases on it, with zero application code. Triggers 1 and 5 are *guards* that
reject illegal operations. Trigger 7 is an *audit log*. Trigger 6 *auto-corrects* data."

---

## Part C — The 2 stored procedures (ACID transactions + locks)

Triggers guard single statements. But "create a lease" is **multiple** statements that must be
atomic AND safe under concurrency. That's what the **stored procedures** do.

### `CreateLeaseTx` — the showpiece

```sql
START TRANSACTION;
  SELECT Status INTO v_prop_status FROM PROPERTY
   WHERE Property_ID = p_Property_ID
   FOR UPDATE;                         -- ← EXCLUSIVE ROW LOCK

  IF v_prop_status IN ('Sold','Rented','Pending') THEN
      ROLLBACK;  SET status=409;       -- conflict, abort cleanly
  ELSE
      INSERT INTO LEASE (...);         -- trigger fires → PROPERTY becomes 'Pending'
      INSERT INTO TENANT_LEASE (...);
      COMMIT;    SET status=201;
  END IF;
```

Plus an **`EXIT HANDLER FOR SQLEXCEPTION`** that does `ROLLBACK` + returns 500 on *any* DB error —
so the transaction can never be left half-done.

### `CreatePaymentTx`
Same skeleton, but locks the **LEASE** row `FOR UPDATE`, rejects payment on a Terminated/Expired
lease, inserts the payment, and — neat touch — if it's the **Security_Deposit on a Pending lease**,
it flips the lease to `Active` (which, via trigger 4, flips the property to `Rented`). One payment
cascades the whole state machine.

---

## Part D — Concurrency, locks, 2PL, deadlocks, rollback (mapped to YOUR code)

This is the part that connects your **OS theory** (mutex/semaphore/locks) to this project. Memorise
the scenario below — it's the question they'll dig into.

### The problem (the "99acres double-booking" race condition)
Property #50 is `Available`. **Two agents click "Create Lease" at the exact same millisecond.**
Without protection, both transactions read `Available`, both think it's free, both insert a lease →
**the same flat is leased twice.** This is a classic **race condition** (your OS critical-section
problem, but on a database row).

### Your solution: pessimistic locking with `SELECT … FOR UPDATE`
`FOR UPDATE` places an **exclusive lock** on the property row. It is the **database equivalent of a
mutex** around a critical section:

```
Agent A: START TRANSACTION → SELECT ... FOR UPDATE  (acquires lock on row #50)
Agent B: START TRANSACTION → SELECT ... FOR UPDATE  (BLOCKS — waits for A's lock)
Agent A: sees 'Available' → INSERT lease → (trigger sets #50 = 'Pending') → COMMIT (releases lock)
Agent B: NOW unblocks → re-reads #50 → sees 'Pending' → ROLLBACK → returns 409 Conflict
```

**Result: exactly ONE lease is created, the second agent gets a clean 409.** No double-booking.
You can demonstrate this live: `npm run test:concurrency` fires 25 parallel attempts → exactly
1 success + 24 conflicts, every time.

### ACID — define each on this example
- **Atomicity:** the lease INSERT + tenant_lease INSERT both happen, or neither (ROLLBACK). The
  `EXIT HANDLER` guarantees it.
- **Consistency:** constraints + triggers keep the DB in a valid state (property status always
  matches its leases; no overlapping leases).
- **Isolation:** the `FOR UPDATE` lock means concurrent transactions don't see each other's
  half-done work. MySQL/InnoDB default isolation level is **REPEATABLE READ**.
- **Durability:** once `COMMIT` returns, the data survives a crash (InnoDB writes to disk + redo log).

### 2PL (Two-Phase Locking) — how MySVL guarantees serialisability
InnoDB uses **strict 2PL**: a transaction **acquires** locks during its work (growing phase) and
**releases them all at COMMIT/ROLLBACK** (shrinking phase happens at the end). That's why Agent B
stays blocked until Agent A *commits* — the lock isn't released early. Strict 2PL → conflict
serialisable, recoverable schedules.

### Deadlocks — what they are & how this is handled
A **deadlock** = T1 holds lock on row X waiting for row Y, while T2 holds Y waiting for X — circular
wait (your OS deadlock conditions: mutual exclusion, hold-and-wait, no preemption, circular wait).
- InnoDB has an **automatic deadlock detector**: it picks a victim, rolls it back with an error.
- Our `EXIT HANDLER FOR SQLEXCEPTION` catches that, does `ROLLBACK`, returns 500 — so a deadlock
  never corrupts data; worst case the client retries.
- We also *reduce* deadlock risk by **always locking the property row first** (consistent lock
  ordering avoids circular waits).

### Pessimistic vs optimistic (good thing to mention)
We chose **pessimistic** locking (`FOR UPDATE`) — lock first, then act — because lease conflicts are
high-stakes and we want the loser to fail fast. The alternative, **optimistic** (a version column,
check-at-commit), is better for low-contention/high-read workloads. Knowing the trade-off shows depth.

### Why a STORED PROCEDURE (not Node) holds the transaction
Keeping `START TRANSACTION … FOR UPDATE … COMMIT` inside one procedure means the **entire critical
section runs in a single round-trip on a single connection**, with no network gap between the lock
and the commit. It's faster and removes a class of bugs (e.g. the connection returning to the pool
mid-transaction). In Node we just `CALL` it.

---

### One-paragraph answer to "explain concurrency in your project"
> "When two agents try to lease the same property simultaneously, that's a race condition. I handle
> it with pessimistic locking inside a stored procedure: `SELECT … FOR UPDATE` takes an exclusive
> row lock — like a mutex on that property. InnoDB's strict two-phase locking holds that lock until
> COMMIT, so the second transaction blocks, then re-reads the now-`Pending` status and aborts with a
> 409. It's fully ACID — an EXIT HANDLER rolls back on any error, including InnoDB's automatic
> deadlock victim. I have a load test that fires 25 concurrent requests and proves exactly one
> succeeds."
