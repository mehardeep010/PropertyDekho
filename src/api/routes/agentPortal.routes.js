// KYA KAR RAHA HAI: Agent portal ke URL -> controller mapping.
const router = require('express').Router();
const AgentPortalController = require('../controllers/agentPortal.controller');

router.get('/dashboard', AgentPortalController.dashboard);
router.get('/properties', AgentPortalController.properties);
router.get('/inquiries', AgentPortalController.inquiries);
router.put('/inquiries/:id', AgentPortalController.updateInquiry);
router.post('/leases', AgentPortalController.createLease);
router.post('/leases/:id/terminate', AgentPortalController.terminateLease);
router.get('/leases', AgentPortalController.leases);
router.get('/payments', AgentPortalController.payments);
router.post('/sales', AgentPortalController.createSale);
router.get('/sales', AgentPortalController.sales);

module.exports = router;
