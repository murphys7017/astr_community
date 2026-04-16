const crypto = require('crypto');
const config = require('../config/config');
const logger = require('../utils/logger').child({ module: 'http' });
const { runWithRequestContext } = require('../utils/requestContext');

const ignoredPaths = new Set(config.logging.request.ignorePaths);

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function createRequestLogger() {
  return (req, res, next) => {
    const requestIdHeader = req.headers['x-request-id'];
    const requestId = typeof requestIdHeader === 'string' && requestIdHeader.trim()
      ? requestIdHeader.trim()
      : crypto.randomUUID();

    req.id = requestId;
    res.setHeader('X-Request-Id', requestId);

    const requestPath = req.originalUrl || req.url;
    const shouldSkipLogging = ignoredPaths.has(req.path) || ignoredPaths.has(requestPath);
    const startedAt = process.hrtime.bigint();

    runWithRequestContext({
      requestId,
      method: req.method,
      path: requestPath,
      ip: getClientIp(req)
    }, () => {
      const finalize = (event) => {
        if (shouldSkipLogging) {
          return;
        }

        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
        const logMethod = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

        logger[logMethod]('Request completed', {
          event,
          requestId,
          method: req.method,
          path: requestPath,
          statusCode: res.statusCode,
          durationMs: Number(durationMs.toFixed(2)),
          ip: getClientIp(req),
          userAgent: req.headers['user-agent'],
          userId: req.user?.id || null,
          userType: req.user?.type || null,
          responseSize: Number(res.getHeader('content-length')) || null
        });
      };

      res.on('finish', () => finalize('finish'));
      res.on('close', () => {
        if (!res.writableEnded) {
          finalize('close');
        }
      });

      next();
    });
  };
}

module.exports = {
  createRequestLogger
};
