// "идеальная" ширина эталона в мм
const refMM = 100; // например, 50 мм

// Ждём загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
  const ref = document.getElementById('ref');
  const device = document.getElementById('device');

  // Стили для эталона
  ref.style.width = refMM + 'px';
  ref.style.height = '20px';
  ref.style.backgroundColor = 'blue';

  // Стили для устройства (изначально невидимый или минимальный размер)
  device.style.height = '0px';
  device.style.width = '0px';
  device.style.backgroundColor = 'red';

  document.getElementById('apply').onclick = () => {
    const measuredInput = document.getElementById('measured');
    const measured = parseFloat(measuredInput.value);

    if (!measured || measured <= 0) {
      alert('Пожалуйста, введите корректное значение ширины (больше 0)');
      return;
    }

    // Коэффициент: сколько мм в одном CSS‑пикселе
    const mmPerCssPx = measured / refMM;

    // Размеры устройства в мм
    const widthMM = 62;
    const heightMM = 32;

    // Переводим в пиксели
    const widthPX = widthMM / mmPerCssPx;
    const heightPX = heightMM / mmPerCssPx;

    // Применяем размеры
    device.style.width = widthPX + 'px';
    device.style.height = heightPX + 'px';

    console.log(`Калибровка применена: 1 px = ${mmPerCssPx.toFixed(4)} мм`);
    console.log(`Размеры устройства: ${widthPX.toFixed(2)}×${heightPX.toFixed(2)} px`);
  };
});
