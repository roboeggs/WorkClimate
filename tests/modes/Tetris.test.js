import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TetrisMode from '../../modes/Tetris.js';
import { AppMode } from '../../core/AppConstants.js';

function createCtx() {
  return {
    matrix: {
      clearBitmask: vi.fn(),
      setPixel: vi.fn(),
      flush: vi.fn(),
      draw: vi.fn(),
      changeOrientation: vi.fn()
    },
    switchMode: vi.fn()
  };
}

describe('TetrisMode', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts and initializes current tetromino', () => {
    const mode = new TetrisMode(createCtx());

    mode.startGame();

    expect(mode.currentTetro).not.toBeNull();
    expect(mode.gameInterval).not.toBeNull();
    mode.exit();
  });

  it('switches mode on combo input', () => {
    const ctx = createCtx();
    const mode = new TetrisMode(ctx);

    mode.handleInput(3, 'combo');

    expect(ctx.switchMode).toHaveBeenCalledWith(AppMode.CLOCK);
  });

  it('detects x collision outside board', () => {
    const mode = new TetrisMode(createCtx());

    const collision = mode.checkCollision([[1]], -1, 0);

    expect(collision).toBe(TetrisMode.COLLISION_X);
  });

  it('detects bottom collision', () => {
    const mode = new TetrisMode(createCtx());

    const collision = mode.checkCollision([[1]], 0, 16);

    expect(collision).toBe(TetrisMode.COLLISION_BLOCKED);
  });

  it('moves tetromino on short left input', () => {
    const mode = new TetrisMode(createCtx());
    mode.startGame();
    mode.currentTetro = [[1]];
    mode.pos = { x: 3, y: 3 };

    mode.handleInput(0, 'short');

    expect(mode.pos.x).toBe(2);
    mode.exit();
  });
});
