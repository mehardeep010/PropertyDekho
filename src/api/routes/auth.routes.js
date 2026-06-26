// KYA KAR RAHA HAI: AUTH ke URL -> controller mapping (+ input validation).
const router = require('express').Router();
const AuthController = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const v = require('../validators');

router.post('/register', v.auth.register, validate, AuthController.register);
router.post('/login', v.auth.login, validate, AuthController.login);
router.get('/me', verifyToken, AuthController.me);
router.post('/forgot-password', v.auth.forgot, validate, AuthController.forgotPassword);

module.exports = router;
