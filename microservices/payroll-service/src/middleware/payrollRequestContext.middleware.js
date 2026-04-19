const { randomUUID } = require('crypto');
const logger = require('../config/logger');

/**
 * Ensures X-Request-ID / X-Correlation-ID for tracing; logs one line per request (structured).
 */
function payrollRequestContext(req, res, next) {
  const rid =
    req.get('X-Request-Id') ||
    req.get('x-request-id') ||
    req.get('X-Correlation-Id') ||
    req.get('x-correlation-id') ||
    randomUUID();
  req.requestId = rid;
  res.setHeader('X-Request-ID', rid);

  const start = Date.now();
  res.on('finish', () => {
    logger.info('payroll.http', {
      requestId: rid,
      method: req.method,
      path: req.originalUrl?.split('?')[0],
      status: res.statusCode,
      ms: Date.now() - start,
      userId: req.user?.id || null
    });
  });

  next();
}

module.exports = { payrollRequestContext };
