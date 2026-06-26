// KYA KAR RAHA HAI: TENANT ke URL -> controller mapping.
const router = require('express').Router();
const TenantController = require('../controllers/tenant.controller');

router.get('/', TenantController.list);
router.get('/:id', TenantController.getById);
router.post('/', TenantController.create);
router.put('/:id', TenantController.update);
router.delete('/:id', TenantController.remove);

module.exports = router;
