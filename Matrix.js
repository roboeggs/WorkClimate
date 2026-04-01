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
        'a': [0b0110, 0b1001, 0b1001, 0b1001, 0b1111, 0b1001, 0b1001], 
        'b': [0b1000, 0b1000, 0b1110, 0b1001, 0b1001, 0b1001, 0b1110], 
        'c': [0b0111, 0b1000, 0b1000, 0b1000, 0b1000, 0b1000, 0b0111],
        'd': [0b0001, 0b0001, 0b0111, 0b1001, 0b1001, 0b1001, 0b0111],
        'e': [0b1111, 0b1000, 0b1000, 0b1110, 0b1000, 0b1000, 0b1111],
        'f': [0b1111, 0b1000, 0b1000, 0b1111, 0b1000, 0b1000, 0b1000],
        'g': [0b0110, 0b1001, 0b1000, 0b1011, 0b1001, 0b1001, 0b0110],
        'h': [0b1000, 0b1000, 0b1110, 0b1001, 0b1001, 0b1001, 0b1001], 
        'i': [0b1000, 0b0000, 0b1000, 0b1000, 0b1000, 0b1000, 0b1000], 
        'j': [0b001, 0b0000, 0b001, 0b001, 0b101, 0b101, 0b0010],
        'k': [0b1001, 0b1010, 0b1100, 0b1110, 0b0001, 0b1001, 0b0001],
        'l': [0b1000, 0b1000, 0b1000, 0b1000, 0b1000, 0b1000, 0b1111],
        'm': [0b10001, 0b11011, 0b11011, 0b10101, 0b10001, 0b10001, 0b10001],
        'n': [0b1010, 0b1101, 0b1001, 0b1001, 0b1001, 0b1001, 0b1001],
        'o': [0b0110, 0b1001, 0b1001, 0b1001, 0b1001, 0b1001, 0b0110],
        'p': [0b1110, 0b1001, 0b1001, 0b1110, 0b0001, 0b0001, 0b0001],
        'q': [0b01110, 0b10010, 0b10010, 0b10010, 0b01110, 0b00011, 0b00010],
        'r': [0b1110, 0b1001, 0b1001, 0b1110, 0b1010, 0b1001, 0b1001],
        's': [0b0110, 0b1001, 0b1000, 0b0110, 0b0001, 0b1001, 0b0110],
        't': [0b1110, 0b0100, 0b0100, 0b0100, 0b0100, 0b0101, 0b0010],
        'u': [0b1001, 0b1001, 0b1001, 0b1001, 0b1001, 0b1001, 0b0111],
        'v': [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
        'w': [0b10001,0b10001,0b10001,0b10101,0b10101,0b01110,0b01010],
        'x': [0b1001, 0b1001, 0b1001, 0b0110, 0b1001, 0b1001, 0b1001],
        'y': [0b1001, 0b1001, 0b1001, 0b0111, 0b0001, 0b1001, 0b0110],
        'z': [0b1111, 0b0001, 0b0001, 0b0110, 0b1000, 0b1000, 0b1111]
    }


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

    drawNumber(hours, minutes, separatorState, blinkDigitsState) {
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

    /* =====================================================
       DRAW STRING
    ===================================================== */

    drawString(text, startX = 0, startY = 0) {
        if (!text || typeof text !== 'string') {
            return false;
        }

        this.#bitmask.fill(0x0);

        const normalizedText = text.toLowerCase();

        if (this.orientation === Orientation.HORIZONTAL) {
            // В горизонтальной ориентации: 16x8 (ширина x высота)
            // startX - начальная позиция по горизонтали
            // startY - начальная позиция по вертикали (обычно 0 или 1)
            
            let currentX = startX;

            for (let charIdx = 0; charIdx < normalizedText.length; charIdx++) {
                const char = normalizedText[charIdx];
                const pattern = this.#alphabet[char];

                if (!pattern) {
                    // Символ не найден в алфавите, пропускаем или рисуем пробел
                    currentX += 2;
                    continue;
                }

                // Каждый символ имеет высоту 7 пикселей
                const patternHeight = pattern.length; // обычно 7
                const charWidth = this.#getCharacterWidth(char);

                // Проверяем, что символ влезает на экран
                if (currentX + charWidth > 16) {
                    break;
                }

                // Рисуем символ
                for (let row = 0; row < patternHeight; row++) {
                    const rowMask = pattern[row];

                    // Определяем количество битов в паттерне
                    const bitsInRow = this.#getPatternWidth(rowMask);

                    for (let col = 0; col < bitsInRow; col++) {
                        // Берём бит справа налево (как в цифрах)
                        const bit = (rowMask >> (bitsInRow - 1 - col)) & 1;

                        if (bit === 1) {
                            this.#setBitmaskPixelByMatrixView(
                                currentX + col,
                                startY + row
                            );
                        }
                    }
                }

                currentX += charWidth + 1; // +1 пиксель между символами
            }
        } else {
            // В вертикальной ориентации: 8x16 (ширина x высота)
            // Текст может быть ориентирован горизонтально или вертикально
            // Для простоты отображаем горизонтально сверху вниз
            
            let currentY = startY;

            for (let charIdx = 0; charIdx < normalizedText.length; charIdx++) {
                const char = normalizedText[charIdx];
                const pattern = this.#alphabet[char];

                if (!pattern) {
                    currentY += 8;
                    continue;
                }

                const patternHeight = pattern.length;
                const charWidth = this.#getCharacterWidth(char);

                if (currentY + patternHeight > 16) {
                    break;
                }

                for (let row = 0; row < patternHeight; row++) {
                    const rowMask = pattern[row];
                    const bitsInRow = this.#getPatternWidth(rowMask);

                    for (let col = 0; col < bitsInRow; col++) {
                        const bit = (rowMask >> (bitsInRow - 1 - col)) & 1;

                        if (bit === 1) {
                            this.#setBitmaskPixelByVerticalView(
                                startX + col,
                                currentY + row
                            );
                        }
                    }
                }

                currentY += patternHeight + 1;
            }
        }

        this.#flushBitmaskToMatrix();
        this.draw();

        return true;
    }

    #getCharacterWidth(char) {
        // Определяем ширину символа по максимальной ширине паттерна
        const pattern = this.#alphabet[char];
        if (!pattern || pattern.length === 0) {
            return 4;
        }

        let maxWidth = 0;
        for (let row of pattern) {
            const width = this.#getPatternWidth(row);
            if (width > maxWidth) {
                maxWidth = width;
            }
        }

        return maxWidth > 0 ? maxWidth : 4;
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
    #scrollIntervalMs = 50;    // миллисекунды между шагами смещения
    #scrollStepPixels = 1;     // пиксели за один шаг
    #scrollFrameCount = 0;
    #scrollAnimationId = null;
    #isScrolling = false;

    startScrollingText(text = '', stepPixels = 0.1, intervalMs = 100) {
        if (!text || typeof text !== 'string') {
            return;
        }

        this.#scrollingText = text.toLowerCase();
        this.#scrollStepPixels = stepPixels;           // пиксели за один шаг
        this.#scrollIntervalMs = Math.max(10, intervalMs); // миллисекунды между шагами (минимум 10мс)
        this.#scrollPosition = 16;
        this.#scrollFrameCount = 0;
        this.#isScrolling = true;

        this.#animateScrollWithInterval();
    }

    stopScrollingText() {
        this.#isScrolling = false;
        if (this.#scrollAnimationId !== null) {
            clearInterval(this.#scrollAnimationId);
            this.#scrollAnimationId = null;
        }
    }

    #animateScrollWithInterval() {
        if (!this.#isScrolling) {
            return;
        }

        // Вычисляем реальную ширину текста
        let textWidth = 0;
        const normalizedText = this.#scrollingText.toLowerCase();
        
        for (let char of normalizedText) {
            const pattern = this.#alphabet[char];
            if (pattern) {
                textWidth += this.#getCharacterWidth(char) + 1;
            } else {
                textWidth += 2;
            }
        }

        // Полная дистанция: текст входит справа и выходит полностью влево
        const totalDistance = 16 + textWidth + 5;
        const maxSteps = Math.ceil(totalDistance / this.#scrollStepPixels);

        this.#scrollAnimationId = setInterval(() => {
            if (this.#scrollFrameCount < maxSteps) {
                // Вычисляем текущую позицию на основе количества шагов
                const currentX = 16 - (this.#scrollFrameCount * this.#scrollStepPixels);
                this.drawString(this.#scrollingText, Math.round(currentX), 1);

                this.#scrollFrameCount++;
            } else {
                // Анимация завершена
                this.#isScrolling = false;
                clearInterval(this.#scrollAnimationId);
                this.#scrollAnimationId = null;
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