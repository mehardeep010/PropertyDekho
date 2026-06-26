// KYA KAR RAHA HAI: Poore app ka ek hi structured logger (Pino).
// KAISE KAR RAHA HAI: console.log ki jagah ye proper JSON logs banata hai jo production me
// log tools (CloudWatch/Datadog etc.) easily parse kar sakte hain. Development me 'pino-pretty'
// se colorful readable output aata hai. Level config se control hota hai.
const pino = require('pino');
const config = require('../config');

const isProd = config.env === 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  // Dev me pretty print; prod me raw JSON (fast + machine-readable).
  ...(isProd
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
        },
      }),
});

module.exports = logger;
