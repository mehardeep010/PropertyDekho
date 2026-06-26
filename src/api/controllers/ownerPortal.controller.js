// KYA KAR RAHA HAI: Owner portal ka HTTP layer. Owner ki id req.user.ref_id me hoti hai.
const asyncHandler = require('../../utils/asyncHandler');
const OwnerPortalService = require('../../services/ownerPortal.service');

const OwnerPortalController = {
  dashboard: asyncHandler(async (req, res) => {
    res.json(await OwnerPortalService.getDashboard(req.user.ref_id));
  }),
  properties: asyncHandler(async (req, res) => {
    res.json(await OwnerPortalService.getProperties(req.user.ref_id));
  }),
  inquiries: asyncHandler(async (req, res) => {
    res.json(await OwnerPortalService.getInquiries(req.user.ref_id));
  }),
  leases: asyncHandler(async (req, res) => {
    res.json(await OwnerPortalService.getLeases(req.user.ref_id));
  }),
  payments: asyncHandler(async (req, res) => {
    res.json(await OwnerPortalService.getPayments(req.user.ref_id));
  }),
};

module.exports = OwnerPortalController;
