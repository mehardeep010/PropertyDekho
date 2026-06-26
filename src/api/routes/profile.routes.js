// KYA KAR RAHA HAI: PROFILE ke URL -> controller mapping.
const router = require('express').Router();
const ProfileController = require('../controllers/profile.controller');

router.get('/', ProfileController.get);
router.put('/', ProfileController.update);
router.put('/password', ProfileController.changePassword);

module.exports = router;
