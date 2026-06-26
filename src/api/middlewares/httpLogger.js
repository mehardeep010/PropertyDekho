// KYA KAR RAHA HAI: Har HTTP request/response ko log karta hai, ek unique request-id ke saath.
// KAISE KAR RAHA HAI: pino-http har request pe ek id deta hai (ya client ka X-Request-Id use
// karta hai), use response header me bhi bhejta hai. Isse ek single request ko logs me
// end-to-end trace kar sakte ho. 4xx ko warn, 5xx ko error level pe log karta hai.
const pinoHttp = require('pino-http');
const { randomUUID } = require('crypto');
const logger = require('../../utils/logger');

const httpLogger = pinoHttp({
  logger,

  // Request id: client se aaya X-Request-Id use karo, warna naya UUID banao.
  // Response header me bhi set karo taaki client/logs correlate ho sakein.
  genReqId(req, res) {
    const id = req.headers['x-request-id'] || randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },

  // Status code ke hisaab se sahi log level.
  customLogLevel(req, res, err) {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },

  // Logs me sirf zaroori cheezein (password/token jaise sensitive data redact).
  redact: ['req.headers.authorization', 'req.headers.cookie'],
});

module.exports = httpLogger;
