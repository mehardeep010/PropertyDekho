// KYA KAR RAHA HAI: App ka ENTRY POINT — config load, DB check, background worker start,
// aur server ko port pe listen karwana. Asli app logic src/ folder me hai (layered structure).
// KAISE KAR RAHA HAI: app banta hai src/app.js me; yahan use sirf chalu karte hain. Isse
// app aur server alag rehte hain (testing aasaan).

const config = require('./src/config');
const app = require('./src/app');
const db = require('./src/db/pool');
const logger = require('./src/utils/logger');
const { startAutoExpiry } = require('./src/jobs/autoExpiry');

async function start() {
  // Pehle DB connection verify karo — agar DB down hai toh saaf-saaf bata do.
  try {
    await db.assertConnection();
    logger.info('[DB] Connected successfully via pool.');
  } catch (err) {
    logger.error({ err }, '[DB] Connection failed');
  }

  // Background cleanup worker chalu karo (expired leases/sales).
  startAutoExpiry();

  app.listen(config.port, () => {
    logger.info(`PROPERTY DEKHO running on http://localhost:${config.port}`);
  });
}

start();
