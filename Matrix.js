class Matrix{
    #circleCountX = 16;
    #circleCountY = 8;
    #colorLedOFF = 80;
    #NUM_DEV = 2;
    #bitmap = Array(this.#circleCountX).fill(0x0);

    #digitPatterns = [
        // Цифра 0
        [0xe0, 0xa0, 0xa0, 0xa0, 0xa0, 0xa0, 0xe0],
        // Цифра 1
        [0xe0, 0x40, 0x40, 0x40, 0x40, 0x60, 0x40],
        // Цифра 2
        [0xe0, 0x20, 0x20, 0xe0, 0x80, 0x80, 0xe0],
        // Цифра 3
        [0xe0, 0x80, 0x80, 0xe0, 0x80, 0x80, 0xe0],
        // Цифра 4
        [0x80, 0x80, 0x80, 0xe0, 0xa0, 0xa0, 0xa0],
        // Цифра 5
        [0xe0, 0x80, 0x80, 0xe0, 0x20, 0x20, 0xe0],
        // Цифра 6
        [0xe0, 0xa0, 0xa0, 0xe0, 0x20, 0x20, 0xe0],
        // Цифра 7
        [0x20, 0x20, 0x20, 0x40, 0x80, 0x80, 0xe0],
        // Цифра 8
        [0xe0, 0xa0, 0xa0, 0xe0, 0xa0, 0xa0, 0xe0],
        // Цифра 9
        [0xe0, 0x80, 0x80, 0xe0, 0xa0, 0xa0, 0xe0]
    ];

    constructor(colorLed = 'red', matrixWidth, matrixHeight, diameter) {
        this.colorLedON = colorLed;
        this.matrixWidth = matrixWidth;
        this.matrixHeight = matrixHeight;
        this.diameter = diameter;       // диаметр кружка
        
        // Вычисляем шаг между центрами кружков
        this.stepX = matrixWidth / this.#circleCountX;
        this.stepY = matrixHeight / this.#circleCountY;

        this.lastSeparatorUpdate = 0;
        this.separatorToggleState = false;
    }
    setup(){
        createCanvas(this.matrixWidth, this.matrixHeight);
        noLoop(); // рисуем один раз
    }

    
    draw(){
        // Заливаем фон чёрным
        background(0);


        // Рисуем сетку кружков
        for (let row = 0; row < this.#circleCountY; row++) {
            // Берём строку снизу вверх
            const lowByte = this.#bitmap[this.#circleCountX - 1 - row];
            const highByte= this.#bitmap[this.#circleCountY - 1 - row];
            
            const byte = (highByte << 8) | lowByte;
            // console.log(byte.toString(2));
            for (let col = 0; col < this.#circleCountX; col++) {

                // Берём бит справа налево
                const bitIndex = col;
                const bit = (byte >> bitIndex) & 1;

                // Координаты кружка
                const x = col * this.stepX + this.stepX / 2;
                const y = row * this.stepY + this.stepY / 2;

                // Выбор цвета
                if (bit === 1) {
                    fill(this.colorLedON);
                } else {
                    fill(this.#colorLedOFF);
                }
                noStroke();
                circle(x, y, this.diameter);
            }
        } 
    }

    maxWrite(row, data) {
        // Определяем целевое устройство (каждое управляет 8 строками)
        const devTarget = Math.floor((row - 1) / 8);
        const offset = devTarget * 8;

        // Буфер для двухбайтовых данных (адрес строки + данные)
        let txData = [0, 0];

        for (let dev = 0; dev < this.#NUM_DEV; dev++) {
            if (dev === devTarget) {
                // Отправляем данные для целевого устройства
                txData[0] = row - offset; // Адрес строки (high byte)
                txData[1] = data;         // Данные (low byte)

                this.#bitmap[(txData[0] - 1) + (dev * 8)] = txData[1];
            } else {
                // Для остальных устройств отправляем команду «no‑op»
                txData[0] = 0x00; // No‑op register
                txData[1] = 0x00; // No‑op data
            }
        }

        // this.draw();

    }


    drawNumber(hours, minutes, separatorState, blinkDigitsState) {
        let number = hours * 100 + minutes;

        // Проверка корректности времени
        if (number > 9999 || hours > 23 || minutes > 59) {
            return;
        }

        // Извлекаем цифры: единицы, десятки, сотни, тысячи
        const units = [
            number % 10,           // единицы (младшая цифра)
            Math.floor(number / 10) % 10,  // десятки
            Math.floor(number / 100) % 10, // сотни
            Math.floor(number / 1000)      // тысячи (старшая цифра)
        ];

        for (let matrixNum = 0; matrixNum < this.#NUM_DEV; matrixNum++) {
            for (let i = 1; i < 8; i++) {
            // Получаем данные для двух цифр, отображаемых на текущем устройстве
            const digit1Data = this.#digitPatterns[units[matrixNum * 2]][i - 1];
            const digit2Data = this.#digitPatterns[units[matrixNum * 2 + 1]][i - 1];

            // Комбинируем данные с учётом сдвига для правильного позиционирования
            let combined = (digit1Data >> matrixNum) | (digit2Data >> (4 + matrixNum));

            // Добавляем разделитель (двоеточие), если он должен быть включён
            if (separatorState === TimeSeparatorState.TIME_SEPARATOR_ON && (i === 2 || i === 3 || i === 5 || i === 6)) {
                combined |= 0x01 << (matrixNum * 7);
            }

            // Отправляем данные в соответствующую строку матрицы
            this.maxWrite(i + (matrixNum * 8), combined);
            }

            // Управление миганием: часы или минуты
            if ((blinkDigitsState === BlinkState.BLINK_HOURS && matrixNum === 1) ||
                (blinkDigitsState === BlinkState.BLINK_MINUTES && matrixNum === 0)) {
                this.maxWrite(8 * (matrixNum + 1), 0xFF); // Все светодиоды строки включены
            } else {
                this.maxWrite(8 * (matrixNum + 1), 0x00); // Все светодиоды строки выключены
            }
        }
        this.draw();

    }

    #getToggleSeparatorState() {
        let currentTime = millis();

        // Check if 1000 ms have passed
        if (currentTime - this.lastSeparatorUpdate >= 1000) {
            this.separatorToggleState = !this.separatorToggleState;
            this.lastSeparatorUpdate = currentTime;
        }

        return this.separatorToggleState;
    }

    printTime(hours, minutes) {
        // Determine which separator constant to use
        const separator = this.#getToggleSeparatorState() 
                        ? TimeSeparatorState.TIME_SEPARATOR_ON 
                        : TimeSeparatorState.TIME_SEPARATOR_OFF;

        // Call your draw function (using this.matrix if that's where it lives)
        this.drawNumber(hours, minutes, separator, BlinkState.BLINK_NONE);
    }

}