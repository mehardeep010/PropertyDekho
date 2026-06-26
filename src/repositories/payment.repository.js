// KYA KAR RAHA HAI: PAYMENT ka saara SQL yahin. Payment record karne ka kaam stored
// procedure 'CreatePaymentTx' karta hai jo lease row pe FOR UPDATE lock leke check karta hai.
const pool = require('../db/pool');

const PaymentRepository = {
  async findAll() {
    const [rows] = await pool.query('SELECT * FROM PAYMENT ORDER BY Payment_Date DESC');
    return rows;
  },

  // CALL + SELECT @vars dono ek hi connection pe (session vars per-connection hote hain).
  async createViaProc({ Payment_Date, Amount, Payment_Type, Method, Lease_ID }) {
    const conn = await pool.getConnection();
    try {
      await conn.query(
        'CALL CreatePaymentTx(?, ?, ?, ?, ?, @statusCode, @msg, @newPaymentId)',
        [Payment_Date, Amount, Payment_Type, Method, Lease_ID]);
      const [[out]] = await conn.query(
        'SELECT @statusCode AS status, @msg AS message, @newPaymentId AS paymentId');
      return out;
    } finally {
      conn.release();
    }
  },
};

module.exports = PaymentRepository;
