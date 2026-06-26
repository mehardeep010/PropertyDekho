// KYA KAR RAHA HAI: Poore app ka config ek hi jagah se aata hai (single source of truth).
// KAISE KAR RAHA HAI: process.env se values uthata hai. Agar koi ZAROORI value missing ho
// (jaise DB password ya JWT secret) toh app ko abhi crash kar deta hai — baad me silently
// galat config pe chalne se accha hai turant pata chal jaaye (fail-fast principle).

require('dotenv').config();

function required(key, fallback) {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`[Config] Missing required env variable: ${key}`);
  }
  return value;
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,

  db: {
    host: process.env.DB_HOST || 'localhost',
    // DB_PORT zaroori hai cloud (Railway etc.) ke liye jahan MySQL default 3306 pe nahi hota.
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: required('DB_PASSWORD', process.env.NODE_ENV === 'test' ? 'test' : undefined),
    database: process.env.DB_NAME || 'property_mgmt',
    connectionLimit: parseInt(process.env.DB_POOL_LIMIT, 10) || 10,
  },

  jwt: {
    // KYA KAR RAHA HAI: Production me secret env se aana CHAHIYE. Dev me ek default chalega
    // par hum warn karenge taaki galti se prod me default na chala jaaye.
    secret: process.env.JWT_SECRET || 'propvault_dev_secret_change_me',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },

  ai: {
    // KYA KAR RAHA HAI: Gemini se property price estimate. Key OPTIONAL hai — na ho toh app
    // chalta rehta hai aur heuristic (comparable-based) fallback use hota hai. Isliye yahan
    // required() nahi lagaya. Key chahiye toh Google AI Studio se free milti hai.
    geminiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  },
};

// Dev safety warning: agar prod me default secret chal raha hai toh chillao.
if (config.env === 'production' && config.jwt.secret === 'propvault_dev_secret_change_me') {
  throw new Error('[Config] JWT_SECRET production me default nahi ho sakta. .env set karo.');
}

module.exports = config;
