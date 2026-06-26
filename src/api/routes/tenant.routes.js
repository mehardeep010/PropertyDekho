// KYA KAR RAHA HAI: TENANT ke URL -> controller mapping (+ input validation).
const router = require('express').Router();
const TenantController = require('../controllers/tenant.controller');
const validate = require('../middlewares/validate');
const v = require('../validators');

router.get('/', TenantController.list);
router.get('/:id', v.idOnly, validate, TenantController.getById);
router.post('/', v.contact.write, validate, TenantController.create);
router.put('/:id', [...v.idOnly, ...v.contact.write], validate, TenantController.update);
router.delete('/:id', v.idOnly, validate, TenantController.remove);

module.exports = router;
