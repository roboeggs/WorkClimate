import { debugLog } from './debug.js';

export default class MultiKeyHandler {
  constructor(callback, shouldEmitHold = () => true) {
    this.keys = {};
    this.LONG_PRESS_THRESHOLD = 1000;
    this.HOLD_START_DELAY = 280;
    this.HOLD_REPEAT_INTERVAL = 90;
    this.onButtonAction = callback;
    this.shouldEmitHold = shouldEmitHold;
    this.comboHandled = false;
    
    // p5.js arrow key constants, defined when p5 loads
    this.LEFT_ARROW = 37;
    this.UP_ARROW = 38
    this.RIGHT_ARROW = 39;
    this.DOWN_ARROW = 40;
  }

  reset() {
    this.keys = {};
    this.comboHandled = false;
  }

  keyPressed(keyCode) {
    if (![this.LEFT_ARROW, this.RIGHT_ARROW, this.DOWN_ARROW, this.UP_ARROW].includes(keyCode)) return;

    if (!this.keys[keyCode]) {
      this.keys[keyCode] = {
        pressed: true,
        pressTime: millis(),
        handled: false,
        inCombo: false,
        holdStarted: false,
        lastHoldTick: 0
      };
    }

    this.comboHandled = false; // Reset when a new key is pressed.
  }

  keyReleased(keyCode) {
    const keyData = this.keys[keyCode];
      // If the key participated in a combo, ignore it.
    if (!keyData) return;
    if (keyData.inCombo) {
      delete this.keys[keyCode];
      return;
    }
    if (keyData.holdStarted) {
      delete this.keys[keyCode];
      return;
    }

    if (keyData) {
      const duration = millis() - keyData.pressTime;

      if (!this.comboHandled) {
        if (duration >= this.LONG_PRESS_THRESHOLD && !keyData.handled) {
          this.onLongPress(keyCode, duration);
        } else if (!keyData.handled) {
          this.onShortPress(keyCode, duration);
        }
      }

      delete this.keys[keyCode];
    }
  }

  update() {
    const currentTime = millis();

    const pressedKeys = Object.keys(this.keys).map(k => Number(k));

    // === Check two-key combo ===
    if (pressedKeys.length === 2 && !this.comboHandled) {
      const [k1, k2] = pressedKeys;
      const d1 = currentTime - this.keys[k1].pressTime;
      const d2 = currentTime - this.keys[k2].pressTime;

      if (d1 >= this.LONG_PRESS_THRESHOLD && d2 >= this.LONG_PRESS_THRESHOLD) {
        this.comboHandled = true;

        debugLog(`LONG COMBO: ${this.getPressedButton(k1)} + ${this.getPressedButton(k2)}`);

        this.onButtonAction(this.getPressedButton(k1) + this.getPressedButton(k2) + 2, 'combo');

        // Clear state immediately after combo to avoid stuck keys.
        this.reset();
        return;
      }
    }

    const downData = this.keys[this.DOWN_ARROW];
    if (downData && !downData.inCombo && !this.comboHandled && this.shouldEmitHold()) {
      const heldMs = currentTime - downData.pressTime;

      if (heldMs >= this.HOLD_START_DELAY) {
        if (!downData.holdStarted) {
          downData.holdStarted = true;
          downData.lastHoldTick = currentTime;
        }

        if (currentTime - downData.lastHoldTick >= this.HOLD_REPEAT_INTERVAL) {
          downData.lastHoldTick = currentTime;
          this.onButtonAction(this.getPressedButton(this.DOWN_ARROW), 'hold');
        }
      }
    }

  
  }

  onShortPress(keyCode, duration) {
    debugLog(`SHORT PRESS: ${this.getDirection(keyCode)} (${duration}ms)`);
    this.handleSpecificButton(keyCode, 'short');
  }

  onLongPress(keyCode, duration) {
    debugLog(`LONG PRESS: ${this.getDirection(keyCode)} (${duration}ms)`);
    this.handleSpecificButton(keyCode, 'long');
  }

  getDirection(keyCode) {
    switch (keyCode) {
      case this.LEFT_ARROW: return "LEFT";
      case this.RIGHT_ARROW: return "RIGHT";
      case this.DOWN_ARROW: return "DOWN";
      case this.UP_ARROW: return "UP";
      default: return `KEY_${keyCode}`;
    }
  }

  getPressedButton(keyCode) {
    let buttonIndex = -1;
    if (keyCode === this.LEFT_ARROW) buttonIndex = 0;
    if (keyCode === this.DOWN_ARROW) buttonIndex = 1;
    if (keyCode === this.RIGHT_ARROW) buttonIndex = 2;
    if (keyCode === this.UP_ARROW) buttonIndex = 3;
    return buttonIndex;
  }

  handleSpecificButton(keyCode, pressType) {
    let buttonIndex = this.getPressedButton(keyCode);

    if (buttonIndex !== -1 && this.onButtonAction) {
      this.onButtonAction(buttonIndex, pressType);
    }
  }
}
