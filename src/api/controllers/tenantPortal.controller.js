// KYA KAR RAHA HAI: Tenant portal ka HTTP layer. Tenant ki id req.user.ref_id me hoti hai.
const asyncHandler = require('../../utils/asyncHandler');
const TenantPortalService = require('../../services/tenantPortal.service');

const TenantPortalController = {
  inquiries: asyncHandler(async (req, res) => {
    res.json(await TenantPortalService.getInquiries(req.user.ref_id));
  }),
  leases: asyncHandler(async (req, res) => {
    res.json(await TenantPortalService.getLeases(req.user.ref_id));
  }),
  paySecurity: asyncHandler(async (req, res) => {
    res.json(await TenantPortalService.paySecurity(req.user.ref_id, req.body));
  }),
  payments: asyncHandler(async (req, res) => {
    res.json(await TenantPortalService.getPayments(req.user.ref_id));
  }),
  createInquiry: asyncHandler(async (req, res) => {
    res.status(201).json(await TenantPortalService.createInquiry(req.user.ref_id, req.body));
  }),
  dashboard: asyncHandler(async (req, res) => {
    res.json(await TenantPortalService.getDashboard(req.user.ref_id));
  }),
  sales: asyncHandler(async (req, res) => {
    res.json(await TenantPortalService.getSales(req.user.ref_id));
  }),
  paySale: asyncHandler(async (req, res) => {
    res.json(await TenantPortalService.paySale(req.user.ref_id, req.body));
  }),
};

module.exports = TenantPortalController;
