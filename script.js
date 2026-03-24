
let userInput;

function setup() {
  let matrix = new Matrix (undefined, 240, Orientation.HORIZONTAL);
  userInput = new UserLogic(matrix);

  setInterval(() => {
    userInput.keyHandler.update();
    userInput.tick();
  }, 16);

  // Запускаем обновление в начале следующей минуты
  scheduleNextMinuteUpdate();
  userInput.UpdateTime();


}

function scheduleNextMinuteUpdate() {
  const now = new Date();
  // Миллисекунды до следующей минуты: 60 000 − (текущие секунды × 1 000 + миллисекунды)
  const delay = 60000 - (now.getSeconds() * 1000 + now.getMilliseconds());
  setTimeout(() => {
    // Обновляем данные текущего режима
    userInput.onMinute();
    // Перерисовываем экран
    redraw();
    // Планируем следующее обновление
    scheduleNextMinuteUpdate();
  }, delay);
}

function draw() {


  // userInput.UpdateTime();
}

function keyPressed() {
  userInput.keyHandler.keyPressed(keyCode);
}

function keyReleased() {
  userInput.keyHandler.keyReleased(keyCode);
}