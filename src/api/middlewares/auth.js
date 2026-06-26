// KYA KAR RAHA HAI: Authentication & authorization middleware.
// KAISE KAR RAHA HAI: verifyToken JWT ko verify karta hai aur req.user set karta hai.
// requireRole sirf allowed roles ko aage jaane deta hai. JWT secret ab config se aata hai
// (hardcoded nahi). Error aaye toh next(ApiError) se central handler tak bhej dete hain.

const jwt = require('jsonwebtoken');
const config = require('../../config');
const ApiError = require('../../utils/ApiError');

function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('No token provided'));
  }
  try {
    req.user = jwt.verify(auth.split(' ')[1], config.jwt.secret);
    next();
  } catch (e) {
    next(ApiError.unauthorized('Invalid or expired token'));
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return next(ApiError.forbidden('Access denied'));
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
