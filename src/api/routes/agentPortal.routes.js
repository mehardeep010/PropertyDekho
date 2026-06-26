// KYA KAR RAHA HAI: Agent portal ke URL -> controller mapping (+ input validation).
const router = require('express').Router();
const AgentPortalController = require('../controllers/agentPortal.controller');
const validate = require('../middlewares/validate');
const v = require('../validators');

router.get('/dashboard', AgentPortalController.dashboard);
router.get('/properties', AgentPortalController.properties);
router.get('/inquiries', AgentPortalController.inquiries);
router.put('/inquiries/:id', v.agentPortal.updateInquiry, validate, AgentPortalController.updateInquiry);
router.post('/leases', v.agentPortal.createLease, validate, AgentPortalController.createLease);
router.post('/leases/:id/terminate', v.idOnly, validate, AgentPortalController.terminateLease);
router.get('/leases', AgentPortalController.leases);
router.get('/payments', AgentPortalController.payments);
router.post('/sales', v.agentPortal.createSale, validate, AgentPortalController.createSale);
router.get('/sales', AgentPortalController.sales);

module.exports = router;
