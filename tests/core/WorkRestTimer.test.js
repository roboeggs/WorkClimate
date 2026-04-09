import { describe, expect, it, vi } from 'vitest';
import WorkRestTimer from '../../core/WorkRestTimer.js';
import { BlinkState, DeviceState } from '../../core/AppConstants.js';

describe('WorkRestTimer', () => {
  it('increments work time and draws with hours blink', () => {
    const matrix = { drawNumber: vi.fn() };
    const timer = new WorkRestTimer(matrix, () => 1);

    timer.tick(DeviceState.DEVICE_STATE_WORKING);

    expect(timer.getWorkTime()).toEqual({ hours: 0, minutes: 1 });
    expect(matrix.drawNumber).toHaveBeenCalledWith(0, 1, 1, BlinkState.BLINK_HOURS);
  });

  it('increments rest time and draws with minutes blink', () => {
    const matrix = { drawNumber: vi.fn() };
    const timer = new WorkRestTimer(matrix, () => 0);

    timer.tick(DeviceState.DEVICE_STATE_RESTING);

    expect(timer.getRestTime()).toEqual({ hours: 0, minutes: 1 });
    expect(matrix.drawNumber).toHaveBeenCalledWith(0, 1, 0, BlinkState.BLINK_MINUTES);
  });

  it('rolls over work minutes to hours', () => {
    const matrix = { drawNumber: vi.fn() };
    const timer = new WorkRestTimer(matrix, () => 1);
    timer.workMinutes = 59;

    timer.tick(DeviceState.DEVICE_STATE_WORKING);

    expect(timer.getWorkTime()).toEqual({ hours: 1, minutes: 0 });
  });

  it('resets counters', () => {
    const matrix = { drawNumber: vi.fn() };
    const timer = new WorkRestTimer(matrix, () => 1);
    timer.workHours = 5;
    timer.workMinutes = 33;
    timer.restHours = 2;
    timer.restMinutes = 44;

    timer.reset();

    expect(timer.getWorkTime()).toEqual({ hours: 0, minutes: 0 });
    expect(timer.getRestTime()).toEqual({ hours: 0, minutes: 0 });
  });
});
