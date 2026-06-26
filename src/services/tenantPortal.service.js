// KYA KAR RAHA HAI: Tenant portal ki business logic — time-limit checks, status validation,
// aur "kitna time bacha" calculation yahan hota hai. SQL repository me, rules yahan.
const TenantPortalRepository = require('../repositories/tenantPortal.repository');
const ApiError = require('../utils/ApiError');

// Business constants: security deposit ke liye 2 ghante, sale ke liye 3 ghante.
const SECURITY_WINDOW_SEC = 2 * 60 * 60; // 7200
const SALE_WINDOW_SEC = 3 * 60 * 60;     // 10800

const TenantPortalService = {
  getInquiries(tid) {
    return TenantPortalRepository.findInquiries(tid);
  },

  async getLeases(tid) {
    const leases = await TenantPortalRepository.findLeases(tid);
    // Pending_Payment leases ke liye kitne second bache hain woh add karo.
    leases.forEach((l) => {
      l.time_remaining_seconds = l.Lease_Status === 'Pending_Payment'
        ? Math.max(0, SECURITY_WINDOW_SEC - (l.seconds_elapsed || 0))
        : null;
    });
    return leases;
  },

  async paySecurity(tid, { Lease_ID, Amount, Payment_Type, Method }) {
    const lease = await TenantPortalRepository.findLeaseForSecurityPayment(Lease_ID, tid);
    if (!lease) throw ApiError.notFound('Lease not found');
    if (lease.Lease_Status === 'Terminated') throw ApiError.badRequest('This lease has been terminated.');
    if (lease.Lease_Status === 'Active') throw ApiError.badRequest('Security deposit already paid.');
    if (lease.seconds_elapsed > SECURITY_WINDOW_SEC) throw ApiError.badRequest('Time limit expired! Lease cancelled.');

    await TenantPortalRepository.paySecurityTx({
      leaseId: Lease_ID,
      propertyId: lease.Property_ID,
      amount: Amount,
      paymentType: Payment_Type,
      method: Method,
    });
    return { message: ' Payment successful! Your lease is now Active.' };
  },

  getPayments(tid) {
    return TenantPortalRepository.findPayments(tid);
  },

  async createInquiry(tid, { Property_ID, Message }) {
    const prop = await TenantPortalRepository.findPropertyAgent(Property_ID);
    if (!prop) throw ApiError.notFound('Property not found');
    const today = new Date().toISOString().slice(0, 10);
    const inquiryId = await TenantPortalRepository.createInquiry({
      message: Message, date: today, tenantId: tid, propertyId: Property_ID, agentId: prop.Agent_ID,
    });
    return { Inquiry_ID: inquiryId };
  },

  getDashboard(tid) {
    return TenantPortalRepository.getDashboardStats(tid);
  },

  async getSales(tid) {
    const sales = await TenantPortalRepository.findSales(tid);
    sales.forEach((s) => {
      s.time_remaining_seconds = s.Sale_Status === 'Pending_Payment'
        ? Math.max(0, SALE_WINDOW_SEC - (s.seconds_elapsed || 0))
        : null;
    });
    return sales;
  },

  async paySale(tid, { Sale_ID, Method }) {
    const sale = await TenantPortalRepository.findSaleForPayment(Sale_ID, tid);
    if (!sale) throw ApiError.notFound('Sale not found');
    if (sale.Sale_Status === 'Completed') throw ApiError.badRequest('Payment already completed.');
    if (sale.Sale_Status === 'Cancelled') throw ApiError.badRequest('This sale was cancelled (time expired).');
    if (sale.seconds_elapsed > SALE_WINDOW_SEC) throw ApiError.badRequest('Time limit expired! Sale cancelled.');

    await TenantPortalRepository.paySaleTx({ saleId: Sale_ID, propertyId: sale.Property_ID, method: Method });
    return { message: ' Payment successful! The property is now officially Sold.' };
  },
};

module.exports = TenantPortalService;
