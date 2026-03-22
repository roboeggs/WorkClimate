
const DeviceState = {
  DEVICE_STATE_NORMAL: 0,
  DEVICE_STATE_SET_HOURS: 1,
  DEVICE_STATE_SET_MINUTES: 2,
  DEVICE_STATE_WORKING: 3,
  DEVICE_STATE_RESTING: 4
}

function UserLogic(matrix){
    if (!matrix || typeof matrix.setup !== 'function' || typeof matrix.drawNumber !== 'function') {
      throw new Error('Invalid matrix object');
    }

    this.keyHandler = new MultiKeyHandler();

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


 UserLogic.prototype.HandleUserInput = function() {
  ButtonEvent event0 = ButtonsGetEventByIndex(0);
  ButtonEvent event1 = ButtonsGetEventByIndex(1);
  ButtonEvent event2 = ButtonsGetEventByIndex(2);

  if(event0 == BUTTON_EVENT_SHORT_PRESS){ // change timer state
      if(currentState == DEVICE_STATE_WORKING)
      {
          currentState = DEVICE_STATE_RESTING;
          draw_number(restHours, restMinutes, getTimeSeparatorState(), BLINK_MINUTES);
      }
      else if(currentState == DEVICE_STATE_RESTING || currentState == DEVICE_STATE_NORMAL)
      {
          currentState = DEVICE_STATE_WORKING;
          draw_number(workHours, workMinutes, getTimeSeparatorState(), BLINK_HOURS);
      }
  }
  if(event0 == BUTTON_EVENT_LONG_PRESS){ // reset all timers
      workHours = 0;
      workMinutes = 0;
      restHours = 0;
      restMinutes = 0;
      currentState = DEVICE_STATE_NORMAL;
      printCurrentTime();
  } 
  if(event1 == BUTTON_EVENT_LONG_PRESS){
      separatorState = !separatorState;
      printCurrentTime();
  } 

  if(event1 == BUTTON_EVENT_SHORT_PRESS){ // show time
      currentState = DEVICE_STATE_NORMAL;
      printCurrentTime();
  }
  if(event2 == BUTTON_EVENT_SHORT_PRESS){ // change brightness
      static uint8_t brightness = 0x00;
      brightness += 0x01;
      if (brightness > 0x0F) {
          brightness = 0x00;
      }
      set_brightness(brightness);
      draw_number(0, brightness, TIME_SEPARATOR_OFF, BLINK_NONE);

  }
  if(event2 == BUTTON_EVENT_LONG_PRESS){ // setup time
      currentState = DEVICE_STATE_SET_HOURS;
      print_time(cachedHour, cachedMinute);
  }

};
 UserLogic.prototype.setTime = (hours, minutes, seconds) => {};
 UserLogic.prototype.HandleUserTimeHours = () => {};
 UserLogic.prototype.HandleUserTimeMinutes = () => {};

 UserLogic.prototype.UpdateTimeTracking = () => {};

 UserLogic.prototype.MyHandle = function()  {

  switch (this.currentState) {
    case DeviceState.DEVICE_STATE_NORMAL:
      this.HandleUserInput();
      break;
    case DeviceState.DEVICE_STATE_SET_HOURS:
      this.HandleUserTimeHours();
      break;
    case DeviceState.DEVICE_STATE_SET_MINUTES:
      this.HandleUserTimeMinutes();
      break;
    case DeviceState.DEVICE_STATE_WORKING:
      this.HandleUserInput();
      break;
    case DeviceState.DEVICE_STATE_RESTING:
      this.HandleUserInput();
      break;

    default:
        break;
  }

 };