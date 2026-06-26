// KYA KAR RAHA HAI: AUTH ke URL -> controller mapping.
const router = require('express').Router();
const AuthController = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth');

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.get('/me', verifyToken, AuthController.me);
router.post('/forgot-password', AuthController.forgotPassword);

module.exports = router;
