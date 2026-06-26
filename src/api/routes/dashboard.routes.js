// KYA KAR RAHA HAI: DASHBOARD ke URL -> controller mapping.
const router = require('express').Router();
const DashboardController = require('../controllers/dashboard.controller');

router.get('/', DashboardController.stats);

module.exports = router;
