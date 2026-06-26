// KYA KAR RAHA HAI: PAYMENT ke URL -> controller mapping (+ input validation).
const router = require('express').Router();
const PaymentController = require('../controllers/payment.controller');
const validate = require('../middlewares/validate');
const v = require('../validators');

router.get('/', PaymentController.list);
router.post('/', v.payment.create, validate, PaymentController.create);

module.exports = router;
