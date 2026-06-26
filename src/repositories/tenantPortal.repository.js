// KYA KAR RAHA HAI: Tenant portal ka saara SQL — apni inquiries, leases, payments, sales
// aur do transactional flows (security deposit pay, sale pay). Sab tenant-id se scope hota hai.
const pool = require('../db/pool');

const TenantPortalRepository = {
  findInquiries(tid) {
    return pool.query(`
      SELECT i.*, p.Title AS Property_Title, p.Location, p.Price, p.Status AS Property_Status,
             a.Name AS Agent_Name, a.Phone AS Agent_Phone
      FROM INQUIRY i
      JOIN PROPERTY p ON i.Property_ID = p.Property_ID
      JOIN AGENT a    ON i.Agent_ID    = a.Agent_ID
      WHERE i.Tenant_ID = ?
      ORDER BY i.Date DESC`, [tid]).then(([rows]) => rows);
  },

  findLeases(tid) {
    return pool.query(`
      SELECT l.*, p.Title AS Property_Title, p.Location, p.Type,
             a.Name AS Agent_Name, o.Name AS Owner_Name,
             TIMESTAMPDIFF(SECOND, l.Created_At, NOW()) AS seconds_elapsed
      FROM LEASE l
      JOIN TENANT_LEASE tl ON l.Lease_ID = tl.Lease_ID
      JOIN PROPERTY p      ON l.Property_ID = p.Property_ID
      JOIN AGENT a         ON p.Agent_ID = a.Agent_ID
      JOIN OWNER o         ON p.Owner_ID = o.Owner_ID
      WHERE tl.Tenant_ID = ?
      ORDER BY l.Start_Date DESC`, [tid]).then(([rows]) => rows);
  },

  async findLeaseForSecurityPayment(leaseId, tid) {
    const [[lease]] = await pool.query(`
      SELECT l.Lease_ID, l.Property_ID, l.Security_Deposit, l.Lease_Status,
             TIMESTAMPDIFF(SECOND, l.Created_At, NOW()) AS seconds_elapsed
      FROM LEASE l
      JOIN TENANT_LEASE tl ON l.Lease_ID = tl.Lease_ID
      WHERE l.Lease_ID = ? AND tl.Tenant_ID = ?`, [leaseId, tid]);
    return lease || null;
  },

  // Payment record + lease Active + property Rented — sab ek transaction me.
  async paySecurityTx({ leaseId, propertyId, amount, paymentType, method }) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const today = new Date().toISOString().slice(0, 10);
      await conn.query(
        'INSERT INTO PAYMENT (Payment_Date,Amount,Payment_Type,Method,Status,Lease_ID) VALUES(?,?,?,?,?,?)',
        [today, amount, paymentType || 'Security_Deposit', method, 'Success', leaseId]);
      await conn.query("UPDATE LEASE SET Lease_Status='Active' WHERE Lease_ID=?", [leaseId]);
      await conn.query("UPDATE PROPERTY SET Status='Rented' WHERE Property_ID=?", [propertyId]);
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  },

  findPayments(tid) {
    return pool.query(`
      SELECT pay.*, p.Title AS Property_Title
      FROM PAYMENT pay
      JOIN LEASE l         ON pay.Lease_ID = l.Lease_ID
      JOIN TENANT_LEASE tl ON l.Lease_ID   = tl.Lease_ID
      JOIN PROPERTY p      ON l.Property_ID = p.Property_ID
      WHERE tl.Tenant_ID = ?
      ORDER BY pay.Payment_Date DESC`, [tid]).then(([rows]) => rows);
  },

  async findPropertyAgent(propertyId) {
    const [[prop]] = await pool.query('SELECT Agent_ID FROM PROPERTY WHERE Property_ID=?', [propertyId]);
    return prop || null;
  },

  async createInquiry({ message, date, tenantId, propertyId, agentId }) {
    const [r] = await pool.query(
      'INSERT INTO INQUIRY (Message,Date,Status,Tenant_ID,Property_ID,Agent_ID) VALUES(?,?,?,?,?,?)',
      [message, date, 'New', tenantId, propertyId, agentId]);
    return r.insertId;
  },

  async getDashboardStats(tid) {
    const [[{ total_inquiries }]] = await pool.query('SELECT COUNT(*) AS total_inquiries FROM INQUIRY WHERE Tenant_ID=?', [tid]);
    const [[{ active_leases }]] = await pool.query("SELECT COUNT(*) AS active_leases FROM LEASE l JOIN TENANT_LEASE tl ON l.Lease_ID=tl.Lease_ID WHERE tl.Tenant_ID=? AND l.End_Date >= CURDATE()", [tid]);
    const [[{ total_paid }]] = await pool.query("SELECT IFNULL(SUM(pay.Amount),0) AS total_paid FROM PAYMENT pay JOIN LEASE l ON pay.Lease_ID=l.Lease_ID JOIN TENANT_LEASE tl ON l.Lease_ID=tl.Lease_ID WHERE tl.Tenant_ID=? AND pay.Status='Success'", [tid]);
    const [[{ open_inquiries }]] = await pool.query("SELECT COUNT(*) AS open_inquiries FROM INQUIRY WHERE Tenant_ID=? AND Status IN ('New','Responded')", [tid]);
    const [[{ pending_sales }]] = await pool.query("SELECT COUNT(*) AS pending_sales FROM SALE WHERE Buyer_Tenant_ID=? AND Sale_Status='Pending_Payment'", [tid]);
    return { total_inquiries, active_leases, total_paid, open_inquiries, pending_sales };
  },

  findSales(tid) {
    return pool.query(`
      SELECT s.*,
             p.Title AS Property_Title, p.Location, p.Type, p.Price,
             a.Name AS Agent_Name, a.Phone AS Agent_Phone,
             TIMESTAMPDIFF(SECOND, s.Created_At, NOW()) AS seconds_elapsed
      FROM SALE s
      JOIN PROPERTY p ON s.Property_ID = p.Property_ID
      JOIN AGENT a    ON p.Agent_ID    = a.Agent_ID
      WHERE s.Buyer_Tenant_ID = ?
      ORDER BY s.Created_At DESC`, [tid]).then(([rows]) => rows);
  },

  async findSaleForPayment(saleId, tid) {
    const [[sale]] = await pool.query(`
      SELECT s.Sale_ID, s.Property_ID, s.Amount, s.Sale_Status,
             TIMESTAMPDIFF(SECOND, s.Created_At, NOW()) AS seconds_elapsed
      FROM SALE s
      WHERE s.Sale_ID = ? AND s.Buyer_Tenant_ID = ?`, [saleId, tid]);
    return sale || null;
  },

  async paySaleTx({ saleId, propertyId, method }) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query("UPDATE SALE SET Sale_Status='Completed', Method=? WHERE Sale_ID=?", [method, saleId]);
      await conn.query("UPDATE PROPERTY SET Status='Sold' WHERE Property_ID=?", [propertyId]);
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  },
};

module.exports = TenantPortalRepository;
