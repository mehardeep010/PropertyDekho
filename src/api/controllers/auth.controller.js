// KYA KAR RAHA HAI: AUTH ka HTTP layer.
const asyncHandler = require('../../utils/asyncHandler');
const AuthService = require('../../services/auth.service');

const AuthController = {
  register: asyncHandler(async (req, res) => {
    res.status(201).json(await AuthService.register(req.body));
  }),
  login: asyncHandler(async (req, res) => {
    res.json(await AuthService.login(req.body));
  }),
  // /me sirf token ka decoded payload wapas deta hai (verifyToken ne req.user set kiya).
  me: asyncHandler(async (req, res) => {
    res.json(req.user);
  }),
  forgotPassword: asyncHandler(async (req, res) => {
    res.json(await AuthService.forgotPassword(req.body));
  }),
};

module.exports = AuthController;
