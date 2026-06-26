// KYA KAR RAHA HAI: Sirf URL ko controller se jodta hai (patla routing layer).
// KAISE KAR RAHA HAI: Koi logic nahi — bas "is path pe ye controller chalao". Isse poora
// API surface ek nazar me dikh jaata hai.

const router = require('express').Router();
const PropertyController = require('../controllers/property.controller');

router.get('/', PropertyController.list);
router.get('/:id', PropertyController.getById);
router.post('/', PropertyController.create);
router.put('/:id', PropertyController.update);
router.delete('/:id', PropertyController.remove);

module.exports = router;
