import BaseMode from './../modes/BaseMode.js';
import SnakeMode from './../modes/Snake.js';
import TetrisMode from './../modes/Tetris.js';
import { Orientation } from './../modes/Matrix.js';
import MultiKeyHandler from './MultiKeyHandler.js';
import { AppMode, BlinkState, TimeSeparatorState, DeviceState } from './AppConstants.js';
import { debugLog } from './debug.js';
import RTC from './RTC.js';
import WorkRestTimer from './WorkRestTimer.js';
import { deviceNrf  } from './nrf24l01.js';

class ClockMode extends BaseMode {
  enter() {
    this.ctx.currentState = DeviceState.DEVICE_STATE_NORMAL;
    this.ctx.UpdateTime();
    this.ctx.printCurrentTime();
  }

  handleInput(btnIdx, pressType) {
    this.ctx.handleInput(btnIdx, pressType);
  }

  onMinute() {
    this.ctx.UpdateTime();
    this.ctx.UpdateTimeTracking();
  }
}

export default class UserLogic {
  constructor(matrix) {
    if (!matrix || typeof matrix.setup !== 'function' || typeof matrix.drawNumber !== 'function') {
      throw new Error('Invalid matrix object');
    }

    this.nrfSensors = [];
    this.nrfSensorIndex = 0;
    this.lastNrfPollAt = 0;
    this.nrfPollIntervalMs = 500; // опрос 2 раза в секунду
    this.nrfMaxSensorAgeMs = 30 * 60 * 1000; // 30 минут
    this.pendingNewSensors = [];
    this.knownSensorIds = new Set();
    this.sensorFlowInProgress = false;

    this.brightness = 0x0F; // 16 уровней: 0..15


    this.stateHandlers = {
      [DeviceState.DEVICE_STATE_NORMAL]: this.handleNormal,
      [DeviceState.DEVICE_STATE_SET_HOURS]: this.handleSetHours,
      [DeviceState.DEVICE_STATE_SET_MINUTES]: this.handleSetMinutes,
      [DeviceState.DEVICE_STATE_WORKING]: this.handleWorking,
      [DeviceState.DEVICE_STATE_RESTING]: this.handleResting,
    };


    this.matrix = matrix;
    this.currentState = DeviceState.DEVICE_STATE_NORMAL;

    this.cachedHour = 0;
    this.cachedMinute = 0;

    this.separatorState = true;
    this.transitionInProgress = false;

    this.rtc = new RTC();
    this.timer = new WorkRestTimer(this.matrix, () => this.getTimeSeparatorState());

    this.matrix.setup();
    this.matrix.setBrightness(this.brightness);

    this.modes = {
      [AppMode.CLOCK]: new ClockMode(this),
      [AppMode.TETRIS]: new TetrisMode(this),
      [AppMode.SNAKE]: new SnakeMode(this)
    };

    this.currentMode = this.modes[AppMode.CLOCK];
    this.currentMode.enter(null);

    this.onSensorAnnounced = (event) => {
      const sensor = event?.detail?.sensor;
      const isNew = Boolean(event?.detail?.isNew);
      const sensorId = Number(sensor?.id);

      if (!Number.isInteger(sensorId)) {
        return;
      }

      this.knownSensorIds.add(sensorId);

      if (isNew) {
        this.pendingNewSensors.push({ ...sensor, id: sensorId });
      }
    };

    this.onSensorsCleared = () => {
      this.nrfSensors = [];
      this.pendingNewSensors = [];
      this.knownSensorIds.clear();
      this.nrfSensorIndex = 0;
    };

    window.addEventListener('nrf:sensor-announced', this.onSensorAnnounced);
    window.addEventListener('nrf:sensors-cleared', this.onSensorsCleared);
    this.pollNrfSensors();
    this.nrfSensors.forEach((sensor) => {
      this.knownSensorIds.add(Number(sensor.id));
    });

    // Передаем в MultiKeyHandler функцию-обертку
    this.keyHandler = new MultiKeyHandler(
      (btn, type) => {
        this.currentMode.handleInput(btn, type);
      },
      () => this.currentMode === this.modes[AppMode.TETRIS] || this.currentMode === this.modes[AppMode.SNAKE]
    );

    // Запускаем мигание раз в 500мс (полный цикл 1 сек)
    this.blinkIntervalId = setInterval(() => {
      // Это заставит двоеточие мигать само по себе
      if (
        this.currentState === DeviceState.DEVICE_STATE_SET_HOURS ||
        this.currentState === DeviceState.DEVICE_STATE_SET_MINUTES
      ) {
        this.separatorState = !this.separatorState;
        this.printCurrentTime();
      }
    }, 500);
  }

  UpdateTime() {
    const now = this.rtc.now();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    this.cachedHour = hours;
    this.cachedMinute = minutes;

  }

  getTimeSeparatorState() {
    return this.separatorState ? TimeSeparatorState.TIME_SEPARATOR_ON : TimeSeparatorState.TIME_SEPARATOR_OFF;
  }

  printCurrentTime() {
    this.matrix.drawNumber(this.cachedHour, this.cachedMinute, this.getTimeSeparatorState(), BlinkState.BLINK_NONE);
  }

  runTextTransition(label, applyCallback) {
    if (this.transitionInProgress) {
      return Promise.resolve(false);
    }

    this.transitionInProgress = true;

    return this.matrix.startScrollingText(label)
      .then(() => {
        if (typeof applyCallback === 'function') {
          return applyCallback();
        }
        return true;
      })
      .finally(() => {
        this.transitionInProgress = false;
      });
  }

  getModeTransitionLabel(nextModeName) {
    if (nextModeName === AppMode.CLOCK) {
      return 'CLOCK';
    }

    if (nextModeName === AppMode.SNAKE || nextModeName === AppMode.TETRIS) {
      return 'GAME';
    }

    return '';
  }


  onLeftShort() {
    if (this.currentState === DeviceState.DEVICE_STATE_WORKING) {
      this.currentState = DeviceState.DEVICE_STATE_RESTING;
      const restTime = this.timer.getRestTime();
      this.matrix.drawNumber(restTime.hours, restTime.minutes, this.getTimeSeparatorState(), BlinkState.BLINK_MINUTES);
    } else if (
      this.currentState === DeviceState.DEVICE_STATE_RESTING ||
      this.currentState === DeviceState.DEVICE_STATE_NORMAL
    ) {
      this.runTextTransition('WORK', () => {
        this.currentState = DeviceState.DEVICE_STATE_WORKING;
        const workTime = this.timer.getWorkTime();
        this.matrix.drawNumber(workTime.hours, workTime.minutes, this.getTimeSeparatorState(), BlinkState.BLINK_HOURS);
      });
      return;
    }
  }

  onLeftLong() {
    this.runTextTransition('CLOCK', () => {
      this.timer.reset();
      this.currentState = DeviceState.DEVICE_STATE_NORMAL;
      this.printCurrentTime();
    });
  }

  onDownShort() {
    this.runTextTransition('CLOCK', () => {
      this.currentState = DeviceState.DEVICE_STATE_NORMAL;
      this.printCurrentTime();
      debugLog('Stopped work/rest timer and returned to normal time display.');
    });
  }

  onDownLong() {
    if (
      this.currentState === DeviceState.DEVICE_STATE_WORKING ||
      this.currentState === DeviceState.DEVICE_STATE_RESTING
    ) {
      this.runTextTransition('CLOCK', () => {
        this.currentState = DeviceState.DEVICE_STATE_NORMAL;
        this.printCurrentTime();
      });
      return;
    } else {
      this.separatorState = !this.separatorState;
      debugLog(`Separator state toggled: ${this.separatorState ? 'ON' : 'OFF'}`);
      this.printCurrentTime();
    }
  }

  onRightShort() {
    this.brightness = (this.brightness + 1) & 0x0F; // Cycle 0-15
    this.matrix.setBrightness(this.brightness);
    this.matrix.drawNumber(0, this.brightness, TimeSeparatorState.TIME_SEPARATOR_OFF, BlinkState.BLINK_NONE);
  }

  onRightLong() {
    this.runTextTransition('SETTING THE CLOCK', () => {
      this.currentState = DeviceState.DEVICE_STATE_SET_HOURS;
      this.printCurrentTime();
    });
  }

  onComboLeftDown() {
    if (this.matrix.orientation === Orientation.HORIZONTAL) {
      this.switchMode(AppMode.SNAKE);
    } else {
      this.switchMode(AppMode.TETRIS);
    }
  }

  onUpShort() {
    this.pollNrfSensors();

    if (this.pendingNewSensors.length > 0) {
      const newSensor = this.pendingNewSensors.shift();
      this.showNewSensorFlow(newSensor);
      return;
    }

    this.showNextSensorIfAny();
  }


  onComboLeftRight() {
    this.matrix.changeOrientation();
    this.printCurrentTime();
  }

  onComboDownUp(){
    if (this.transitionInProgress || this.sensorFlowInProgress) {
      return;
    }

    const removedCount = deviceNrf && typeof deviceNrf.clearSensors === 'function'
      ? deviceNrf.clearSensors()
      : 0;

    this.nrfSensors = [];
    this.pendingNewSensors = [];
    this.knownSensorIds.clear();
    this.nrfSensorIndex = 0;

    if (removedCount > 0) {
      this.sensorFlowInProgress = true;
      this.runTextTransition('SENSORS CLEARED')
        .finally(() => {
          this.sensorFlowInProgress = false;
          if (this.currentMode === this.modes[AppMode.CLOCK]) {
            this.printCurrentTime();
          }
        });
    } else {
      this.printCurrentTime();
    }
  }


  handleNormal(btnIdx, pressType) {
    const map = {
      "0:short": () => this.onLeftShort(),
      "0:long": () => this.onLeftLong(),
      "1:short": () => this.onDownShort(),
      "2:short": () => this.onRightShort(),
      "2:long": () => this.onRightLong(),

      "3:short": () => this.onUpShort(),

      "3:combo": () => this.onComboLeftDown(),
      "4:combo": () => this.onComboLeftRight(),

      "6:combo": () => this.onComboDownUp()

    };
    map[`${btnIdx}:${pressType}`]?.();
  }

  handleWorking(btnIdx, pressType) {
    this.handleNormal(btnIdx, pressType);
  }

  handleResting(btnIdx, pressType) {
    this.handleNormal(btnIdx, pressType);
  }

  handleSetHours(btnIdx, pressType) {
    const map = {
      "0:short": () => this.decHour(),
      "1:short": () => this.incHour(),
      "1:long": () => this.goToMinutes(),
    };

    this.printCurrentTime(); // ????


    map[`${btnIdx}:${pressType}`]?.();
  }


  handleSetMinutes(btnIdx, pressType) {
    const map = {
      "0:short": () => this.decMinute(),
      "1:short": () => this.incMinute(),

      "0:long": () => this.goToHours(),
      "1:long": () => this.exitTimeSetup(),
    };

    this.printCurrentTime(); // ????


    map[`${btnIdx}:${pressType}`]?.();
  }

  handleInput(btnIdx, pressType) {
    if (this.transitionInProgress) return;

    const handler = this.stateHandlers[this.currentState];
    handler?.call(this, btnIdx, pressType);
  }

  async switchMode(nextModeName) {
    const nextMode = this.modes[nextModeName];

    if (!nextMode || nextMode === this.currentMode || this.transitionInProgress) {
      return;
    }

    this.transitionInProgress = true;

    try {
      if (this.keyHandler && typeof this.keyHandler.reset === 'function') {
        this.keyHandler.reset();
      }

      const prevMode = this.currentMode;
      prevMode.exit(nextModeName);

      const transitionLabel = this.getModeTransitionLabel(nextModeName);
      if (transitionLabel) {
        await this.runTextTransition(transitionLabel);
      }

      this.currentMode = nextMode;
      this.currentMode.enter(prevMode);
    } finally {
      this.transitionInProgress = false;
    }
  }

  tick() {
    this.currentMode.tick();
    this.pollNrfSensors();
  }

  onMinute() {
    // Обновляем время только когда нет активного текстового перехода.
    if (!this.transitionInProgress) {
      this.currentMode.onMinute();
    }
    this.pollNrfSensors();
  }

  decHour() {
    this.cachedHour = (this.cachedHour <= 0) ? 23 : this.cachedHour - 1;
    this.printCurrentTime();
  }

  incHour() {
    this.cachedHour = (this.cachedHour >= 23) ? 0 : this.cachedHour + 1;
    this.printCurrentTime();

  }

  goToMinutes() {
    this.runTextTransition('SETTING THE MINUTES', () => {
      this.currentState = DeviceState.DEVICE_STATE_SET_MINUTES;
      this.printCurrentTime();
    });
  }

  goToHours() {
    this.saveToRTC();
    this.currentState =
      DeviceState.DEVICE_STATE_SET_HOURS;
  }


  decMinute() {
    this.cachedMinute--;
    if (this.cachedMinute < 0) {
      this.cachedMinute = 59;
    }
  }
  incMinute() {
    this.cachedMinute++;
    if (this.cachedMinute > 59) {
      this.cachedMinute = 0;
    }
  }

  exitTimeSetup() {
    this.currentState = DeviceState.DEVICE_STATE_NORMAL;
    this.saveToRTC();
  }





  setTime(hours, minutes, seconds = 0) {
    this.saveToRTC(hours, minutes, seconds);
    this.UpdateTime();
    this.printCurrentTime();
  }

  saveToRTC(hours = this.cachedHour, minutes = this.cachedMinute, seconds = 0) {
    const saved = this.rtc.save(hours, minutes, seconds);
    if (!saved) {
      return false;
    }

    const h = Number(hours);
    const m = Number(minutes);
    const s = Number(seconds);
    debugLog(`RTC emulated time saved: ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} (offset ${this.rtc.offsetMs} ms)`);
    return true;
  }

  UpdateTimeTracking() {
    if (this.currentState === DeviceState.DEVICE_STATE_NORMAL) {
      this.printCurrentTime();
      return;
    }

    this.timer.tick(this.currentState);
  }



  /* =====================================================
     NRL24L01 support
  ===================================================== */

  pollNrfSensors() {
    const now = Date.now();
    if (now - this.lastNrfPollAt < this.nrfPollIntervalMs) return;
    this.lastNrfPollAt = now;

    if (!deviceNrf || typeof deviceNrf.getSensors !== 'function') {
      this.nrfSensors = [];
      return;
    }

    const sensors = deviceNrf.getSensors()
      .filter((s) => Number.isFinite(Number(s.temperature)))
      .filter((s) => Number.isInteger(Number(s.id)))
      .filter((s) => now - Number(s.updatedAt || 0) <= this.nrfMaxSensorAgeMs);

    sensors.sort((a, b) => Number(a.id) - Number(b.id));
    this.nrfSensors = sensors;
  }

  formatSensorText(sensor) {
    const temp = Number(sensor.temperature);
    const t = temp > 0 ? `+${temp}` : `${temp}`;
    const hasH = (sensor.type === 'DS18B20') ? 0 : Number.isFinite(Number(sensor.humidity));
    const degree = "°";
    if (hasH) {
      return `Sensore:${sensor.id} ${t}${degree} ${Number(sensor.humidity).toFixed(0)}%`;
    }
    return `Sensore:${sensor.id} ${t}${degree}`;
  }

  showNewSensorFlow(sensor) {
    if (!sensor || this.sensorFlowInProgress) return;
    if (this.currentMode !== this.modes[AppMode.CLOCK]) return;
    if (this.transitionInProgress) return;

    this.sensorFlowInProgress = true;

    this.runTextTransition(`SENSOR ON ${sensor.id}`)
      .then(() => this.runTextTransition(this.formatSensorText(sensor)))
      .finally(() => {
        this.sensorFlowInProgress = false;
        if (this.currentMode === this.modes[AppMode.CLOCK]) {
          this.printCurrentTime();
        }
      });
  }

  showNextSensorIfAny() {
    if (this.currentMode !== this.modes[AppMode.CLOCK]) return;
    if (this.transitionInProgress || this.sensorFlowInProgress) return;

    this.pollNrfSensors();

    if (!this.nrfSensors.length) {
      this.sensorFlowInProgress = true;
      this.runTextTransition('NO SENSOR')
        .finally(() => {
          this.sensorFlowInProgress = false;
          if (this.currentMode === this.modes[AppMode.CLOCK]) {
            this.printCurrentTime();
          }
        });
      return;
    }

    const sensor = this.nrfSensors[this.nrfSensorIndex % this.nrfSensors.length];
    this.nrfSensorIndex = (this.nrfSensorIndex + 1) % this.nrfSensors.length;

    this.sensorFlowInProgress = true;
    this.runTextTransition(this.formatSensorText(sensor))
      .finally(() => {
        this.sensorFlowInProgress = false;
        // после текста возвращаем обычный экран часов
        if (this.currentMode === this.modes[AppMode.CLOCK]) {
          this.printCurrentTime();
        }
      });
  }

}