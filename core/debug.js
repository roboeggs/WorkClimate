const DEBUG_STORAGE_KEY = 'snake.debug';

function toBoolean(value) {
  if (value === true || value === false) return value;
  if (value == null) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

export function isDebugEnabled() {
  try {
    return toBoolean(localStorage.getItem(DEBUG_STORAGE_KEY));
  } catch {
    return false;
  }
}

export function setDebugEnabled(enabled) {
  const value = Boolean(enabled);
  try {
    localStorage.setItem(DEBUG_STORAGE_KEY, value ? '1' : '0');
  } catch {
    // ignore storage failures
  }
  return value;
}

export function initDebugFromUrl() {
  if (typeof window === 'undefined' || !window.location) {
    return isDebugEnabled();
  }

  const params = new URLSearchParams(window.location.search);
  if (!params.has('debug')) {
    return isDebugEnabled();
  }

  const enabled = setDebugEnabled(params.get('debug'));
  if (enabled) {
    console.info('[debug] enabled');
  }
  return enabled;
}

export function debugLog(...args) {
  if (!isDebugEnabled()) {
    return;
  }
  console.log(...args);
}
