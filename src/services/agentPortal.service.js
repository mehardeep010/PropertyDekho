// KYA KAR RAHA HAI: Agent portal ki business logic — lease/sale banane se pehle ke rules
// (property assigned hai ya nahi, Sold/Rented toh nahi) aur sahi message banana yahan hota hai.
const AgentPortalRepository = require('../repositories/agentPortal.repository');
const ApiError = require('../utils/ApiError');

const SALE_WINDOW_SEC = 3 * 60 * 60; // 10800 = 3 ghante

const AgentPortalService = {
  getDashboard(aid) { return AgentPortalRepository.getDashboardStats(aid); },
  getProperties(aid) { return AgentPortalRepository.findProperties(aid); },
  getInquiries(aid) { return AgentPortalRepository.findInquiries(aid); },

  async updateInquiryStatus(id, aid, status) {
    await AgentPortalRepository.updateInquiryStatus(id, aid, status);
    return { message: 'Updated' };
  },

  async createLease(aid, body) {
    const { Property_ID, Tenant_ID, Start_Date, End_Date, Monthly_Rent, Security_Deposit } = body;
    const leaseId = await AgentPortalRepository.createLeaseTx({
      propertyId: Property_ID, tenantId: Tenant_ID, startDate: Start_Date, endDate: End_Date,
      monthlyRent: Monthly_Rent, securityDeposit: Security_Deposit,
    });
    return { Lease_ID: leaseId, message: 'Lease created. Tenant must pay security deposit within 2 hours.' };
  },

  async terminateLease(aid, leaseId) {
    const lease = await AgentPortalRepository.findLeaseForTerminate(leaseId, aid);
    if (!lease) throw ApiError.forbidden('Lease not found or not assigned to you');

    const propStatus = await AgentPortalRepository.terminateLeaseTx({
      leaseId: lease.Lease_ID, propertyId: lease.Property_ID,
    });
    const message = propStatus === 'Sold'
      ? 'Lease terminated. Property remains Sold (irreversible).'
      : 'Lease terminated. Property is now Available.';
    return { message };
  },

  getLeases(aid) { return AgentPortalRepository.findLeases(aid); },
  getPayments(aid) { return AgentPortalRepository.findPayments(aid); },

  async createSale(aid, { Property_ID, Buyer_Tenant_ID, Amount }) {
    const prop = await AgentPortalRepository.findAgentProperty(Property_ID, aid);
    if (!prop) throw ApiError.forbidden('Property not found or not assigned to you');
    if (prop.Status === 'Sold') throw ApiError.badRequest('Property is already sold.');
    if (prop.Status === 'Rented') throw ApiError.badRequest('Property is currently rented. Terminate the lease first.');

    const saleId = await AgentPortalRepository.createSaleTx({
      propertyId: Property_ID, buyerTenantId: Buyer_Tenant_ID, amount: Amount,
    });
    return { Sale_ID: saleId, message: 'Sale created! Buyer has 3 hours to complete payment.' };
  },

  async getSales(aid) {
    const sales = await AgentPortalRepository.findSales(aid);
    sales.forEach((s) => {
      s.time_remaining_seconds = s.Sale_Status === 'Pending_Payment'
        ? Math.max(0, SALE_WINDOW_SEC - (s.seconds_elapsed || 0))
        : null;
    });
    return sales;
  },
};

module.exports = AgentPortalService;
