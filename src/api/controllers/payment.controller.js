// KYA KAR RAHA HAI: PAYMENT ka HTTP layer.
const asyncHandler = require('../../utils/asyncHandler');
const PaymentService = require('../../services/payment.service');

const PaymentController = {
  list: asyncHandler(async (req, res) => {
    res.json(await PaymentService.list());
  }),
  create: asyncHandler(async (req, res) => {
    res.status(201).json(await PaymentService.create(req.body));
  }),
};

module.exports = PaymentController;
