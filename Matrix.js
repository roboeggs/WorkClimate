const Orientation = {
    HORIZONTAL: 0, // 2 модуля в ряд
    VERTICAL: 1    // 2 модуля колонкой
};

class Matrix {

    /* =====================================================
       HARDWARE CONFIG
    ===================================================== */

    #LEDS_PER_MODULE = 8;
    #NUM_DEV = 2;

    #colorLedOFF = 100;
    #brightness = 15; // 0-15 режимов яркости (как в MAX7219)

    // framebuffer (НЕ зависит от orientation)
    #bitmap = Array(16).fill(0x0);
	#bitmask = Array(16).fill(0x0);


    #digitPatterns = [
        [0xe0, 0xa0, 0xa0, 0xa0, 0xa0, 0xa0, 0xe0],
        [0xe0, 0x40, 0x40, 0x40, 0x40, 0x60, 0x40],
        [0xe0, 0x20, 0x20, 0xe0, 0x80, 0x80, 0xe0],
        [0xe0, 0x80, 0x80, 0xe0, 0x80, 0x80, 0xe0],
        [0x80, 0x80, 0x80, 0xe0, 0xa0, 0xa0, 0xa0],
        [0xe0, 0x80, 0x80, 0xe0, 0x20, 0x20, 0xe0],
        [0xe0, 0xa0, 0xa0, 0xe0, 0x20, 0x20, 0xe0],
        [0x20, 0x20, 0x20, 0x40, 0x80, 0x80, 0xe0],
        [0xe0, 0xa0, 0xa0, 0xe0, 0xa0, 0xa0, 0xe0],
        [0xe0, 0x80, 0x80, 0xe0, 0xa0, 0xa0, 0xe0]
    ];

    #digits = [
        [0b111, 0b101, 0b101, 0b101, 0b101, 0b101, 0b111], //0
        [0b010, 0b110, 0b010, 0b010, 0b010, 0b010, 0b111], //1
        [0b111, 0b001, 0b001, 0b111, 0b100, 0b100, 0b111], //2
        [0b111, 0b001, 0b001, 0b111, 0b001, 0b001, 0b111], //3
        [0b101, 0b101, 0b101, 0b111, 0b001, 0b001, 0b001], //4
        [0b111, 0b100, 0b100, 0b111, 0b001, 0b001, 0b111], //5
        [0b111, 0b100, 0b100, 0b111, 0b101, 0b101, 0b111], //6
        [0b111, 0b001, 0b001, 0b010, 0b100, 0b100, 0b100], //7
        [0b111, 0b101, 0b101, 0b111, 0b101, 0b101, 0b111], //8
        [0b111, 0b101, 0b101, 0b111, 0b001, 0b001, 0b111]  //9

    ];

    #normalizeOrientation(orientation) {

        if (orientation === Orientation.HORIZONTAL ||
            orientation === Orientation.VERTICAL) {
            return orientation;
        }

        if (typeof orientation === "string") {
            const value = orientation.trim().toLowerCase();

            if (value === "horizontal") {
                return Orientation.HORIZONTAL;
            }

            if (value === "vertical") {
                return Orientation.VERTICAL;
            }
        }

        return Orientation.HORIZONTAL;
    }

    /* =====================================================
       CONSTRUCTOR
    ===================================================== */

    constructor(
        colorLed = "red",
        moduleSize = 200,
        orientation = Orientation.HORIZONTAL
    ) {

        this.colorLedON = colorLed;
        this.moduleSize = moduleSize;
        this.orientation =
            this.#normalizeOrientation(orientation);

        // расстояние между LED
        this.step = this.moduleSize / this.#LEDS_PER_MODULE;

        // диаметр кружка LED
        this.diameter = this.step * 0.8;

        // вычисляем размер canvas
        this.#recalculateCanvasSize();
    }

    /* =====================================================
       CANVAS GEOMETRY
    ===================================================== */

    #recalculateCanvasSize() {

        if (this.orientation === Orientation.HORIZONTAL) {

            // [8x8][8x8]
            this.canvasWidth =
                this.moduleSize * this.#NUM_DEV;

            this.canvasHeight =
                this.moduleSize;

        } else {

            // [8x8]
            // [8x8]
            this.canvasWidth =
                this.moduleSize;

            this.canvasHeight =
                this.moduleSize * this.#NUM_DEV;
        }
    }

    #emitLayoutChange() {
        window.dispatchEvent(
            new CustomEvent('matrix-layout-change', {
                detail: {
                    orientation: this.orientation,
                    moduleSize: this.moduleSize,
                    canvasWidth: this.canvasWidth,
                    canvasHeight: this.canvasHeight
                }
            })
        );
    }

    /* =====================================================
       P5 SETUP
    ===================================================== */

    setup() {
        const renderer = createCanvas(this.canvasWidth, this.canvasHeight);
        const matrixHost = document.getElementById('matrix-host');
        if (matrixHost) {
            renderer.parent(matrixHost);
        }
        noLoop();
        this.#emitLayoutChange();
    }

    /* =====================================================
       BRIGHTNESS CONTROL
    ===================================================== */

    setBrightness(brightness) {
        // brightness: 0-15 (16 режимов)
        this.#brightness = constrain(brightness, 0, 15);
        redraw();
    }

    getBrightness() {
        return this.#brightness;
    }

    /* =====================================================
       ORIENTATION
    ===================================================== */

    changeOrientation() {
        this.orientation = this.orientation === Orientation.HORIZONTAL ? Orientation.VERTICAL : Orientation.HORIZONTAL;

        this.#recalculateCanvasSize();

        resizeCanvas(this.canvasWidth, this.canvasHeight);

        redraw();
        this.#emitLayoutChange();
    }

    /* =====================================================
       MODULE RESIZE
    ===================================================== */

    resizeModule(moduleSize) {

        this.moduleSize = moduleSize;

        this.step =
            this.moduleSize / this.#LEDS_PER_MODULE;

        this.diameter = this.step * 0.8;

        this.#recalculateCanvasSize();

        resizeCanvas(this.canvasWidth, this.canvasHeight);

        redraw();
        this.#emitLayoutChange();
    }

    /* =====================================================
       PIXEL POSITION
    ===================================================== */

    #getPixelPosition(row, col) {

        let x, y;

        if (this.orientation === Orientation.HORIZONTAL) {

            // логическая матрица 16x8
            x = col * this.step + this.step / 2;
            y = row * this.step + this.step / 2;

        } else {

            // логическая матрица 8x16
            x = this.moduleSize - row * this.step - this.step / 2;
            y = col * this.step + this.step / 2;
        }

        return { x, y };
    }


    /* =====================================================
       DRAW
    ===================================================== */

    draw() {

        background(0);


        for (let row = 0; row < this.#LEDS_PER_MODULE; row++) {
            // Берём строку снизу вверх
            const highByte = this.#bitmap[this.#LEDS_PER_MODULE - 1 - row];
            const lowByte = this.#bitmap[this.#LEDS_PER_MODULE * 2 - 1 - row];

            const byte = (highByte << 8) | lowByte;

            for (let col = 0; col < this.#LEDS_PER_MODULE * 2; col++) {

                // Берём бит справа налево
                const bitIndex = col;
                const bit = (byte >> bitIndex) & 1;

                // Координаты кружка
                const { x, y } =
                    this.#getPixelPosition(row, col);

                if (bit) {
                    // Используем яркость для модификации цвета включённого LED
                    // brightness: 0-15, но с минимальным порогом,
                    // чтобы LED не уходили в полностью чёрный.
                    const minAlpha = 150;
                    const alpha = minAlpha + (this.#brightness / 15) * (255 - minAlpha);
                    const onColor = color(this.colorLedON);
                    onColor.setAlpha(alpha);
                    fill(onColor);
                } else {
                    fill(this.#colorLedOFF);
                }
                noStroke();
                circle(x, y, this.diameter);
            }
        }
        // this.#bitmap.forEach((num, index) => {
        //     console.log(`Элемент ${index}: 0b${num.toString(2).padStart(8, '0')}`);
        // });
    }

    /* =====================================================
       MAX7219 WRITE
    ===================================================== */

    maxWrite(row, data) {

        const devTarget = Math.floor((row - 1) / 8);
        const offset = devTarget * 8;

        for (let dev = 0; dev < this.#NUM_DEV; dev++) {

            if (dev === devTarget) {

                const addr = row - offset;

                this.#bitmap[(addr - 1) + (dev * 8)] = data;
            }
        }
    }

    /* =====================================================
       CLOCK DRAWING
    ===================================================== */

    drawNumber(hours, minutes, separatorState, blinkDigitsState) {
        let number = hours * 100 + minutes;

        // Проверка корректности времени
        if (number > 9999 || hours > 23 || minutes > 59) {
            return;
        }

        this.drawNumberBitmask(hours, minutes, separatorState, blinkDigitsState);
        return;

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

    #setBitmaskPixelByMatrixView(x, y) {
        if (x < 0 || x >= 16 || y < 0 || y >= 8) {
            return;
        }

        // Преобразуем координаты отображения 16x8 в буфер 8x16 (как в TetrisMode)
        const matrixRow = (x >= 8 ? 0 : 8) + (7 - y);
        const matrixBit = x >= 8 ? x - 8 : x;

        const sourceBase = matrixRow < 8 ? 8 : 0;
        const sourceRow = sourceBase + matrixBit;
        const sourceBit = 7 - (matrixRow % 8);

        this.#bitmask[sourceRow] |= (1 << sourceBit);
    }

    #setBitmaskPixelByVerticalView(x, y) {
        if (x < 0 || x >= 8 || y < 0 || y >= 16) {
            return;
        }

        const logicalRow = 7 - x;
        const logicalCol = y;

        this.#setBitmaskPixelByMatrixView(logicalCol, logicalRow);
    }

    #flushBitmaskToMatrix() {
        const transformArr = Array(16).fill(0x0);

        for (let i = 0; i < transformArr.length; i++) {
            let transMask = 0x00;
            const n = i < 8 ? 8 : 0;

            for (let j = 0; j < 8; j++) {
                const m = n + j;
                const col = this.#bitmask[m];
                const bit = (col >> (7 - (i % 8))) & 1;

                if (bit === 1) {
                    transMask |= (1 << j);
                }
            }

            transformArr[i] = transMask;
        }

        for (let matrixNum = 0; matrixNum < this.#NUM_DEV; matrixNum++) {
            for (let i = 1; i < 9; i++) {
                const bitmapIndex = matrixNum * 8 + i - 1;
                this.maxWrite(i + matrixNum * 8, transformArr[bitmapIndex]);
            }
        }
    }

    drawNumberBitmask(hours, minutes, separatorState, blinkDigitsState) {
        if (hours > 23 || minutes > 59 || hours < 0 || minutes < 0) {
            return;
        }

        this.#bitmask.fill(0x0);

        if (this.orientation === Orientation.HORIZONTAL) {
            const digits = [
                Math.floor(hours / 10),
                hours % 10,
                Math.floor(minutes / 10),
                minutes % 10
            ];

            const digitStartX = [0, 4, 9, 13];
            const digitBaseY = 1;

            for (let d = 0; d < digits.length; d++) {
                const pattern = this.#digits[digits[d]];
                const startX = digitStartX[d];

                for (let row = 0; row < pattern.length; row++) {
                    const rowMask = pattern[row];

                    for (let col = 0; col < 3; col++) {
                        if (((rowMask >> (2 - col)) & 1) === 1) {
                            this.#setBitmaskPixelByMatrixView(startX + col, row + digitBaseY);
                        }
                    }
                }
            }

            if (separatorState === TimeSeparatorState.TIME_SEPARATOR_ON) {
                // Верхняя симметричная точка 2x2
                this.#setBitmaskPixelByMatrixView(7, 2);
                this.#setBitmaskPixelByMatrixView(8, 2);
                this.#setBitmaskPixelByMatrixView(7, 3);
                this.#setBitmaskPixelByMatrixView(8, 3);

                // Нижняя симметричная точка 2x2
                this.#setBitmaskPixelByMatrixView(7, 5);
                this.#setBitmaskPixelByMatrixView(8, 5);
                this.#setBitmaskPixelByMatrixView(7, 6);
                this.#setBitmaskPixelByMatrixView(8, 6);
            }

            if (blinkDigitsState === BlinkState.BLINK_HOURS) {
                for (let x = 0; x < 8; x++) {
                    this.#setBitmaskPixelByMatrixView(x, 0);
                }
            } else if (blinkDigitsState === BlinkState.BLINK_MINUTES) {
                for (let x = 8; x < 16; x++) {
                    this.#setBitmaskPixelByMatrixView(x, 0);
                }
            }
        } else {
            const digitsPerModule = [
                [Math.floor(hours / 10), hours % 10],
                [Math.floor(minutes / 10), minutes % 10]
            ];

            const moduleBaseY = [0, 9];
            const digitStartXInModule = [1, 5]; // 2 цифры 3x7, прижаты к правому краю 8x8

            for (let moduleIndex = 0; moduleIndex < this.#NUM_DEV; moduleIndex++) {
                const baseY = moduleBaseY[moduleIndex];

                for (let d = 0; d < 2; d++) {
                    const pattern = this.#digits[digitsPerModule[moduleIndex][d]];
                    const startX = digitStartXInModule[d];

                    for (let row = 0; row < pattern.length; row++) {
                        const rowMask = pattern[row];

                        for (let col = 0; col < 3; col++) {
                            if (((rowMask >> (2 - col)) & 1) === 1) {
                                this.#setBitmaskPixelByVerticalView(startX + col, baseY + row);
                            }
                        }
                    }
                }
            }
            // В вертикальной ориентации разделитель не рисуем.

            if (blinkDigitsState === BlinkState.BLINK_HOURS) {
                for (let x = 0; x < 8; x++) {
                    this.#setBitmaskPixelByVerticalView(x, 7);
                }
            } else if (blinkDigitsState === BlinkState.BLINK_MINUTES) {
                for (let x = 0; x < 8; x++) {
                    this.#setBitmaskPixelByVerticalView(x, 8);
                }
            }
        }

        this.#flushBitmaskToMatrix();
        this.draw();
    }
}