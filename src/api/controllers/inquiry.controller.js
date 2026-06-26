// KYA KAR RAHA HAI: INQUIRY ka HTTP layer.
const asyncHandler = require('../../utils/asyncHandler');
const InquiryService = require('../../services/inquiry.service');

const InquiryController = {
  list: asyncHandler(async (req, res) => {
    res.json(await InquiryService.list());
  }),
  getById: asyncHandler(async (req, res) => {
    res.json(await InquiryService.getById(req.params.id));
  }),
  create: asyncHandler(async (req, res) => {
    res.status(201).json(await InquiryService.create(req.body));
  }),
  update: asyncHandler(async (req, res) => {
    res.json(await InquiryService.updateStatus(req.params.id, req.body.Status));
  }),
  remove: asyncHandler(async (req, res) => {
    res.json(await InquiryService.remove(req.params.id));
  }),
};

module.exports = InquiryController;
