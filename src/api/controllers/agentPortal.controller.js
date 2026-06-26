// KYA KAR RAHA HAI: Agent portal ka HTTP layer. Agent ki id req.user.ref_id me hoti hai.
const asyncHandler = require('../../utils/asyncHandler');
const AgentPortalService = require('../../services/agentPortal.service');

const AgentPortalController = {
  dashboard: asyncHandler(async (req, res) => {
    res.json(await AgentPortalService.getDashboard(req.user.ref_id));
  }),
  properties: asyncHandler(async (req, res) => {
    res.json(await AgentPortalService.getProperties(req.user.ref_id));
  }),
  inquiries: asyncHandler(async (req, res) => {
    res.json(await AgentPortalService.getInquiries(req.user.ref_id));
  }),
  updateInquiry: asyncHandler(async (req, res) => {
    res.json(await AgentPortalService.updateInquiryStatus(req.params.id, req.user.ref_id, req.body.Status));
  }),
  createLease: asyncHandler(async (req, res) => {
    res.status(201).json(await AgentPortalService.createLease(req.user.ref_id, req.body));
  }),
  terminateLease: asyncHandler(async (req, res) => {
    res.json(await AgentPortalService.terminateLease(req.user.ref_id, req.params.id));
  }),
  leases: asyncHandler(async (req, res) => {
    res.json(await AgentPortalService.getLeases(req.user.ref_id));
  }),
  payments: asyncHandler(async (req, res) => {
    res.json(await AgentPortalService.getPayments(req.user.ref_id));
  }),
  createSale: asyncHandler(async (req, res) => {
    res.status(201).json(await AgentPortalService.createSale(req.user.ref_id, req.body));
  }),
  sales: asyncHandler(async (req, res) => {
    res.json(await AgentPortalService.getSales(req.user.ref_id));
  }),
};

module.exports = AgentPortalController;
