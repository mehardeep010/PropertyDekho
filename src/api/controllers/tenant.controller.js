// KYA KAR RAHA HAI: TENANT ka HTTP layer.
const asyncHandler = require('../../utils/asyncHandler');
const TenantService = require('../../services/tenant.service');

const TenantController = {
  list: asyncHandler(async (req, res) => {
    res.json(await TenantService.list());
  }),
  getById: asyncHandler(async (req, res) => {
    res.json(await TenantService.getById(req.params.id));
  }),
  create: asyncHandler(async (req, res) => {
    res.status(201).json(await TenantService.create(req.body));
  }),
  update: asyncHandler(async (req, res) => {
    res.json(await TenantService.update(req.params.id, req.body));
  }),
  remove: asyncHandler(async (req, res) => {
    res.json(await TenantService.remove(req.params.id));
  }),
};

module.exports = TenantController;
