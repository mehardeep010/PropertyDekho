// KYA KAR RAHA HAI: Saabit karta hai ki SELECT ... FOR UPDATE row lock "double-booking" rokta hai.
// KAISE: ek hi Available property pe N agents ek saath (parallel) lease banane ki koshish karte hain.
// Sahi behaviour: SIRF 1 ko 201 (success) milna chahiye, baaki sabko 409 (conflict). Agar lock
// na hota toh 2+ leases ban jaate (race condition) — wahi interview me dikhane wali baat hai.
//
// Chalane ka tareeka:  node scripts/concurrency-test.js   (ya CONCURRENCY=20 node scripts/concurrency-test.js)
//
// NOTE: Yahan apna alag pool banate hain (connectionLimit >= CONCURRENCY) taaki saari calls sach me
// ek saath connection le sakein aur DB ke row lock pe contend karein — pool ki queue pe nahi.

const mysql = require('mysql2/promise');
const config = require('../src/config');

const CONCURRENCY = parseInt(process.env.CONCURRENCY, 10) || 10;

// Ek call = ek dedicated connection pe CALL + uske @out vars padhna (vars per-connection hote hain).
async function attemptLease(pool, propertyId, agentLabel) {
  const conn = await pool.getConnection();
  try {
    await conn.query(
      'CALL CreateLeaseTx(?, ?, ?, ?, ?, ?, @s, @m, @id)',
      ['2026-01-01', '2026-12-31', 25000, 50000, propertyId, null]);
    const [[out]] = await conn.query('SELECT @s AS status, @m AS message, @id AS leaseId');
    return { agent: agentLabel, status: out.status, leaseId: out.leaseId, message: out.message };
  } finally {
    conn.release();
  }
}

async function main() {
  const pool = mysql.createPool({
    host: config.db.host, user: config.db.user, password: config.db.password,
    database: config.db.database, waitForConnections: true,
    connectionLimit: CONCURRENCY + 5, queueLimit: 0,
  });

  try {
    // SETUP: ek aisi property chuno jiske paas koi lease/sale nahi (clean target). Use Available banao.
    const [[prop]] = await pool.query(`
      SELECT p.Property_ID FROM PROPERTY p
      LEFT JOIN LEASE l ON l.Property_ID = p.Property_ID
      LEFT JOIN SALE  s ON s.Property_ID = p.Property_ID
      WHERE l.Lease_ID IS NULL AND s.Sale_ID IS NULL
      LIMIT 1`);
    if (!prop) throw new Error('Koi clean property nahi mili. Pehle `npm run seed` chalao.');
    const propertyId = prop.Property_ID;
    await pool.query("UPDATE PROPERTY SET Status='Available' WHERE Property_ID=?", [propertyId]);

    console.log(`\n[LOCK TEST] Property #${propertyId} pe ${CONCURRENCY} agents ek saath lease maar rahe hain...\n`);

    // RUN: saari calls ek saath (Promise.all). DB ka FOR UPDATE inhe serialize karega.
    const t0 = Date.now();
    const results = await Promise.all(
      Array.from({ length: CONCURRENCY }, (_, i) => attemptLease(pool, propertyId, `agent-${i + 1}`)));
    const ms = Date.now() - t0;

    const success = results.filter((r) => Number(r.status) === 201);
    const conflict = results.filter((r) => Number(r.status) === 409);
    const other = results.filter((r) => ![201, 409].includes(Number(r.status)));

    for (const r of results.sort((a, b) => a.status - b.status)) {
      const tag = Number(r.status) === 201 ? '✓ WON ' : Number(r.status) === 409 ? '· lost' : '! ERR ';
      console.log(`  ${tag} ${r.agent.padEnd(9)} -> ${r.status}  ${r.message}`);
    }

    console.log(`\n  Time: ${ms}ms  |  success=${success.length}  conflict=${conflict.length}  other=${other.length}`);

    // ASSERT: bilkul 1 winner, baaki sab conflict.
    const pass = success.length === 1 && conflict.length === CONCURRENCY - 1 && other.length === 0;
    console.log(pass
      ? `\n  ✓ PASS — row lock ne double-booking roka. Sirf 1 lease bana (#${success[0].leaseId}).\n`
      : `\n  ✗ FAIL — expected 1 success + ${CONCURRENCY - 1} conflict. RACE CONDITION!\n`);

    // CLEANUP: bana hua lease hata do + property wapas Available (test re-runnable rahe).
    if (success.length) {
      const ids = success.map((r) => r.leaseId);
      await pool.query('DELETE FROM TENANT_LEASE WHERE Lease_ID IN (?)', [ids]);
      await pool.query('DELETE FROM LEASE WHERE Lease_ID IN (?)', [ids]);
    }
    await pool.query("UPDATE PROPERTY SET Status='Available' WHERE Property_ID=?", [propertyId]);

    process.exit(pass ? 0 : 1);
  } finally {
    await pool.end();
  }
}

main().catch((err) => { console.error('[LOCK TEST] FAIL:', err.message); process.exit(1); });
