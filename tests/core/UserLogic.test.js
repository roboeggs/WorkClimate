import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppMode, DeviceState } from '../../core/AppConstants.js';

function createMatrixMock() {
  return {
    setup: vi.fn(),
    drawNumber: vi.fn(),
    startScrollingText: vi.fn().mockResolvedValue(undefined),
    setBrightness: vi.fn(),
    orientation: 0,
    changeOrientation: vi.fn(),
    maxWrite: vi.fn(),
    draw: vi.fn(),
    clearBitmask: vi.fn(),
    setPixel: vi.fn(),
    flush: vi.fn()
  };
}

async function createLogicWithNrfSensors(sensors) {
  vi.resetModules();

  const fakeNrf = {
    getSensors: vi.fn(() => sensors),
    clearSensors: vi.fn(() => sensors.length)
  };

  window.deviceNrf = fakeNrf;

  const { default: UserLogic } = await import('../../core/UserLogic.js');
  const matrix = createMatrixMock();
  const logic = new UserLogic(matrix);
  return { logic, matrix, fakeNrf };
}

describe('UserLogic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    delete window.deviceNrf;
  });

  it('throws on invalid matrix', async () => {
    vi.resetModules();
    window.deviceNrf = { getSensors: () => [], clearSensors: () => 0 };
    const { default: UserLogic } = await import('../../core/UserLogic.js');

    expect(() => new UserLogic(null)).toThrow('Invalid matrix object');
  });

  it('changes brightness on right short action', async () => {
    const { logic, matrix } = await createLogicWithNrfSensors([]);
    const before = logic.brightness;

    logic.onRightShort();

    expect(logic.brightness).toBe((before + 1) & 0x0f);
    expect(matrix.setBrightness).toHaveBeenCalledWith(logic.brightness);
    expect(matrix.drawNumber).toHaveBeenCalled();
  });

  it('filters invalid and stale sensors during polling', async () => {
    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);

    const sensors = [
      { id: 1, type: 'DHT22', temperature: 22, humidity: 50, updatedAt: now },
      { id: 2, type: 'DHT22', temperature: Number.NaN, humidity: 50, updatedAt: now },
      { id: 3.5, type: 'DHT22', temperature: 22, humidity: 50, updatedAt: now },
      { id: 4, type: 'DHT22', temperature: 22, humidity: 50, updatedAt: now - 31 * 60 * 1000 }
    ];

    const { logic } = await createLogicWithNrfSensors(sensors);

    logic.lastNrfPollAt = 0;
    logic.pollNrfSensors();

    expect(logic.nrfSensors).toHaveLength(1);
    expect(logic.nrfSensors[0].id).toBe(1);
  });

  it('clears sensor state on down+up combo', async () => {
    const { logic, fakeNrf } = await createLogicWithNrfSensors([
      { id: 1, type: 'DHT22', temperature: 20, humidity: 40, updatedAt: Date.now() }
    ]);

    logic.nrfSensors = [{ id: 1 }];
    logic.pendingNewSensors = [{ id: 2 }];
    logic.knownSensorIds.add(1);
    logic.nrfSensorIndex = 3;

    logic.onComboDownUp();
    await Promise.resolve();
    await Promise.resolve();

    expect(fakeNrf.clearSensors).toHaveBeenCalled();
    expect(logic.nrfSensors).toEqual([]);
    expect(logic.pendingNewSensors).toEqual([]);
    expect(logic.knownSensorIds.size).toBe(0);
    expect(logic.nrfSensorIndex).toBe(0);
  });

  it('switches from clock to snake on combo in horizontal orientation', async () => {
    const { logic } = await createLogicWithNrfSensors([]);
    logic.matrix.orientation = 0;

    const switchSpy = vi.spyOn(logic, 'switchMode');
    logic.onComboLeftDown();

    expect(switchSpy).toHaveBeenCalledWith(AppMode.SNAKE);
  });

  it('tracks timer ticks outside normal state', async () => {
    const { logic } = await createLogicWithNrfSensors([]);
    const timerSpy = vi.spyOn(logic.timer, 'tick');
    logic.currentState = DeviceState.DEVICE_STATE_WORKING;

    logic.UpdateTimeTracking();

    expect(timerSpy).toHaveBeenCalledWith(DeviceState.DEVICE_STATE_WORKING);
  });

  it('toggles separator on down long in normal state', async () => {
    const { logic } = await createLogicWithNrfSensors([]);
    logic.currentState = DeviceState.DEVICE_STATE_NORMAL;
    const before = logic.separatorState;

    logic.onDownLong();

    expect(logic.separatorState).toBe(!before);
  });

  it('switches to resting on left short from working', async () => {
    const { logic, matrix } = await createLogicWithNrfSensors([]);
    logic.currentState = DeviceState.DEVICE_STATE_WORKING;
    vi.spyOn(logic.timer, 'getRestTime').mockReturnValue({ hours: 1, minutes: 2 });

    logic.onLeftShort();

    expect(logic.currentState).toBe(DeviceState.DEVICE_STATE_RESTING);
    expect(matrix.drawNumber).toHaveBeenCalled();
  });

  it('routes set-hours and set-minutes input handlers', async () => {
    const { logic } = await createLogicWithNrfSensors([]);
    const decHourSpy = vi.spyOn(logic, 'decHour');
    const incMinuteSpy = vi.spyOn(logic, 'incMinute');

    logic.handleSetHours(0, 'short');
    logic.handleSetMinutes(1, 'short');

    expect(decHourSpy).toHaveBeenCalled();
    expect(incMinuteSpy).toHaveBeenCalled();
  });

  it('skips handleInput when transition is active', async () => {
    const { logic } = await createLogicWithNrfSensors([]);
    logic.transitionInProgress = true;
    const normalSpy = vi.spyOn(logic, 'handleNormal');

    logic.handleInput(0, 'short');

    expect(normalSpy).not.toHaveBeenCalled();
  });

  it('switchMode resets handler and calls exit/enter hooks', async () => {
    const { logic } = await createLogicWithNrfSensors([]);
    const resetSpy = vi.spyOn(logic.keyHandler, 'reset');
    const transitionSpy = vi.spyOn(logic, 'runTextTransition').mockResolvedValue(true);

    const prevMode = { exit: vi.fn(), enter: vi.fn(), tick: vi.fn(), onMinute: vi.fn(), handleInput: vi.fn() };
    const nextMode = { exit: vi.fn(), enter: vi.fn(), tick: vi.fn(), onMinute: vi.fn(), handleInput: vi.fn() };
    logic.currentMode = prevMode;
    logic.modes[AppMode.SNAKE] = nextMode;

    await logic.switchMode(AppMode.SNAKE);

    expect(resetSpy).toHaveBeenCalled();
    expect(prevMode.exit).toHaveBeenCalledWith(AppMode.SNAKE);
    expect(nextMode.enter).toHaveBeenCalledWith(prevMode);
    expect(transitionSpy).toHaveBeenCalledWith('GAME');
  });

  it('onMinute skips mode callback during transition', async () => {
    const { logic } = await createLogicWithNrfSensors([]);
    const minuteSpy = vi.spyOn(logic.currentMode, 'onMinute');

    logic.transitionInProgress = true;
    logic.onMinute();

    expect(minuteSpy).not.toHaveBeenCalled();
  });

  it('formats sensor text with humidity and without humidity', async () => {
    const { logic } = await createLogicWithNrfSensors([]);

    const humid = logic.formatSensorText({ id: 5, type: 'DHT22', temperature: 22.4, humidity: 61.2 });
    const dry = logic.formatSensorText({ id: 6, type: 'DS18B20', temperature: -3.5, humidity: null });

    expect(humid).toContain('61%');
    expect(dry).toContain('Sensore:6 -3.5');
  });

  it('showNextSensorIfAny displays NO SENSOR when list is empty', async () => {
    const { logic } = await createLogicWithNrfSensors([]);
    const transitionSpy = vi.spyOn(logic, 'runTextTransition').mockResolvedValue(true);

    logic.nrfSensors = [];
    logic.showNextSensorIfAny();
    await Promise.resolve();

    expect(transitionSpy).toHaveBeenCalledWith('NO SENSOR');
  });

  it('setTime persists and redraws', async () => {
    const { logic } = await createLogicWithNrfSensors([]);
    const saveSpy = vi.spyOn(logic, 'saveToRTC').mockReturnValue(true);
    const updateSpy = vi.spyOn(logic, 'UpdateTime').mockImplementation(() => {});
    const printSpy = vi.spyOn(logic, 'printCurrentTime').mockImplementation(() => {});

    logic.setTime(12, 34, 56);

    expect(saveSpy).toHaveBeenCalledWith(12, 34, 56);
    expect(updateSpy).toHaveBeenCalled();
    expect(printSpy).toHaveBeenCalled();
  });

  it('exitTimeSetup returns to normal and saves RTC', async () => {
    const { logic } = await createLogicWithNrfSensors([]);
    const saveSpy = vi.spyOn(logic, 'saveToRTC').mockReturnValue(true);
    logic.currentState = DeviceState.DEVICE_STATE_SET_MINUTES;

    logic.exitTimeSetup();

    expect(logic.currentState).toBe(DeviceState.DEVICE_STATE_NORMAL);
    expect(saveSpy).toHaveBeenCalled();
  });

  it('saveToRTC returns false when rtc save fails', async () => {
    const { logic } = await createLogicWithNrfSensors([]);
    vi.spyOn(logic.rtc, 'save').mockReturnValue(false);

    const ok = logic.saveToRTC(1, 2, 3);

    expect(ok).toBe(false);
  });

  it('uses printCurrentTime branch in UpdateTimeTracking for normal state', async () => {
    const { logic } = await createLogicWithNrfSensors([]);
    logic.currentState = DeviceState.DEVICE_STATE_NORMAL;
    const printSpy = vi.spyOn(logic, 'printCurrentTime');

    logic.UpdateTimeTracking();

    expect(printSpy).toHaveBeenCalled();
  });

  it('pollNrfSensors returns early on throttle and handles missing device API', async () => {
    const { logic, fakeNrf } = await createLogicWithNrfSensors([{ id: 1, temperature: 25, updatedAt: Date.now() }]);

    logic.lastNrfPollAt = Date.now();
    const getSpy = vi.spyOn(fakeNrf, 'getSensors');
    logic.pollNrfSensors();
    expect(getSpy).not.toHaveBeenCalled();

    fakeNrf.getSensors = undefined;
    logic.nrfSensors = [{ id: 123 }];
    logic.lastNrfPollAt = 0;
    logic.pollNrfSensors();
    expect(logic.nrfSensors).toEqual([]);
  });

  it('runs new sensor flow and restores clock display', async () => {
    const { logic } = await createLogicWithNrfSensors([]);
    const transitionSpy = vi
      .spyOn(logic, 'runTextTransition')
      .mockImplementation((label) => Promise.resolve(label !== ''));
    const printSpy = vi.spyOn(logic, 'printCurrentTime').mockImplementation(() => {});

    logic.showNewSensorFlow({ id: 9, type: 'DHT22', temperature: 23, humidity: 52 });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(transitionSpy).toHaveBeenCalledWith('SENSOR ON 9');
    expect(transitionSpy).toHaveBeenCalledWith(expect.stringContaining('Sensore:9'));
    expect(printSpy).toHaveBeenCalled();
  });

  it('shows next sensor text when sensor list is available', async () => {
    const { logic } = await createLogicWithNrfSensors([]);
    const transitionSpy = vi.spyOn(logic, 'runTextTransition').mockResolvedValue(true);

    logic.nrfSensors = [{ id: 7, type: 'DS18B20', temperature: 19.5, updatedAt: Date.now() }];
    logic.showNextSensorIfAny();
    await Promise.resolve();

    expect(transitionSpy).toHaveBeenCalledWith(expect.stringContaining('Sensore:7'));
    expect(logic.nrfSensorIndex).toBe(0);
  });
});
