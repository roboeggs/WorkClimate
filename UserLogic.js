
const DeviceState = {
  DEVICE_STATE_NORMAL: 0,
  DEVICE_STATE_SET_HOURS: 1,
  DEVICE_STATE_SET_MINUTES: 2,
  DEVICE_STATE_WORKING: 3,
  DEVICE_STATE_RESTING: 4
}

const TimeSeparatorState = {
  TIME_SEPARATOR_OFF: 0,
  TIME_SEPARATOR_ON: 1
}

const BlinkState = {
    BLINK_NONE: 0,
    BLINK_HOURS: 1,
    BLINK_MINUTES: 2
} 

function UserLogic(matrix){
    if (!matrix || typeof matrix.setup !== 'function' || typeof matrix.drawNumber !== 'function') {
      throw new Error('Invalid matrix object');
    }

    this.brightness = 0x00; // Replacement for 'static' in C

    // Привязываем методы к контексту 'this'
    this.boundHandleUserInput = this.HandleUserInput.bind(this);
    this.boundHandleUserTimeMinutes = this.HandleUserTimeMinutes.bind(this);
    this.boundHandleUserTimeHours = this.HandleUserTimeHours.bind(this);

    // Устанавливаем начальный обработчик
    this.activeHandler = this.boundHandleUserInput;

    // Передаем в MultiKeyHandler функцию-обертку
    this.keyHandler = new MultiKeyHandler((btn, type) => {
      this.activeHandler(btn, type);
    });

    this.matrix = matrix;
    this.currentState = DeviceState.DEVICE_STATE_NORMAL;

    this.cachedHour = 0;
    this.cachedMinute = 0;

    this.workHours = 0;
    this.workMinutes = 0;
    this.restHours = 0;
    this.restMinutes = 0;

    this.separatorState = true;
    this.matrix.setup();

}


UserLogic.prototype.UpdateTime = function() {

    function formatTime(number) {
      return number < 10 ? '0' + number : number;
    }

    const now = new Date();
    const hours = formatTime(now.getHours());
    const minutes = formatTime(now.getMinutes());
    
    this.cachedHour = hours;
    this.cachedMinute = minutes;

    this.matrix.drawNumber(hours, minutes, 1, 0);


};

UserLogic.prototype.getTimeSeparatorState = function (){
  return this.separatorState ? TimeSeparatorState.TIME_SEPARATOR_ON : TimeSeparatorState.TIME_SEPARATOR_OFF;
}

UserLogic.prototype.printCurrentTime = function (){
  this.matrix.drawNumber(this.cachedHour, this.cachedMinute, this.getTimeSeparatorState(), BlinkState.BLINK_NONE);
}

UserLogic.prototype.HandleUserInput = function(btnIdx, pressType) {
  // --- BUTTON 0 (LEFT_ARROW) ---
  if (btnIdx === 0) {
    if (pressType === 'short') {
      if (this.currentState === DeviceState.DEVICE_STATE_WORKING) {
        this.currentState = DeviceState.DEVICE_STATE_RESTING;
        this.matrix.drawNumber(this.restHours, this.restMinutes, this.getTimeSeparatorState(), BlinkState.BLINK_MINUTES);
      } else if (this.currentState === DeviceState.DEVICE_STATE_RESTING || this.currentState === DeviceState.DEVICE_STATE_NORMAL) {
        this.currentState = DeviceState.DEVICE_STATE_WORKING;
        this.matrix.drawNumber(this.workHours, this.workMinutes, this.getTimeSeparatorState(), BlinkState.BLINK_HOURS);
      }
    } else { // LONG PRESS
      this.workHours = 0; this.workMinutes = 0;
      this.restHours = 0; this.restMinutes = 0;
      this.currentState = DeviceState.DEVICE_STATE_NORMAL;
      this.printCurrentTime();
    }
  }

  // --- BUTTON 1 (RIGHT_ARROW) ---
  if (btnIdx === 1) {
    if (pressType === 'short') {
      this.currentState = DeviceState.DEVICE_STATE_NORMAL;
      this.printCurrentTime();
    } else { // LONG PRESS
      this.separatorState = !this.separatorState;
      console.log(`Separator state toggled: ${this.separatorState ? 'ON' : 'OFF'}`);
      this.printCurrentTime();
    }
  }

  // --- BUTTON 2 (DOWN_ARROW) ---
  if (btnIdx === 2) {
    if (pressType === 'short') {
      this.brightness = (this.brightness + 1) & 0x0F; // Cycle 0-15
      // this.set_brightness(this.brightness);
      this.matrix.drawNumber(0, this.brightness, TimeSeparatorState.TIME_SEPARATOR_OFF, BlinkState.BLINK_NONE);
    } else { // LONG PRESS
      this.currentState = DeviceState.DEVICE_STATE_SET_HOURS;
      this.activeHandler = this.boundHandleUserTimeHours; // МЕНЯЕМ ОБРАБОТЧИК
      this.matrix.printTime(this.cachedHour, this.cachedMinute);
    }
  }
};

UserLogic.prototype.setTime = (hours, minutes, seconds) => {};
UserLogic.prototype.HandleUserTimeHours = function(btnIdx, pressType) {
    if (btnIdx === 0 && pressType === 'short') {
        this.cachedHour = (this.cachedHour <= 0) ? 23 : this.cachedHour - 1;
    } 
    if (btnIdx === 1 && pressType === 'short') {
        this.cachedHour = (this.cachedHour >= 23) ? 0 : this.cachedHour + 1;
    }
    
    // Переход к минутам по долгому нажатию кнопки 2
    if (btnIdx === 1 && pressType === 'long') {
        this.currentState = DeviceState.DEVICE_STATE_SET_MINUTES;
        this.activeHandler = this.boundHandleUserTimeMinutes;
        this.saveToRTC(this.cachedMinute); // Using private method

    }

    this.matrix.printTime(this.cachedHour, this.cachedMinute);
};

UserLogic.prototype.HandleUserTimeMinutes = function(btnIdx, pressType) {
  // BUTTON 0 (LEFT_ARROW)
  if (btnIdx === 0) {
    if (pressType === 'short') {
      this.cachedMinute--;
      if (this.cachedMinute < 0) {
        this.cachedMinute = 59;
      }
    } else { // LONG PRESS
      this.currentState = DEVICE_STATE_SET_HOURS;
      this.activeHandler = this.boundHandleUserTimeHours; // ВОЗВРАЩАЕМ ОБРАБОТЧИК

      this.saveToRTC(this.cachedMinute); // Using private method
    }
  }

  // BUTTON 1 (RIGHT_ARROW)
  if (btnIdx === 1) {
    if (pressType === 'short') {
      this.cachedMinute++;
      if (this.cachedMinute > 59) {
        this.cachedMinute = 0;
      }
    } else { // LONG PRESS
      this.currentState = DEVICE_STATE_NORMAL;
      this.activeHandler = this.boundHandleUserInput; // ВОЗВРАЩАЕМ ОБРАБОТЧИК
      this.saveToRTC(this.cachedMinute); // Using private method
    }
  }

  // Update the display (this uses your translated print_time from earlier)
  this.matrix.printTime(this.cachedHour, this.cachedMinute);
};


UserLogic.prototype.saveToRTC = function(minutes) {
    console.log(`Saving ${minutes} to DS1307...`);
    // Your actual DS1307_SetMinute(minutes) logic goes here
};

 UserLogic.prototype.UpdateTimeTracking = function() {
    if (this.currentState == DeviceState.DEVICE_STATE_WORKING) {
        this.workMinutes++;
        if (this.workMinutes >= 60) {
            this.workMinutes = 0;
            if (this.workHours >= 99) {
                this.workHours = 0;
            }
            else{
                this.workHours++;
            }
        }
        this.matrix.drawNumber(this.workHours, this.workMinutes, this.getTimeSeparatorState(), BlinkState.BLINK_HOURS);
    } else if (this.currentState == DeviceState.DEVICE_STATE_RESTING) {
        this.restMinutes++;
        if (this.restMinutes >= 60) {
            this.restMinutes = 0;
            if(this.restHours >= 99) {
                this.restHours = 0;
            }
            else{
                this.restHours++;
            }
        }
        this.matrix.drawNumber(this.restHours, this.restMinutes, this.getTimeSeparatorState(), BlinkState.BLINK_MINUTES);
    } else if (this.currentState == DeviceState.DEVICE_STATE_NORMAL) {
        // Disolay the current time from the DS1307
        this.printCurrentTime();
    }
 };