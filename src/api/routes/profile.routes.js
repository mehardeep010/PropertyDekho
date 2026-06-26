// KYA KAR RAHA HAI: PROFILE ke URL -> controller mapping (+ input validation).
const router = require('express').Router();
const ProfileController = require('../controllers/profile.controller');
const validate = require('../middlewares/validate');
const v = require('../validators');

router.get('/', ProfileController.get);
router.put('/', v.profile.update, validate, ProfileController.update);
router.put('/password', v.profile.password, validate, ProfileController.changePassword);

module.exports = router;
