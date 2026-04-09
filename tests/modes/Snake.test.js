import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SnakeMode from '../../modes/Snake.js';
import { AppMode } from '../../core/AppConstants.js';

function createCtx() {
  return {
    matrix: {
      maxWrite: vi.fn(),
      draw: vi.fn()
    },
    switchMode: vi.fn()
  };
}

describe('SnakeMode', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts game with initial snake and food', () => {
    const mode = new SnakeMode(createCtx());

    mode.startGame();

    expect(mode.snake).toHaveLength(3);
    expect(mode.food).not.toBeNull();
    mode.stopLoop();
  });

  it('switches to clock on combo input', () => {
    const ctx = createCtx();
    const mode = new SnakeMode(ctx);

    mode.handleInput(3, 'combo');

    expect(ctx.switchMode).toHaveBeenCalledWith(AppMode.CLOCK);
  });

  it('sets game over on wall collision', () => {
    const mode = new SnakeMode(createCtx());
    mode.startGame();
    mode.snake = [{ x: 15, y: 3 }, { x: 14, y: 3 }, { x: 13, y: 3 }];
    mode.dir = { x: 1, y: 0 };
    mode.nextDir = { x: 1, y: 0 };

    mode.step();

    expect(mode.isGameOver).toBe(true);
    mode.stopLoop();
  });

  it('grows snake when food is eaten', () => {
    const mode = new SnakeMode(createCtx());
    mode.startGame();
    mode.snake = [{ x: 2, y: 2 }, { x: 1, y: 2 }, { x: 0, y: 2 }];
    mode.dir = { x: 1, y: 0 };
    mode.nextDir = { x: 1, y: 0 };
    mode.food = { x: 3, y: 2 };

    const before = mode.snake.length;
    mode.step();

    expect(mode.snake.length).toBe(before + 1);
    mode.stopLoop();
  });
});
