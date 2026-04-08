import { createMapperForOrientation } from './../mappers/mapper-adapter.js';
import { BlinkState, TimeSeparatorState } from './../core/AppConstants.js';

export const Orientation = {
    HORIZONTAL: 0, // 2 модуля в ряд
    VERTICAL: 1    // 2 модуля колонкой
};

export class Matrix {

    /* =====================================================
       HARDWARE CONFIG
    ===================================================== */

    #LEDS_PER_MODULE = 8;
    #NUM_DEV = 2;

    #colorLedOFF = 100;
    #brightness = 15; // 0-15 режимов яркости (как в MAX7219)

    #bitmap = Array(16).fill(0x0);
    #bitmask = Array(16).fill(0x0);


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



    #alphabet = {
        // Заглавные буквы (A-Z)
        'A': [0b00110000, 0b01111000, 0b11001100, 0b11001100, 0b11111100, 0b11001100, 0b11001100, 0b00000000],
        'B': [0b11111100, 0b01100110, 0b01100110, 0b01111100, 0b01100110, 0b01100110, 0b11111100, 0b00000000],
        'C': [0b00111100, 0b01100110, 0b11000000, 0b11000000, 0b11000000, 0b01100110, 0b00111100, 0b00000000],
        'D': [0b11111000, 0b01101100, 0b01100110, 0b01100110, 0b01100110, 0b01101100, 0b11111000, 0b00000000],
        'E': [0b11111110, 0b01100010, 0b01101000, 0b01111000, 0b01101000, 0b01100010, 0b11111110, 0b00000000],
        'F': [0b11111110, 0b01100010, 0b01101000, 0b01111000, 0b01101000, 0b01100000, 0b11110000, 0b00000000],
        'G': [0b00111100, 0b01100110, 0b11000000, 0b11000000, 0b11001110, 0b01100110, 0b00111110, 0b00000000],
        'H': [0b11001100, 0b11001100, 0b11001100, 0b11111100, 0b11001100, 0b11001100, 0b11001100, 0b00000000],
        'I': [0b01111000, 0b00110000, 0b00110000, 0b00110000, 0b00110000, 0b00110000, 0b01111000, 0b00000000],
        'J': [0b00011110, 0b00001100, 0b00001100, 0b00001100, 0b11001100, 0b11001100, 0b01111000, 0b00000000],
        'K': [0b11100110, 0b01100110, 0b01101100, 0b01111000, 0b01101100, 0b01100110, 0b11100110, 0b00000000],
        'L': [0b11110000, 0b01100000, 0b01100000, 0b01100000, 0b01100010, 0b01100110, 0b11111110, 0b00000000],
        'M': [0b11000110, 0b11101110, 0b11111110, 0b11111110, 0b11010110, 0b11000110, 0b11000110, 0b00000000],
        'N': [0b11000110, 0b11100110, 0b11110110, 0b11011110, 0b11001110, 0b11000110, 0b11000110, 0b00000000],
        'O': [0b00111000, 0b01101100, 0b11000110, 0b11000110, 0b11000110, 0b01101100, 0b00111000, 0b00000000],
        'P': [0b11111100, 0b01100110, 0b01100110, 0b01111100, 0b01100000, 0b01100000, 0b11110000, 0b00000000],
        'Q': [0b01111000, 0b11001100, 0b11001100, 0b11001100, 0b11011100, 0b01111000, 0b00011100, 0b00000000],
        'R': [0b11111100, 0b01100110, 0b01100110, 0b01111100, 0b01101100, 0b01100110, 0b11100110, 0b00000000],
        'S': [0b01111000, 0b11001100, 0b11100000, 0b01110000, 0b00011100, 0b11001100, 0b01111000, 0b00000000],
        'T': [0b11111100, 0b10110100, 0b00110000, 0b00110000, 0b00110000, 0b00110000, 0b01111000, 0b00000000],
        'U': [0b11001100, 0b11001100, 0b11001100, 0b11001100, 0b11001100, 0b11001100, 0b11111100, 0b00000000],
        'V': [0b11001100, 0b11001100, 0b11001100, 0b11001100, 0b11001100, 0b01111000, 0b00110000, 0b00000000],
        'W': [0b11000110, 0b11000110, 0b11000110, 0b11010110, 0b11111110, 0b11101110, 0b11000110, 0b00000000],
        'X': [0b11000110, 0b11000110, 0b01101100, 0b00111000, 0b00111000, 0b01101100, 0b11000110, 0b00000000],
        'Y': [0b11001100, 0b11001100, 0b11001100, 0b01111000, 0b00110000, 0b00110000, 0b01111000, 0b00000000],
        'Z': [0b11111110, 0b11000110, 0b10001100, 0b00011000, 0b00110010, 0b01100110, 0b11111110, 0b00000000],

        // Пробел
        ' ': [0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000],

        // Строчные буквы (a-z)
        'a': [0b00000000, 0b00000000, 0b01111000, 0b00001100, 0b01111100, 0b11001100, 0b01110110, 0b00000000],
        'b': [0b11100000, 0b01100000, 0b01100000, 0b01111100, 0b01100110, 0b01100110, 0b11011100, 0b00000000],
        'c': [0b00000000, 0b00000000, 0b01111000, 0b11001100, 0b11000000, 0b11001100, 0b01111000, 0b00000000],
        'd': [0b00011100, 0b00001100, 0b00001100, 0b01111100, 0b11001100, 0b11001100, 0b01110110, 0b00000000],
        'e': [0b00000000, 0b00000000, 0b01111000, 0b11001100, 0b11111100, 0b11000000, 0b01111000, 0b00000000],
        'f': [0b00111000, 0b01101100, 0b01100000, 0b11110000, 0b01100000, 0b01100000, 0b11110000, 0b00000000],
        'g': [0b00000000, 0b00000000, 0b01110110, 0b11001100, 0b11001100, 0b01111100, 0b00001100, 0b11111000],
        'h': [0b11100000, 0b01100000, 0b01101100, 0b01110110, 0b01100110, 0b01100110, 0b11100110, 0b00000000],
        'i': [0b00110000, 0b00000000, 0b01110000, 0b00110000, 0b00110000, 0b00110000, 0b01111000, 0b00000000],
        'j': [0b00001100, 0b00000000, 0b00001100, 0b00001100, 0b00001100, 0b11001100, 0b11001100, 0b01111000],
        'k': [0b11100000, 0b01100000, 0b01100110, 0b01101100, 0b01111000, 0b01101100, 0b11100110, 0b00000000],
        'l': [0b01110000, 0b00110000, 0b00110000, 0b00110000, 0b00110000, 0b00110000, 0b01111000, 0b00000000],
        'm': [0b00000000, 0b00000000, 0b11001100, 0b11111110, 0b11111110, 0b11010110, 0b11000110, 0b00000000],
        'n': [0b00000000, 0b00000000, 0b11111000, 0b11001100, 0b11001100, 0b11001100, 0b11001100, 0b00000000],
        'o': [0b00000000, 0b00000000, 0b01111000, 0b11001100, 0b11001100, 0b11001100, 0b01111000, 0b00000000],
        'p': [0b00000000, 0b00000000, 0b11011100, 0b01100110, 0b01100110, 0b01111100, 0b01100000, 0b11110000],
        'q': [0b00000000, 0b00000000, 0b01110110, 0b11001100, 0b11001100, 0b01111100, 0b00001100, 0b00011110],
        'r': [0b00000000, 0b00000000, 0b11011100, 0b01110110, 0b01100110, 0b01100000, 0b11110000, 0b00000000],
        's': [0b00000000, 0b00000000, 0b01111100, 0b11000000, 0b01111000, 0b00001100, 0b11111000, 0b00000000],
        't': [0b00010000, 0b00110000, 0b01111100, 0b00110000, 0b00110000, 0b00110100, 0b00011000, 0b00000000],
        'u': [0b00000000, 0b00000000, 0b11001100, 0b11001100, 0b11001100, 0b11001100, 0b01110110, 0b00000000],
        'v': [0b00000000, 0b00000000, 0b11001100, 0b11001100, 0b11001100, 0b01111000, 0b00110000, 0b00000000],
        'w': [0b00000000, 0b00000000, 0b11000110, 0b11010110, 0b11111110, 0b11111110, 0b01101100, 0b00000000],
        'x': [0b00000000, 0b00000000, 0b11000110, 0b01101100, 0b00111000, 0b01101100, 0b11000110, 0b00000000],
        'y': [0b00000000, 0b00000000, 0b11001100, 0b11001100, 0b11001100, 0b01111100, 0b00001100, 0b11111000],
        'z': [0b00000000, 0b00000000, 0b11111100, 0b10011000, 0b00110000, 0b01100100, 0b11111100, 0b00000000],

        // Цифры (0-9)
        '1': [0b00000000, 0b00011000, 0b00011000, 0b00111000, 0b00011000, 0b00011000, 0b00011000, 0b01111110],
        '2': [0b00000000, 0b00111100, 0b01100110, 0b00000110, 0b00001100, 0b00110000, 0b01100000, 0b01111110],
        '3': [0b00000000, 0b00111100, 0b01100110, 0b00000110, 0b00011100, 0b00000110, 0b01100110, 0b00111100],
        '4': [0b00000000, 0b00001100, 0b00011100, 0b00101100, 0b01001100, 0b01111110, 0b00001100, 0b00001100],
        '5': [0b00000000, 0b01111110, 0b01100000, 0b01111100, 0b00000110, 0b00000110, 0b01100110, 0b00111100],
        '6': [0b00000000, 0b00111100, 0b01100110, 0b01100000, 0b01111100, 0b01100110, 0b01100110, 0b00111100],
        '7': [0b00000000, 0b01111110, 0b01100110, 0b00001100, 0b00001100, 0b00011000, 0b00011000, 0b00011000],
        '8': [0b00000000, 0b00111100, 0b01100110, 0b01100110, 0b00111100, 0b01100110, 0b01100110, 0b00111100],
        '9': [0b00000000, 0b00111100, 0b01100110, 0b01100110, 0b00111110, 0b00000110, 0b01100110, 0b00111100],
        '0': [0b00000000, 0b00111100, 0b01100110, 0b01101110, 0b01110110, 0b01100110, 0b01100110, 0b00111100],

        '.': [0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b01100000, 0b01100000],
        '%': [0b00000000, 0b01100000, 0b01100110, 0b00001100, 0b00011000, 0b00110000, 0b01100110, 0b00000110],
        '+': [0b00000000, 0b00000000, 0b00001000, 0b00001000, 0b00111110, 0b00001000, 0b00001000, 0b00000000],
        '-': [0b00000000, 0b00000000, 0b00000000, 0b00000000, 0b00111100, 0b00000000, 0b00000000, 0b00000000],
        ':': [0b00000000, 0b00000000, 0b00011000, 0b00011000, 0b00000000, 0b00011000, 0b00011000, 0b00000000],
        '°': [0b11000000, 0b11011110, 0b00110011, 0b01100000, 0b01100000, 0b01100000, 0b00110011, 0b00011110]


    };




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



    constructor(
        colorLed = "red",
        moduleSize = 200,
        orientation = Orientation.HORIZONTAL
    ) {

        this.colorLedON = colorLed;
        this.moduleSize = moduleSize;
        this.orientation = this.#normalizeOrientation(orientation);


        this.mapper = createMapperForOrientation(this.orientation);

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

        this.mapper = createMapperForOrientation(this.orientation);

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
        /* this.#bitmap.forEach((num, index) => {
            console.log(`Элемент ${index}: 0b${num.toString(2).padStart(8, '0')}`);
        });*/
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

    setPixel(x, y) {
        this.#setBitmaskPixel(x, y);
    }

    #setBitmaskPixel(x, y) {
        const mapped = this.mapper.map(x, y);
        if (!mapped) return;
        this.#bitmask[mapped.row] |= (1 << mapped.bitIndex);
    }

    flush() {
        this.#flushBitmaskToMatrix();
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

    clearBitmask() {
        this.#bitmask.fill(0x0);
    }

    drawNumber(hours, minutes, separatorState, blinkDigitsState) {
        if (hours > 23 || minutes > 59 || hours < 0 || minutes < 0) {
            return;
        }

        this.clearBitmask();

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
                            this.#setBitmaskPixel(startX + col, row + digitBaseY);
                        }
                    }
                }
            }

            if (separatorState === TimeSeparatorState.TIME_SEPARATOR_ON) {
                // Верхняя симметричная точка 2x2
                this.#setBitmaskPixel(7, 2);
                this.#setBitmaskPixel(8, 2);
                this.#setBitmaskPixel(7, 3);
                this.#setBitmaskPixel(8, 3);

                // Нижняя симметричная точка 2x2
                this.#setBitmaskPixel(7, 5);
                this.#setBitmaskPixel(8, 5);
                this.#setBitmaskPixel(7, 6);
                this.#setBitmaskPixel(8, 6);
            }

            if (blinkDigitsState === BlinkState.BLINK_HOURS) {
                for (let x = 0; x < 8; x++) {
                    this.#setBitmaskPixel(x, 0);
                }
            } else if (blinkDigitsState === BlinkState.BLINK_MINUTES) {
                for (let x = 8; x < 16; x++) {
                    this.#setBitmaskPixel(x, 0);
                }
            }
        } else {
            const digitsPerModule = [
                [Math.floor(hours / 10), hours % 10],
                [Math.floor(minutes / 10), minutes % 10]
            ];

            const moduleBaseY = [0, 8];
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
                                this.#setBitmaskPixel(startX + col, baseY + row);
                            }
                        }
                    }
                }
            }
            // В вертикальной ориентации разделитель не рисуем.

            if (blinkDigitsState === BlinkState.BLINK_HOURS) {
                for (let x = 0; x < 8; x++) {
                    this.#setBitmaskPixel(x, 7);
                }
            } else if (blinkDigitsState === BlinkState.BLINK_MINUTES) {
                for (let x = 0; x < 8; x++) {
                    this.#setBitmaskPixel(x, 8);
                }
            }
        }

        this.#flushBitmaskToMatrix();
        this.draw();
    }

    /* =====================================================
       DRAW STRING
    ===================================================== */

    drawString(text, startX = 0, startY = 0) {
        if (!text || typeof text !== 'string') {
            return false;
        }

        const shouldRestoreOrientation = this.orientation === Orientation.VERTICAL && !this.#isScrolling;

        if (shouldRestoreOrientation) {
            this.changeOrientation();
        }

        try {
            this.clearBitmask();

            const normalizedText = text;
            const letterSpacing = 2;
            let currentX = startX;

            for (let charIdx = 0; charIdx < normalizedText.length; charIdx++) {
                const char = normalizedText[charIdx];
                const pattern = this.#alphabet[char];

                if (!pattern) {
                    currentX += letterSpacing;
                    continue;
                }

                const patternHeight = pattern.length;
                const glyphMetrics = this.#getGlyphMetrics(pattern);
                const charWidth = glyphMetrics.width;
                const rowOffset = this.#getSafeRowOffset(pattern, char, startY);

                if (charWidth === 0) {
                    currentX += letterSpacing;
                    continue;
                }

                for (let row = 0; row < patternHeight; row++) {
                    const rowMask = pattern[row];

                    for (let col = 0; col < charWidth; col++) {
                        const sourceCol = glyphMetrics.minCol + col;
                        const bit = (rowMask >> (glyphMetrics.bitsInRow - 1 - sourceCol)) & 1;

                        if (bit === 1) {
                            this.#setBitmaskPixel(
                                currentX + col,
                                startY + row + rowOffset
                            );
                        }
                    }
                }

                currentX += charWidth + letterSpacing;
            }

            this.#flushBitmaskToMatrix();
            this.draw();

            return true;
        } finally {
            if (shouldRestoreOrientation && this.orientation === Orientation.HORIZONTAL) {
                this.changeOrientation();
            }
        }
    }

    #getCharacterWidth(char) {
        // Определяем ширину символа по максимальной ширине паттерна
        const pattern = this.#alphabet[char];
        if (!pattern || pattern.length === 0) {
            return 4;
        }

        const glyphMetrics = this.#getGlyphMetrics(pattern);
        return glyphMetrics.width > 0 ? glyphMetrics.width : 4;
    }

    #getGlyphMetrics(pattern) {
        if (!Array.isArray(pattern) || pattern.length === 0) {
            return { bitsInRow: 0, minCol: 0, width: 0 };
        }

        const maxNum = Math.max(...pattern);
        const bitsInRow = this.#getPatternWidth(maxNum);
        if (bitsInRow === 0) {
            return { bitsInRow: 0, minCol: 0, width: 0 };
        }

        let minCol = bitsInRow;
        let maxCol = -1;

        for (let row = 0; row < pattern.length; row++) {
            const rowMask = pattern[row];

            for (let col = 0; col < bitsInRow; col++) {
                const bit = (rowMask >> (bitsInRow - 1 - col)) & 1;

                if (bit === 1) {
                    if (col < minCol) {
                        minCol = col;
                    }
                    if (col > maxCol) {
                        maxCol = col;
                    }
                }
            }
        }

        if (maxCol < minCol) {
            return { bitsInRow, minCol: 0, width: 0 };
        }

        return {
            bitsInRow,
            minCol,
            width: maxCol - minCol + 1
        };
    }

    #getCharacterRowOffset(char) {
        if (typeof char !== 'string' || char.length === 0) {
            return 0;
        }

        const lower = char.toLowerCase();
        if (char === lower && char !== char.toUpperCase()) {
            return -1;
        }

        return 0;
    }

    #getSafeRowOffset(pattern, char, baseY) {
        // Символы, для которых НЕЛЬЗЯ применять bottom-align
        const NO_BOTTOM_ALIGN = new Set(['-', ':', '.', ';', '_', '+']);

        const bottomOffset = NO_BOTTOM_ALIGN.has(char)
            ? 0
            : this.#getBottomAlignOffset(pattern);

        const rowOffset =
            bottomOffset +
            this.#getCharacterRowOffset(char);

        if (!Array.isArray(pattern) || pattern.length === 0) {
            return rowOffset;
        }

        let firstNonEmptyRow = -1;
        for (let i = 0; i < pattern.length; i++) {
            if (pattern[i] !== 0) {
                firstNonEmptyRow = i;
                break;
            }
        }

        if (firstNonEmptyRow < 0) {
            return rowOffset;
        }

        const topY = baseY + rowOffset + firstNonEmptyRow;
        if (topY < 0) {
            return rowOffset - topY;
        }

        return rowOffset;
    }

    #getBottomAlignOffset(pattern) {
        if (!Array.isArray(pattern) || pattern.length === 0) {
            return 0;
        }

        let lastNonEmptyRow = -1;
        for (let i = pattern.length - 1; i >= 0; i--) {
            if (pattern[i] !== 0) {
                lastNonEmptyRow = i;
                break;
            }
        }

        if (lastNonEmptyRow < 0) {
            return 0;
        }

        // Выравниваем символ по нижней границе 8-пиксельной строки.
        return (this.#LEDS_PER_MODULE - 1) - lastNonEmptyRow;
    }

    #getPatternWidth(rowMask) {
        // Определяем количество значащих битов в маске строки
        if (rowMask === 0) {
            return 0;
        }

        // Находим позицию старшего установленного бита
        let width = 0;
        let temp = rowMask;
        while (temp > 0) {
            width++;
            temp >>= 1;
        }

        return width;
    }

    /* =====================================================
       SCROLLING TEXT ANIMATION
    ===================================================== */

    #scrollingText = '';
    #scrollPosition = 16;
    #scrollIntervalMs = 200;    // миллисекунды между шагами смещения
    #scrollStepPixels = 1;     // пиксели за один шаг
    #scrollFrameCount = 0;
    #scrollAnimationId = null;
    #isScrolling = false;
    #scrollCompletionResolver = null;
    #restoreOrientationAfterScroll = false;

    startScrollingText(text = '', stepPixels = 1.2, intervalMs = 80) {
        if (!text || typeof text !== 'string') {
            return Promise.resolve(false);
        }

        this.stopScrollingText();

        this.#restoreOrientationAfterScroll = false;
        if (this.orientation === Orientation.VERTICAL) {
            this.changeOrientation();
            this.#restoreOrientationAfterScroll = true;
        }

        this.#scrollingText = text;
        this.#scrollStepPixels = stepPixels;           // пиксели за один шаг
        this.#scrollIntervalMs = Math.max(10, intervalMs); // миллисекунды между шагами (минимум 10мс)
        this.#scrollFrameCount = 0;
        this.#isScrolling = true;

        return new Promise((resolve) => {
            this.#scrollCompletionResolver = resolve;
            this.#animateScrollWithInterval();
        });
    }

    stopScrollingText() {
        this.#isScrolling = false;
        if (this.#scrollAnimationId !== null) {
            clearInterval(this.#scrollAnimationId);
            this.#scrollAnimationId = null;
        }

        this.#restoreOrientationAfterScrollingIfNeeded();

        this.#resolveScrollingPromise(false);
    }

    #restoreOrientationAfterScrollingIfNeeded() {
        if (!this.#restoreOrientationAfterScroll) {
            return;
        }

        this.#restoreOrientationAfterScroll = false;

        if (this.orientation === Orientation.HORIZONTAL) {
            this.changeOrientation();
        }
    }

    #resolveScrollingPromise(completed) {
        if (this.#scrollCompletionResolver) {
            const resolve = this.#scrollCompletionResolver;
            this.#scrollCompletionResolver = null;
            resolve(completed);
        }
    }

    #animateScrollWithInterval() {
        if (!this.#isScrolling) {
            return;
        }

        // Вычисляем реальную ширину текста
        let textWidth = 0;
        const normalizedText = this.#scrollingText;
        const letterSpacing = 2;

        for (let char of normalizedText) {
            const pattern = this.#alphabet[char];
            if (pattern) {
                textWidth += this.#getCharacterWidth(char) + letterSpacing;
            } else {
                textWidth += letterSpacing;
            }
        }

        // Полная дистанция: текст входит справа и выходит полностью влево
        const totalDistance = 16 + textWidth + 5;
        const maxSteps = Math.ceil(totalDistance / this.#scrollStepPixels);

        this.#scrollAnimationId = setInterval(() => {
            if (this.#scrollFrameCount < maxSteps) {
                // Вычисляем текущую позицию на основе количества шагов
                const currentX = 16 - (this.#scrollFrameCount * this.#scrollStepPixels);
                this.drawString(this.#scrollingText, Math.round(currentX), 0);

                this.#scrollFrameCount++;
            } else {
                // Анимация завершена
                this.#isScrolling = false;
                clearInterval(this.#scrollAnimationId);
                this.#scrollAnimationId = null;
                this.#restoreOrientationAfterScrollingIfNeeded();
                this.#resolveScrollingPromise(true);
            }
        }, this.#scrollIntervalMs);
    }

    getScrollSpeed() {
        return this.#scrollStepPixels;
    }

    setScrollSpeed(stepPixels) {
        this.#scrollStepPixels = Math.max(0.1, Math.min(stepPixels, 16));
    }

    getScrollInterval() {
        return this.#scrollIntervalMs;
    }

    setScrollInterval(intervalMs) {
        this.#scrollIntervalMs = Math.max(10, intervalMs);
    }

    isScrolling() {
        return this.#isScrolling;
    }
}