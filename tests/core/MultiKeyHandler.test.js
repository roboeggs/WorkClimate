import { beforeEach, describe, expect, it, vi } from 'vitest';
import MultiKeyHandler from '../../core/MultiKeyHandler.js';

describe('MultiKeyHandler', () => {
  let now;

  beforeEach(() => {
    now = 0;
    globalThis.millis = () => now;
  });

  it('emits short press on quick release', () => {
    const callback = vi.fn();
    const handler = new MultiKeyHandler(callback);

    handler.keyPressed(37);
    now = 200;
    handler.keyReleased(37);

    expect(callback).toHaveBeenCalledWith(0, 'short');
  });

  it('emits long press on long release', () => {
    const callback = vi.fn();
    const handler = new MultiKeyHandler(callback);

    handler.keyPressed(39);
    now = 1200;
    handler.keyReleased(39);

    expect(callback).toHaveBeenCalledWith(2, 'long');
  });

  it('emits combo after both keys pass threshold', () => {
    const callback = vi.fn();
    const handler = new MultiKeyHandler(callback);

    handler.keyPressed(37);
    handler.keyPressed(39);
    now = 1200;
    handler.update();

    expect(callback).toHaveBeenCalledWith(4, 'combo');
  });

  it('emits repeating hold for down arrow when enabled', () => {
    const callback = vi.fn();
    const handler = new MultiKeyHandler(callback, () => true);

    handler.keyPressed(40);
    now = 300;
    handler.update();
    now = 390;
    handler.update();

    expect(callback).toHaveBeenCalledWith(1, 'hold');
  });

  it('does not emit hold when disabled by callback', () => {
    const callback = vi.fn();
    const handler = new MultiKeyHandler(callback, () => false);

    handler.keyPressed(40);
    now = 500;
    handler.update();
    now = 700;
    handler.update();

    expect(callback).not.toHaveBeenCalled();
  });
});
