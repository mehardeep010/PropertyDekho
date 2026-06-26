// KYA KAR RAHA HAI: Admin dashboard ke saare aggregate queries (counts, revenue, top agents).
const pool = require('../db/pool');

const DashboardRepository = {
  async getStats() {
    const [[{ total_properties }]] = await pool.query('SELECT COUNT(*) AS total_properties FROM PROPERTY');
    const [[{ total_agents }]] = await pool.query('SELECT COUNT(*) AS total_agents FROM AGENT');
    const [[{ total_tenants }]] = await pool.query('SELECT COUNT(*) AS total_tenants FROM TENANT');
    const [[{ total_owners }]] = await pool.query('SELECT COUNT(*) AS total_owners FROM OWNER');
    const [[{ active_leases }]] = await pool.query("SELECT COUNT(*) AS active_leases FROM LEASE WHERE End_Date >= CURDATE()");
    const [[{ open_inquiries }]] = await pool.query("SELECT COUNT(*) AS open_inquiries FROM INQUIRY WHERE Status IN ('New','Responded')");
    const [[{ total_revenue }]] = await pool.query("SELECT IFNULL(SUM(Amount),0) AS total_revenue FROM PAYMENT WHERE Status='Success'");
    const [[{ available_props }]] = await pool.query("SELECT COUNT(*) AS available_props FROM PROPERTY WHERE Status='Available'");

    const [statusBreakdown] = await pool.query('SELECT Status, COUNT(*) AS count FROM PROPERTY GROUP BY Status');

    const [recentPayments] = await pool.query(`
      SELECT pay.*, p.Title AS Property_Title
      FROM PAYMENT pay
      JOIN LEASE l    ON pay.Lease_ID = l.Lease_ID
      JOIN PROPERTY p ON l.Property_ID = p.Property_ID
      ORDER BY pay.Payment_Date DESC LIMIT 5`);

    const [topAgents] = await pool.query(`
      SELECT a.Name, COUNT(p.Property_ID) AS property_count
      FROM AGENT a
      LEFT JOIN PROPERTY p ON a.Agent_ID = p.Agent_ID
      GROUP BY a.Agent_ID ORDER BY property_count DESC LIMIT 5`);

    return {
      total_properties, total_agents, total_tenants, total_owners,
      active_leases, open_inquiries, total_revenue, available_props,
      statusBreakdown, recentPayments, topAgents,
    };
  },
};

module.exports = DashboardRepository;
