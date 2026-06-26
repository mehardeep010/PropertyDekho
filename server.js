// KYA KAR RAHA HAI: App ka ENTRY POINT — config load, DB check, background worker start,
// aur server ko port pe listen karwana. Asli app logic src/ folder me hai (layered structure).
// KAISE KAR RAHA HAI: app banta hai src/app.js me; yahan use sirf chalu karte hain. Isse
// app aur server alag rehte hain (testing aasaan).

const config = require('./src/config');
const app = require('./src/app');
const db = require('./src/db/pool');
const { startAutoExpiry } = require('./src/jobs/autoExpiry');

async function start() {
  // Pehle DB connection verify karo — agar DB down hai toh saaf-saaf bata do.
  try {
    await db.assertConnection();
    console.log('[DB] Connected successfully via pool.');
  } catch (err) {
    console.error('[DB] Connection failed:', err.message);
  }

  // Background cleanup worker chalu karo (expired leases/sales).
  startAutoExpiry();

  app.listen(config.port, () => {
    console.log(`\nPROPERTY DEKHO - SYSTEM RUNNING ON PORT ${config.port}\n`);
    console.log(`Website Live at: http://localhost:${config.port}\n`);
  });
}

start();
