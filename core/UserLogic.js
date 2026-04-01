
import BaseMode from './../modes/BaseMode.js';
import SnakeMode from './../modes/Snake.js';
import TetrisMode from './../modes/Tetris.js';
import { Orientation } from './../modes/Matrix.js';
import MultiKeyHandler from './MultiKeyHandler.js';
import { AppMode, BlinkState, TimeSeparatorState } from './AppConstants.js';
import { debugLog } from './debug.js';

class ClockMode extends BaseMode {
  enter() {
    this.ctx.activeHandler = this.ctx.boundHandleUserInput;
    this.ctx.currentState = UserLogic.DeviceState.DEVICE_STATE_NORMAL;
    this.ctx.UpdateTime();
    this.ctx.printCurrentTime();
  }

  handleInput(btnIdx, pressType) {
    this.ctx.activeHandler(btnIdx, pressType);
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

    this.brightness = 0x0F; // 16 уровней: 0..15

    // Привязываем методы к контексту 'this'
    this.boundHandleUserInput = this.HandleUserInput.bind(this);
    this.boundHandleUserTimeMinutes = this.HandleUserTimeMinutes.bind(this);
    this.boundHandleUserTimeHours = this.HandleUserTimeHours.bind(this);

    // Устанавливаем начальный обработчик
    this.activeHandler = this.boundHandleUserInput;

    this.matrix = matrix;
    this.currentState = UserLogic.DeviceState.DEVICE_STATE_NORMAL;

    this.cachedHour = 0;
    this.cachedMinute = 0;

    this.workHours = 0;
    this.workMinutes = 0;
    this.restHours = 0;
    this.restMinutes = 0;

    this.separatorState = true;
    this.rtcOffsetMs = 0;
    this.rtcStorageKey = 'snake.rtcOffsetMs';

    this.loadRtcOffset();

    this.matrix.setup();
    this.matrix.setBrightness(this.brightness);

    this.modes = {
      [AppMode.CLOCK]: new ClockMode(this),
      [AppMode.TETRIS]: new TetrisMode(this),
      [AppMode.SNAKE]: new SnakeMode(this)
    };

    this.currentMode = this.modes[AppMode.CLOCK];
    this.currentMode.enter(null);

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
        this.currentState === UserLogic.DeviceState.DEVICE_STATE_SET_HOURS ||
        this.currentState === UserLogic.DeviceState.DEVICE_STATE_SET_MINUTES
      ) {
        this.separatorState = !this.separatorState;
        this.printCurrentTime();
      }
    }, 500);
  }

  UpdateTime() {
    const now = this.getRtcNow();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    this.cachedHour = hours;
    this.cachedMinute = minutes;

  }

  getRtcNow() {
    return new Date(Date.now() + this.rtcOffsetMs);
  }

  loadRtcOffset() {
    try {
      const raw = localStorage.getItem(this.rtcStorageKey);
      if (raw === null) {
        return;
      }

      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        this.rtcOffsetMs = parsed;
      }
    } catch (err) {
      console.warn('RTC offset load failed:', err);
    }
  }

  persistRtcOffset() {
    try {
      localStorage.setItem(this.rtcStorageKey, String(this.rtcOffsetMs));
    } catch (err) {
      console.warn('RTC offset save failed:', err);
    }
  }

  getTimeSeparatorState() {
    return this.separatorState ? TimeSeparatorState.TIME_SEPARATOR_ON : TimeSeparatorState.TIME_SEPARATOR_OFF;
  }

  printCurrentTime() {
    this.matrix.drawNumber(this.cachedHour, this.cachedMinute, this.getTimeSeparatorState(), BlinkState.BLINK_NONE);
  }

  HandleUserInput(btnIdx, pressType) {
    // --- BUTTON 0 (LEFT_ARROW) ---
    if (btnIdx === 0) {
      if (pressType === 'short') {
        if (this.currentState === UserLogic.DeviceState.DEVICE_STATE_WORKING) {
          this.currentState = UserLogic.DeviceState.DEVICE_STATE_RESTING;
          this.matrix.drawNumber(this.restHours, this.restMinutes, this.getTimeSeparatorState(), BlinkState.BLINK_MINUTES);
        } else if (
          this.currentState === UserLogic.DeviceState.DEVICE_STATE_RESTING ||
          this.currentState === UserLogic.DeviceState.DEVICE_STATE_NORMAL
        ) {
          this.currentState = UserLogic.DeviceState.DEVICE_STATE_WORKING;
          this.matrix.drawNumber(this.workHours, this.workMinutes, this.getTimeSeparatorState(), BlinkState.BLINK_HOURS);
        }
      } else if (pressType === 'long') {
        this.workHours = 0;
        this.workMinutes = 0;
        this.restHours = 0;
        this.restMinutes = 0;
        this.currentState = UserLogic.DeviceState.DEVICE_STATE_NORMAL;
        this.printCurrentTime();
      }
    }

    // --- BUTTON 1 (DOWN_ARROW) ---
    if (btnIdx === 1) {
      if (pressType === 'short') {
        this.currentState = UserLogic.DeviceState.DEVICE_STATE_NORMAL;
        this.printCurrentTime();
        debugLog('Stopped work/rest timer and returned to normal time display.');
      } else if (pressType === 'long') {
        if (
          this.currentState === UserLogic.DeviceState.DEVICE_STATE_WORKING ||
          this.currentState === UserLogic.DeviceState.DEVICE_STATE_RESTING
        ) {
          this.currentState = UserLogic.DeviceState.DEVICE_STATE_NORMAL;
          this.printCurrentTime();
        } else {
          this.separatorState = !this.separatorState;
          debugLog(`Separator state toggled: ${this.separatorState ? 'ON' : 'OFF'}`);
          this.printCurrentTime();
        }
      }
    }

    // --- BUTTON 2 (RIGHT_ARROW) ---
    if (btnIdx === 2) {
      if (pressType === 'short') {
        this.brightness = (this.brightness + 1) & 0x0F; // Cycle 0-15
        this.matrix.setBrightness(this.brightness);
        this.matrix.drawNumber(0, this.brightness, TimeSeparatorState.TIME_SEPARATOR_OFF, BlinkState.BLINK_NONE);
      } else if (pressType === 'long') {
        this.currentState = UserLogic.DeviceState.DEVICE_STATE_SET_HOURS;
        this.activeHandler = this.boundHandleUserTimeHours; // МЕНЯЕМ ОБРАБОТЧИК
        this.printCurrentTime();
      }
    }

    if (pressType === 'combo') {
      switch (btnIdx) {
        case 3: // LEFT + DOWN
          if (this.matrix.orientation === Orientation.HORIZONTAL) {
            this.switchMode(AppMode.SNAKE);
          } else {
            this.switchMode(AppMode.TETRIS);
          }
          break;
        case 4: // LEFT + RIGHT
          // this.switchMode(AppMode.TETRIS);
          this.matrix.changeOrientation();
          this.printCurrentTime();
          break;
      }
    }
  }

  switchMode(nextModeName) {
    const nextMode = this.modes[nextModeName];

    if (!nextMode || nextMode === this.currentMode) {
      return;
    }

    if (this.keyHandler && typeof this.keyHandler.reset === 'function') {
      this.keyHandler.reset();
    }

    const prevMode = this.currentMode;
    prevMode.exit(nextModeName);
    this.currentMode = nextMode;
    this.currentMode.enter(prevMode);
  }

  tick() {
    this.currentMode.tick();
  }

  onMinute() {
    this.currentMode.onMinute();
  }

  HandleUserTimeHours(btnIdx, pressType) {
    if (btnIdx === 0 && pressType === 'short') {
      this.cachedHour = (this.cachedHour <= 0) ? 23 : this.cachedHour - 1;
    }
    if (btnIdx === 1 && pressType === 'short') {
      this.cachedHour = (this.cachedHour >= 23) ? 0 : this.cachedHour + 1;
    }

    // Переход к минутам по долгому нажатию кнопки 2
    if (btnIdx === 1 && pressType === 'long') {
      this.currentState = UserLogic.DeviceState.DEVICE_STATE_SET_MINUTES;
      this.activeHandler = this.boundHandleUserTimeMinutes;
    }
    this.printCurrentTime();
  }

  HandleUserTimeMinutes(btnIdx, pressType) {
    // BUTTON 0 (LEFT_ARROW)
    if (btnIdx === 0) {
      if (pressType === 'short') {
        this.cachedMinute--;
        if (this.cachedMinute < 0) {
          this.cachedMinute = 59;
        }
      } else if (pressType === 'long') {
        this.currentState = UserLogic.DeviceState.DEVICE_STATE_SET_HOURS;
        this.activeHandler = this.boundHandleUserTimeHours; // ВОЗВРАЩАЕМ ОБРАБОТЧИК
        this.saveToRTC();
      }
    }

    // BUTTON 1 (RIGHT_ARROW)
    if (btnIdx === 1) {
      if (pressType === 'short') {
        this.cachedMinute++;
        if (this.cachedMinute > 59) {
          this.cachedMinute = 0;
        }
      } else if (pressType === 'long') {
        this.currentState = UserLogic.DeviceState.DEVICE_STATE_NORMAL;
        this.activeHandler = this.boundHandleUserInput; // ВОЗВРАЩАЕМ ОБРАБОТЧИК
        this.saveToRTC();
      }
    }
    // Update the display (this uses your translated print_time from earlier)
    this.printCurrentTime();
  }

  setTime(hours, minutes, seconds = 0) {
    this.saveToRTC(hours, minutes, seconds);
    this.UpdateTime();
    this.printCurrentTime();
  }

  saveToRTC(hours = this.cachedHour, minutes = this.cachedMinute, seconds = 0) {
    const h = Number(hours);
    const m = Number(minutes);
    const s = Number(seconds);

    if (
      !Number.isInteger(h) || !Number.isInteger(m) || !Number.isInteger(s) ||
      h < 0 || h > 23 || m < 0 || m > 59 || s < 0 || s > 59
    ) {
      console.warn('Invalid RTC time:', { hours, minutes, seconds });
      return false;
    }

    const systemNow = new Date();
    const targetNow = new Date(systemNow);
    targetNow.setHours(h, m, s, 0);

    this.rtcOffsetMs = targetNow.getTime() - systemNow.getTime();
    this.persistRtcOffset();

    debugLog(`RTC emulated time saved: ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} (offset ${this.rtcOffsetMs} ms)`);
    return true;
  }

  UpdateTimeTracking() {
    if (this.currentState == UserLogic.DeviceState.DEVICE_STATE_WORKING) {
      this.workMinutes++;
      if (this.workMinutes >= 60) {
        this.workMinutes = 0;
        if (this.workHours >= 99) {
          this.workHours = 0;
        }
        else {
          this.workHours++;
        }
      }
      this.matrix.drawNumber(this.workHours, this.workMinutes, this.getTimeSeparatorState(), BlinkState.BLINK_HOURS);
    } else if (this.currentState == UserLogic.DeviceState.DEVICE_STATE_RESTING) {
      this.restMinutes++;
      if (this.restMinutes >= 60) {
        this.restMinutes = 0;
        if (this.restHours >= 99) {
          this.restHours = 0;
        }
        else {
          this.restHours++;
        }
      }
      this.matrix.drawNumber(this.restHours, this.restMinutes, this.getTimeSeparatorState(), BlinkState.BLINK_MINUTES);
    } else if (this.currentState == UserLogic.DeviceState.DEVICE_STATE_NORMAL) {
      // Disolay the current time from the DS1307
      this.printCurrentTime();
    }
  }
}

UserLogic.DeviceState = Object.freeze({
  DEVICE_STATE_NORMAL: 0,
  DEVICE_STATE_SET_HOURS: 1,
  DEVICE_STATE_SET_MINUTES: 2,
  DEVICE_STATE_WORKING: 3,
  DEVICE_STATE_RESTING: 4
});