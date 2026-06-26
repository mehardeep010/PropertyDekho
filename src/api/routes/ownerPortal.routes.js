// KYA KAR RAHA HAI: Owner portal ke URL -> controller mapping.
const router = require('express').Router();
const OwnerPortalController = require('../controllers/ownerPortal.controller');

router.get('/dashboard', OwnerPortalController.dashboard);
router.get('/properties', OwnerPortalController.properties);
router.get('/inquiries', OwnerPortalController.inquiries);
router.get('/leases', OwnerPortalController.leases);
router.get('/payments', OwnerPortalController.payments);

module.exports = router;
