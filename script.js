import { Matrix, Orientation } from './modes/Matrix.js';
import UserLogic from './core/UserLogic.js';

const DEFAULT_MATRIX_MODULE_HEIGHT = 220;
const MATRIX_FRAME_PADDING_PX = 26;
const SCROLL_SPEED_PX_PER_FRAME = 0.003;  // Скорость прокрутки: 0.003 пиксели в кадр (очень медленно)
const DEMO_DURATION_MS = 300000;         // Длительность демонстрации в миллисекундах (5 минут)

let userInput;
let matrix;

function updateDeviceFrameSize(moduleSizePx, orientation) {
  const device = document.getElementById('device');
  if (!device) {
    return;
  }

  const isVertical = orientation === Orientation.VERTICAL;
  const matrixWidthPx = isVertical ? moduleSizePx : moduleSizePx * 2;
  const matrixHeightPx = isVertical ? moduleSizePx * 2 : moduleSizePx;

  const deviceWidthPx = matrixWidthPx + MATRIX_FRAME_PADDING_PX * 2;
  const deviceHeightPx = matrixHeightPx + MATRIX_FRAME_PADDING_PX * 2;

  device.style.width = `${deviceWidthPx.toFixed(2)}px`;
  device.style.height = `${deviceHeightPx.toFixed(2)}px`;
}

function getMatrixModuleHeight() {
  return DEFAULT_MATRIX_MODULE_HEIGHT;
}

function demonstrateAllSymbols() {
  if (!matrix) {
    return;
  }

  // Демонстрируем все символы алфавита
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  
  console.log('[Device] Starting symbol demonstration...');
  // Параметры: текст, пиксели за шаг, интервал в миллисекундах
  matrix.startScrollingText(alphabet, 0.5, 100);

  // После завершения демонстрации возвращаемся к нормальному режиму
  setTimeout(() => {
    matrix.stopScrollingText();
    userInput.UpdateTime();
    redraw();
    console.log('[Device] Symbol demonstration complete');
  }, DEMO_DURATION_MS);
}

function setup() {
  matrix = new Matrix(undefined, getMatrixModuleHeight(), Orientation.HORIZONTAL);
  userInput = new UserLogic(matrix);

  updateDeviceFrameSize(matrix.moduleSize, matrix.orientation);

  setInterval(() => {
    userInput.keyHandler.update();
    userInput.tick();
  }, 16);

  // Запускаем обновление в начале следующей минуты
  scheduleNextMinuteUpdate();
  
  // Демонстрируем все символы при запуске
  // setTimeout(() => {
  //   demonstrateAllSymbols();
  // }, 500);
}

window.setup = setup;

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

window.draw = draw;

function keyPressed() {
  if (!userInput || !userInput.keyHandler) {
    return;
  }
  userInput.keyHandler.keyPressed(keyCode);
}

window.keyPressed = keyPressed;

function keyReleased() {
  if (!userInput || !userInput.keyHandler) {
    return;
  }
  userInput.keyHandler.keyReleased(keyCode);
}

window.keyReleased = keyReleased;

window.addEventListener('matrix-layout-change', (event) => {
  const nextOrientation = event.detail?.orientation;
  const nextModuleSize = Number(event.detail?.moduleSize);

  if (!Number.isFinite(nextModuleSize) || nextModuleSize <= 0) {
    return;
  }

  if (nextOrientation !== Orientation.HORIZONTAL && nextOrientation !== Orientation.VERTICAL) {
    return;
  }

  updateDeviceFrameSize(nextModuleSize, nextOrientation);
});