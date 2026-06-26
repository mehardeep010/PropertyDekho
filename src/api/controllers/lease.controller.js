// KYA KAR RAHA HAI: LEASE ka HTTP layer.
const asyncHandler = require('../../utils/asyncHandler');
const LeaseService = require('../../services/lease.service');

const LeaseController = {
  list: asyncHandler(async (req, res) => {
    res.json(await LeaseService.list());
  }),
  getById: asyncHandler(async (req, res) => {
    res.json(await LeaseService.getById(req.params.id));
  }),
  create: asyncHandler(async (req, res) => {
    res.status(201).json(await LeaseService.create(req.body));
  }),
  update: asyncHandler(async (req, res) => {
    res.json(await LeaseService.update(req.params.id, req.body));
  }),
  remove: asyncHandler(async (req, res) => {
    res.json(await LeaseService.remove(req.params.id));
  }),
};

module.exports = LeaseController;
