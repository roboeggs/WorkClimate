import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BlinkState, TimeSeparatorState } from '../../core/AppConstants.js';
import { Matrix, Orientation } from '../../modes/Matrix.js';

describe('Matrix', () => {
  beforeEach(() => {
    vi.useFakeTimers();

    globalThis.createCanvas = vi.fn(() => ({ parent: vi.fn() }));
    globalThis.noLoop = vi.fn();
    globalThis.resizeCanvas = vi.fn();
    globalThis.redraw = vi.fn();
    globalThis.background = vi.fn();
    globalThis.color = vi.fn(() => ({ setAlpha: vi.fn() }));
    globalThis.fill = vi.fn();
    globalThis.noStroke = vi.fn();
    globalThis.circle = vi.fn();
    globalThis.constrain = (value, min, max) => Math.min(max, Math.max(min, value));

    document.body.innerHTML = '<div id="matrix-host"></div>';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('initializes geometry for horizontal and vertical layouts', () => {
    const horizontal = new Matrix('red', 200, Orientation.HORIZONTAL);
    const vertical = new Matrix('red', 200, Orientation.VERTICAL);

    expect(horizontal.canvasWidth).toBe(400);
    expect(horizontal.canvasHeight).toBe(200);
    expect(vertical.canvasWidth).toBe(200);
    expect(vertical.canvasHeight).toBe(400);
  });

  it('setup creates canvas and emits layout event', () => {
    const matrix = new Matrix('red', 200, Orientation.HORIZONTAL);
    const onLayout = vi.fn();
    window.addEventListener('matrix-layout-change', onLayout);

    matrix.setup();

    expect(globalThis.createCanvas).toHaveBeenCalledWith(400, 200);
    expect(globalThis.noLoop).toHaveBeenCalled();
    expect(onLayout).toHaveBeenCalled();
  });

  it('clamps brightness and triggers redraw', () => {
    const matrix = new Matrix('red', 200, Orientation.HORIZONTAL);

    matrix.setBrightness(42);

    expect(matrix.getBrightness()).toBe(15);
    expect(globalThis.redraw).toHaveBeenCalled();
  });

  it('changeOrientation toggles orientation and resizes canvas', () => {
    const matrix = new Matrix('red', 200, Orientation.HORIZONTAL);

    matrix.changeOrientation();

    expect(matrix.orientation).toBe(Orientation.VERTICAL);
    expect(globalThis.resizeCanvas).toHaveBeenCalledWith(200, 400);
  });

  it('resizeModule recalculates size and requests redraw', () => {
    const matrix = new Matrix('red', 200, Orientation.HORIZONTAL);

    matrix.resizeModule(150);

    expect(matrix.moduleSize).toBe(150);
    expect(matrix.canvasWidth).toBe(300);
    expect(matrix.canvasHeight).toBe(150);
    expect(globalThis.resizeCanvas).toHaveBeenCalledWith(300, 150);
  });

  it('drawNumber ignores out-of-range time values', () => {
    const matrix = new Matrix('red', 200, Orientation.HORIZONTAL);
    const drawSpy = vi.spyOn(matrix, 'draw');

    matrix.drawNumber(30, 0, TimeSeparatorState.TIME_SEPARATOR_ON, BlinkState.BLINK_NONE);

    expect(drawSpy).not.toHaveBeenCalled();
  });

  it('drawNumber renders valid horizontal time and flushes matrix writes', () => {
    const matrix = new Matrix('red', 200, Orientation.HORIZONTAL);
    const writeSpy = vi.spyOn(matrix, 'maxWrite');
    const drawSpy = vi.spyOn(matrix, 'draw');

    matrix.drawNumber(12, 34, TimeSeparatorState.TIME_SEPARATOR_ON, BlinkState.BLINK_HOURS);

    expect(writeSpy).toHaveBeenCalled();
    expect(drawSpy).toHaveBeenCalled();
  });

  it('drawString returns false for invalid text and true for valid text', () => {
    const matrix = new Matrix('red', 200, Orientation.HORIZONTAL);

    expect(matrix.drawString('')).toBe(false);
    expect(matrix.drawString('HELLO', 0, 0)).toBe(true);
  });

  it('startScrollingText resolves and restores vertical orientation', async () => {
    const matrix = new Matrix('red', 200, Orientation.VERTICAL);

    const promise = matrix.startScrollingText('A', 8, 10);
    vi.advanceTimersByTime(3000);
    const completed = await promise;

    expect(completed).toBe(true);
    expect(matrix.orientation).toBe(Orientation.VERTICAL);
    expect(matrix.isScrolling()).toBe(false);
  });
});
