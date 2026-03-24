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

    #colorLedOFF = 80;

    // framebuffer (НЕ зависит от orientation)
    #bitmap = Array(16).fill(0x0);

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

    #getLogicalSize() {

        if (this.orientation === Orientation.HORIZONTAL) {
            return { cols: 16, rows: 8 };
        }

        return { cols: 8, rows: 16 };
    }

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

    /* =====================================================
       P5 SETUP
    ===================================================== */

    setup() {
        createCanvas(this.canvasWidth, this.canvasHeight);
        noLoop();
    }

    /* =====================================================
       ORIENTATION
    ===================================================== */

    setOrientation(orientation) {

        const normalizedOrientation =
            this.#normalizeOrientation(orientation);

        if (this.orientation === normalizedOrientation)
            return;

        this.orientation = normalizedOrientation;

        this.#recalculateCanvasSize();

        resizeCanvas(this.canvasWidth, this.canvasHeight);

        redraw();
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
            x = col * this.step + this.step / 2;
            y = row * this.step + this.step / 2;
        }

        return { x, y };
    }

    #getBitmapBit(virtualRow, virtualCol) {

        const lowByte =
            this.#bitmap[(this.#LEDS_PER_MODULE * this.#NUM_DEV) - 1 - virtualRow];

        const highByte =
            this.#bitmap[this.#LEDS_PER_MODULE - 1 - virtualRow];

        const byte = (highByte << 8) | lowByte;

        return (byte >> virtualCol) & 1;
    }

    /* =====================================================
       DRAW
    ===================================================== */

    draw() {

        background(0);

        const { cols, rows } = this.#getLogicalSize();

        for (let row = 0; row < rows; row++) {

            for (let col = 0; col < cols; col++) {

                let virtualRow;
                let virtualCol;

                if (this.orientation === Orientation.HORIZONTAL) {

                    virtualRow = row;
                    virtualCol = col;

                } else {

                    // В вертикальном режиме складываем 2 модуля столбиком:
                    // верх = левая половина 16x8, низ = правая половина 16x8.
                    virtualRow = row % this.#LEDS_PER_MODULE;
                    virtualCol = col +
                        (row >= this.#LEDS_PER_MODULE ? this.#LEDS_PER_MODULE : 0);
                }

                const bit = this.#getBitmapBit(virtualRow, virtualCol);

                const { x, y } =
                    this.#getPixelPosition(row, col);

                fill(bit ? this.colorLedON : this.#colorLedOFF);
                noStroke();
                circle(x, y, this.diameter);
            }
        }
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
}