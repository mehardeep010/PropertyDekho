// KYA KAR RAHA HAI: PAYMENT ke URL -> controller mapping.
const router = require('express').Router();
const PaymentController = require('../controllers/payment.controller');

router.get('/', PaymentController.list);
router.post('/', PaymentController.create);

module.exports = router;
