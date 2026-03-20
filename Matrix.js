class Matrix{
    #circleCountX = 16;
    #circleCountY = 8;
    #colorLedOFF = 180;

    constructor(colorLed = 'red', matrixWidth, matrixHeight) {
        this.colorLedON = colorLed;
        this.matrixWidth = matrixWidth;
        this.matrixHeight = matrixHeight;
        this.LedsState = Array.from({ length: this.#circleCountY }, () =>
            Array.from({ length: this.#circleCountX }, () => 0x00)
        );
    }
    setup(){
        createCanvas(this.matrixWidth, this.matrixHeight);
        noLoop(); // рисуем один раз
    }
    draw(){
        // Заливаем фон чёрным
        background(0);

        // Параметры для кружков
        const diameter = 22;       // диаметр кружка

        // Вычисляем шаг между центрами кружков
        const stepX = this.matrixWidth / this.#circleCountX;
        const stepY = this.matrixHeight / this.#circleCountY;

        // Рисуем сетку кружков
        for (let row = 0; row < this.#circleCountY; row++) {
            for (let col = 0; col < this.#circleCountX; col++) {
            // Координаты центра кружка
            const x = col * stepX + stepX / 2;
            const y = row * stepY + stepY / 2;

            // Устанавливаем цвет заливки (серый)
            fill(this.#colorLedOFF);
            // Убираем обводку
            noStroke();
            // Рисуем кружок
            circle(x, y, diameter);
            }
        }
    }
}