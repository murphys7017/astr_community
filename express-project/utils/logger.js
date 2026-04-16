const util = require('util');
const config = require('../config/config');
const { getRequestContext } = require('./requestContext');

const LEVEL_PRIORITY = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50
};

const LOG_LEVEL = LEVEL_PRIORITY[config.logging.level] ? config.logging.level : 'info';
const LOG_FORMAT = config.logging.format === 'json' ? 'json' : 'pretty';
const RAW_STDOUT_WRITE = process.stdout.write.bind(process.stdout);
const RAW_STDERR_WRITE = process.stderr.write.bind(process.stderr);
const RESERVED_FIELDS = new Set(['time', 'level', 'msg', 'app', 'env', 'pid']);
const SENSITIVE_FIELD_PATTERN = /^(authorization|cookie|set-cookie|password|token|refresh_token|access_token|secret|clientsecret|client_secret)$/i;

function normalizeLevel(level) {
  return LEVEL_PRIORITY[level] ? level : 'info';
}

function serializeError(error) {
  if (!(error instanceof Error)) {
    return error;
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    code: error.code,
    status: error.status,
    statusCode: error.statusCode
  };
}

function sanitizeValue(value, depth = 0, seen = new WeakSet()) {
  if (value === null || value === undefined) {
    return value;
  }

  if (value instanceof Error) {
    return serializeError(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Buffer.isBuffer(value)) {
    return `[Buffer length=${value.length}]`;
  }

  if (typeof value === 'string') {
    return value.length > 2000 ? `${value.slice(0, 2000)}…` : value;
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (seen.has(value)) {
    return '[Circular]';
  }

  if (depth >= 4) {
    return Array.isArray(value) ? `[Array(${value.length})]` : '[Object]';
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.slice(0, 20).map(item => sanitizeValue(item, depth + 1, seen));
  }

  const serializedObject = {};
  Object.entries(value).slice(0, 20).forEach(([key, nestedValue]) => {
    serializedObject[key] = SENSITIVE_FIELD_PATTERN.test(key)
      ? '[Redacted]'
      : sanitizeValue(nestedValue, depth + 1, seen);
  });
  return serializedObject;
}

function normalizeMeta(meta) {
  if (meta === undefined) {
    return undefined;
  }

  if (meta instanceof Error) {
    return { error: serializeError(meta) };
  }

  if (typeof meta === 'object' && meta !== null) {
    return sanitizeValue(meta);
  }

  return { value: sanitizeValue(meta) };
}

function formatPretty(entry) {
  const contextSegments = [];

  if (entry.module) {
    contextSegments.push(entry.module);
  }
  if (entry.requestId) {
    contextSegments.push(`req:${entry.requestId}`);
  }
  if (entry.userId) {
    contextSegments.push(`user:${entry.userId}`);
  }
  if (entry.adminId) {
    contextSegments.push(`admin:${entry.adminId}`);
  }

  const header = [
    entry.time,
    entry.level.toUpperCase(),
    contextSegments.length > 0 ? `[${contextSegments.join(' ')}]` : ''
  ].filter(Boolean).join(' ');

  const details = {};
  Object.entries(entry).forEach(([key, value]) => {
    if (!RESERVED_FIELDS.has(key) && key !== 'module' && key !== 'requestId' && key !== 'userId' && key !== 'adminId') {
      details[key] = value;
    }
  });

  const detailsText = Object.keys(details).length > 0 ? ` ${JSON.stringify(details)}` : '';
  return `${header} ${entry.msg}${detailsText}`;
}

function formatJson(entry) {
  return JSON.stringify(entry);
}

function shouldLog(level) {
  return LEVEL_PRIORITY[normalizeLevel(level)] >= LEVEL_PRIORITY[LOG_LEVEL];
}

function buildEntry(level, message, meta, bindings = {}) {
  const requestContext = getRequestContext() || {};
  const normalizedMeta = normalizeMeta(meta);
  const entry = {
    time: new Date().toISOString(),
    level: normalizeLevel(level),
    msg: typeof message === 'string' ? message : util.format('%o', message),
    app: config.logging.appName,
    env: config.server.env,
    pid: process.pid,
    ...sanitizeValue(bindings),
    ...sanitizeValue(requestContext)
  };

  if (normalizedMeta) {
    Object.entries(normalizedMeta).forEach(([key, value]) => {
      if (RESERVED_FIELDS.has(key)) {
        entry[`meta_${key}`] = value;
      } else {
        entry[key] = value;
      }
    });
  }

  return entry;
}

function writeEntry(entry) {
  const formatted = LOG_FORMAT === 'json' ? formatJson(entry) : formatPretty(entry);
  const writer = LEVEL_PRIORITY[entry.level] >= LEVEL_PRIORITY.error ? RAW_STDERR_WRITE : RAW_STDOUT_WRITE;
  writer(`${formatted}\n`);
}

function isStructuredValue(value) {
  return Array.isArray(value) || (typeof value === 'object' && value !== null);
}

function normalizeConsoleArgs(args = []) {
  if (args.length === 0) {
    return { message: '' };
  }

  const errorArg = args.find(arg => arg instanceof Error);

  if (args.length === 1 && errorArg) {
    return {
      message: errorArg.message,
      meta: { error: errorArg }
    };
  }

  if (args.length === 2 && typeof args[0] === 'string') {
    if (args[1] instanceof Error) {
      return {
        message: args[0],
        meta: { error: args[1] }
      };
    }

    if (isStructuredValue(args[1])) {
      return {
        message: args[0],
        meta: { data: args[1] }
      };
    }
  }

  return {
    message: util.format(...args),
    meta: errorArg ? { error: errorArg } : undefined
  };
}

function createLogger(bindings = {}) {
  const loggerBindings = sanitizeValue(bindings);

  const logger = {
    child(childBindings = {}) {
      return createLogger({ ...loggerBindings, ...childBindings });
    },
    log(level, message, meta) {
      if (!shouldLog(level)) {
        return;
      }

      writeEntry(buildEntry(level, message, meta, loggerBindings));
    },
    debug(message, meta) {
      this.log('debug', message, meta);
    },
    info(message, meta) {
      this.log('info', message, meta);
    },
    warn(message, meta) {
      this.log('warn', message, meta);
    },
    error(message, meta) {
      this.log('error', message, meta);
    },
    fatal(message, meta) {
      this.log('fatal', message, meta);
    }
  };

  return logger;
}

let consoleBridgeInstalled = false;

function installConsoleBridge() {
  if (consoleBridgeInstalled) {
    return;
  }

  consoleBridgeInstalled = true;
  const consoleLogger = createLogger({ module: 'console' });

  console.log = (...args) => {
    const { message, meta } = normalizeConsoleArgs(args);
    consoleLogger.info(message, meta);
  };

  console.info = (...args) => {
    const { message, meta } = normalizeConsoleArgs(args);
    consoleLogger.info(message, meta);
  };

  console.warn = (...args) => {
    const { message, meta } = normalizeConsoleArgs(args);
    consoleLogger.warn(message, meta);
  };

  console.error = (...args) => {
    const { message, meta } = normalizeConsoleArgs(args);
    consoleLogger.error(message, meta);
  };

  console.debug = (...args) => {
    const { message, meta } = normalizeConsoleArgs(args);
    consoleLogger.debug(message, meta);
  };
}

const logger = createLogger({ module: 'app' });

module.exports = logger;
module.exports.createLogger = createLogger;
module.exports.installConsoleBridge = installConsoleBridge;
