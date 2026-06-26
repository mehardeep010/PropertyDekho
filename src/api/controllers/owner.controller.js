// KYA KAR RAHA HAI: OWNER ka HTTP layer.
const asyncHandler = require('../../utils/asyncHandler');
const OwnerService = require('../../services/owner.service');

const OwnerController = {
  list: asyncHandler(async (req, res) => {
    res.json(await OwnerService.list());
  }),
  getById: asyncHandler(async (req, res) => {
    res.json(await OwnerService.getById(req.params.id));
  }),
  create: asyncHandler(async (req, res) => {
    res.status(201).json(await OwnerService.create(req.body));
  }),
  update: asyncHandler(async (req, res) => {
    res.json(await OwnerService.update(req.params.id, req.body));
  }),
  remove: asyncHandler(async (req, res) => {
    res.json(await OwnerService.remove(req.params.id));
  }),
};

module.exports = OwnerController;
