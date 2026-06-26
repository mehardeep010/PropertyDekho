// KYA KAR RAHA HAI: Background worker jo purane unpaid records ko clean karta hai.
// KAISE KAR RAHA HAI: Har 5 min me DB check karta hai —
//   - Agar lease bane 2 ghante ho gaye aur security deposit nahi aaya -> Expired + property Available.
//   - Agar sale bane 3 ghante ho gaye aur payment nahi aaya -> Cancelled + property Available.
// Pehle ye logic server.js me tha; ab apni job file me alag hai (Single Responsibility).
const pool = require('../db/pool');
const logger = require('../utils/logger');

async function runAutoExpiry() {
  try {
    // Expired leases dhoondo aur clean karo.
    const [expiredLeases] = await pool.query(`
      SELECT l.Lease_ID, l.Property_ID FROM LEASE l
      WHERE l.Lease_Status = 'Pending_Payment'
        AND l.Created_At < DATE_SUB(NOW(), INTERVAL 2 HOUR)`);

    for (const lease of expiredLeases) {
      await pool.query("UPDATE LEASE SET Lease_Status='Expired' WHERE Lease_ID=?", [lease.Lease_ID]);
      await pool.query('DELETE FROM TENANT_LEASE WHERE Lease_ID=?', [lease.Lease_ID]);
      await pool.query("UPDATE PROPERTY SET Status='Available' WHERE Property_ID=?", [lease.Property_ID]);
      logger.info(`[Auto-Expiry] Cleaned up Lease #${lease.Lease_ID}`);
    }

    // Expired sales dhoondo aur cancel karo (Sold ko mat chhedo).
    const [expiredSales] = await pool.query(`
      SELECT s.Sale_ID, s.Property_ID FROM SALE s
      WHERE s.Sale_Status = 'Pending_Payment'
        AND s.Created_At < DATE_SUB(NOW(), INTERVAL 3 HOUR)`);

    for (const sale of expiredSales) {
      await pool.query("UPDATE SALE SET Sale_Status='Cancelled' WHERE Sale_ID=?", [sale.Sale_ID]);
      await pool.query("UPDATE PROPERTY SET Status='Available' WHERE Property_ID=? AND Status != 'Sold'", [sale.Property_ID]);
    }
  } catch (e) {
    logger.error({ err: e }, '[Auto-Expiry Error]');
  }
}

// KYA KAR RAHA HAI: Worker ko start karta hai — turant ek baar, phir har 5 min.
function startAutoExpiry() {
  runAutoExpiry();
  setInterval(runAutoExpiry, 5 * 60 * 1000);
}

module.exports = { runAutoExpiry, startAutoExpiry };
