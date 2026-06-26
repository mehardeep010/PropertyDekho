// KYA KAR RAHA HAI: Authentication ki business logic — register, login, forgot-password.
// Password hashing aur JWT signing yahin hota hai.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const AuthRepository = require('../repositories/auth.repository');
const ApiError = require('../utils/ApiError');

const ALLOWED_ROLES = ['tenant', 'owner', 'agent'];

// KYA KAR RAHA HAI: Ek random 8-char temp password banata hai (confusing chars hata ke).
function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < 8; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

const AuthService = {
  async register(body) {
    const { username, email, password, role, name, phone, commission_rate } = body;
    if (!ALLOWED_ROLES.includes(role)) throw ApiError.badRequest('Invalid role');

    const passwordHash = await bcrypt.hash(password, 10);
    await AuthRepository.registerWithRole({
      username, email, passwordHash, role, name, phone, commissionRate: commission_rate,
    });
    return { message: 'Registered successfully' };
  },

  async login({ email, password }) {
    const user = await AuthRepository.findUserByEmail(email);
    if (!user) throw ApiError.unauthorized('Invalid email or password');

    const match = await bcrypt.compare(password, user.Password);
    if (!match) throw ApiError.unauthorized('Invalid email or password');

    const token = jwt.sign(
      { user_id: user.User_ID, role: user.Role, ref_id: user.Ref_ID, username: user.Username },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn });

    return { token, role: user.Role, ref_id: user.Ref_ID, username: user.Username };
  },

  async forgotPassword({ email }) {
    if (!email) throw ApiError.badRequest('Email is required');

    const user = await AuthRepository.findUserIdByEmail(email);
    if (!user) throw ApiError.notFound('No account found with that email address');

    const tempPassword = generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, 10);
    await AuthRepository.updatePassword(user.User_ID, hash);

    return {
      tempPassword,
      message: 'Password reset successfully. Use the temp password to log in and then change it from My Profile.',
    };
  },
};

module.exports = AuthService;
