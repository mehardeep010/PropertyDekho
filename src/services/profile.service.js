// KYA KAR RAHA HAI: PROFILE ki business logic — apna profile dekhna, update karna, password badalna.
const bcrypt = require('bcryptjs');
const ProfileRepository = require('../repositories/profile.repository');
const ApiError = require('../utils/ApiError');

const ProfileService = {
  async getProfile({ role, ref_id, user_id }) {
    const user = await ProfileRepository.findUserById(user_id);
    if (!user) throw ApiError.notFound('User not found');

    const roleRow = await ProfileRepository.findRoleRow(role, ref_id);
    return {
      user_id: user.User_ID,
      username: user.Username,
      email: user.Email,
      role: user.Role,
      ref_id: user.Ref_ID,
      name: roleRow?.Name || '',
      phone: roleRow?.Phone || '',
      commission_rate: roleRow?.Commission_Rate ?? null,
    };
  },

  async updateProfile({ role, ref_id, user_id }, body) {
    const { name, phone, email, commission_rate } = body;
    await ProfileRepository.updateProfileTx({
      role, refId: ref_id, userId: user_id, name, phone, email, commissionRate: commission_rate,
    });
    return { message: 'Profile updated successfully' };
  },

  async changePassword({ user_id }, { currentPassword, newPassword }) {
    if (!currentPassword || !newPassword) {
      throw ApiError.badRequest('Both current and new passwords are required');
    }
    if (newPassword.length < 6) {
      throw ApiError.badRequest('New password must be at least 6 characters');
    }

    const currentHash = await ProfileRepository.getPasswordHash(user_id);
    if (currentHash === null) throw ApiError.notFound('User not found');

    const match = await bcrypt.compare(currentPassword, currentHash);
    if (!match) throw ApiError.unauthorized('Current password is incorrect');

    const newHash = await bcrypt.hash(newPassword, 10);
    await ProfileRepository.updatePassword(user_id, newHash);
    return { message: 'Password changed successfully' };
  },
};

module.exports = ProfileService;
