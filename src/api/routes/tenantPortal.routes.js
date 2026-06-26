// KYA KAR RAHA HAI: Tenant portal ke URL -> controller mapping.
const router = require('express').Router();
const TenantPortalController = require('../controllers/tenantPortal.controller');

router.get('/inquiries', TenantPortalController.inquiries);
router.post('/inquiries', TenantPortalController.createInquiry);
router.get('/leases', TenantPortalController.leases);
router.post('/pay-security', TenantPortalController.paySecurity);
router.get('/payments', TenantPortalController.payments);
router.get('/dashboard', TenantPortalController.dashboard);
router.get('/sales', TenantPortalController.sales);
router.post('/pay-sale', TenantPortalController.paySale);

module.exports = router;
