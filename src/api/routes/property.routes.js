// KYA KAR RAHA HAI: PROPERTY ke URL -> controller mapping (+ input validation).
const router = require('express').Router();
const PropertyController = require('../controllers/property.controller');
const validate = require('../middlewares/validate');
const { verifyToken } = require('../middlewares/auth');
const v = require('../validators');

router.get('/', PropertyController.list);
router.get('/:id', v.idOnly, validate, PropertyController.getById);
router.post('/', v.property.create, validate, PropertyController.create);
router.put('/:id', v.property.update, validate, PropertyController.update);
router.delete('/:id', v.idOnly, validate, PropertyController.remove);

// AI re-estimate: external API call hota hai isliye token zaroori (abuse rokne ke liye).
router.post('/:id/estimate', verifyToken, v.idOnly, validate, PropertyController.estimate);

module.exports = router;
