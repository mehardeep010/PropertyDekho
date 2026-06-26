// KYA KAR RAHA HAI: Tenant portal ke URL -> controller mapping (+ input validation).
const router = require('express').Router();
const TenantPortalController = require('../controllers/tenantPortal.controller');
const validate = require('../middlewares/validate');
const v = require('../validators');

router.get('/inquiries', TenantPortalController.inquiries);
router.post('/inquiries', v.tenantPortal.createInquiry, validate, TenantPortalController.createInquiry);
router.get('/leases', TenantPortalController.leases);
router.post('/pay-security', v.tenantPortal.paySecurity, validate, TenantPortalController.paySecurity);
router.get('/payments', TenantPortalController.payments);
router.get('/dashboard', TenantPortalController.dashboard);
router.get('/sales', TenantPortalController.sales);
router.post('/pay-sale', v.tenantPortal.paySale, validate, TenantPortalController.paySale);

module.exports = router;
