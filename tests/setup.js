import { vi } from 'vitest';

if (!globalThis.millis) {
  globalThis.millis = () => Date.now();
}

if (!globalThis.redraw) {
  globalThis.redraw = vi.fn();
}

if (!globalThis.constrain) {
  globalThis.constrain = (value, min, max) => Math.min(max, Math.max(min, value));
}
