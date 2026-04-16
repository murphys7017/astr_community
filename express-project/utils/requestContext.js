const { AsyncLocalStorage } = require('async_hooks');

const requestContextStorage = new AsyncLocalStorage();

function runWithRequestContext(context, handler) {
  return requestContextStorage.run({ ...context }, handler);
}

function getRequestContext() {
  return requestContextStorage.getStore() || null;
}

function updateRequestContext(partialContext = {}) {
  const currentContext = requestContextStorage.getStore();
  if (!currentContext) {
    return;
  }

  Object.assign(currentContext, partialContext);
}

module.exports = {
  runWithRequestContext,
  getRequestContext,
  updateRequestContext
};
