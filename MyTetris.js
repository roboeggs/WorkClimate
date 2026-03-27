class TetrisMode extends BaseMode {
	#TETROMINOES = {
		I: [[1, 1, 1, 1]],
		O: [
			[1, 1],
			[1, 1]
		],
		T: [
			[0, 1, 0],
			[1, 1, 1]
		],
		S: [
			[0, 1, 1],
			[1, 1, 0]
		],
		Z: [
			[1, 1, 0],
			[0, 1, 1]
		],
		J: [
			[1, 0, 0],
			[1, 1, 1]
		],
		L: [
			[0, 0, 1],
			[1, 1, 1]
		]
	};

	#bitmap = Array(16).fill(0x0);


	constructor(ctx) {
		super(ctx);

		this.pos= {};
		this.offset = {}
		this.currentTetro = this.createFig();


	}
	enter(prevMode) {
		// Инициализация тетриса
		// this.game = new Tetris(this.ctx.matrix);
		// this.game.start();
		console.log("Tetris enter");
		this.startGame();
	}

	startGame() {
		setInterval(() => {
			this.moveTetromino(0, 1);
		}, 500);
	}

	exit(nextMode) {
		// Остановить таймеры/игру
		// if (this.game) this.game.stop();
		console.log("Tetris exit");
	}

	calculateInitialPosition(tetromino) {
		return {
			x: 3 - Math.floor(tetromino[0].length / 2),
			y: 0
		};
	}



	handleInput(btnIdx, pressType) {
		// Выход в часы по комбинации LEFT+RIGHT (кнопка 4)
		if (pressType === 'combo' && btnIdx === 4) {
			this.ctx.switchMode(AppMode.CLOCK);
			return;
		}

		// Обработка одиночных нажатий в зависимости от состояния игры
		switch (btnIdx) {
			case 0: // LEFT_ARROW — движение влево
				if (pressType === 'short') {
					this.moveTetromino(-1, 0);
				}
				break;

			case 2: // RIGHT_ARROW — движение вправо
				if (pressType === 'short') {
					this.moveTetromino(1, 0);
				}
				break;

			case 1: // DOWN_ARROW — ускорение падения
				if (pressType === 'short') { // ROTATE (если есть) — поворот фигуры
					this.rotateTetromino();
				} else if (pressType === 'long') {
					this.moveTetromino(0, 1);
				}
				break;

		}
	}


	tick() {
		// this.game.update();
	}

	rotateTetromino() {
		const rows = this.currentTetro.length;
		const cols = this.currentTetro[0].length;

		// Создаём новую матрицу с перевёрнутыми размерностями
		const rotated = Array(cols).fill().map(() => Array(rows).fill(0));

		// Заполняем новую матрицу: элемент [i][j] переходит в [j][n-1-i]
		for (let i = 0; i < rows; i++) {
			for (let j = 0; j < cols; j++) {
				rotated[j][rows - 1 - i] = this.currentTetro[i][j];
			}
		}

		this.currentTetro = rotated; // обновляем текущее состояние
		this.offset = this.setOffset(rotated);

		this.matrixDraw(this.currentTetro, this.pos.x, this.pos.y)
	}


	moveTetromino(x, y) {
		if (this.pos.x + x >= 0 && this.pos.x + x + this.offset.x < 8) {
			this.pos.x += x;
		}
		if (this.pos.y + this.offset.y > 16) {
			this.currentTetro = this.createFig();
		} else {
			this.pos.y += y;
		}
		this.matrixDraw(this.currentTetro, this.pos.x, this.pos.y, this.currentRotation)
	}

	createFig() {
		// Получаем массив ключей объекта
		const keys = Object.keys(this.#TETROMINOES);

		// Генерируем случайный индекс в пределах длины массива ключей
		const randomIndex = Math.floor(Math.random() * keys.length);

		// Получаем случайный ключ
		const randomKey = keys[randomIndex];

		// Получаем случайную фигуру по ключу
		const randomTetromino = this.#TETROMINOES[randomKey];

		this.pos = this.calculateInitialPosition(randomTetromino);
		this.offset = this.setOffset(randomTetromino);

		return randomTetromino;
	}

	setOffset(arr){
		console.log('n: %d, m: %d.', arr[0].length -1, arr.length -1)
		return {x: arr[0].length -1, y: arr.length -1};
	}

	matrixDraw(figure, x, y) {
		// Очищаем bitmap перед отрисовкой
		this.#bitmap.fill(0x0);

		for (let i = 0; i < figure.length; i++) {
			for (let j = 0; j < figure[i].length; j++) {
				if (figure[i][j] === 1) {
					const bitmapIndex = 8 + x + j;
					if (bitmapIndex >= 0 && bitmapIndex < this.#bitmap.length) {
						// Устанавливаем бит в позиции j
						this.#bitmap[bitmapIndex] |= (1 << (i + y));
					}
				}
			}
		}

		// Отрисовка на физической матрице
		for (let matrixNum = 0; matrixNum < 2; matrixNum++) {
			for (let i = 1; i < 9; i++) {
				const bitmapIndex = matrixNum * 8 + i - 1;

				this.ctx.matrix.maxWrite(i + (matrixNum * 8), this.#bitmap[bitmapIndex]);

			}
		}
		// this.#bitmap.forEach((num, index) => {
		// 	console.log(`Элемент ${index}: 0b${num.toString(2).padStart(8, '0')}`);
		// });

		this.ctx.matrix.draw();

	}

	onMinute() {
		// Обычно пусто для тетриса
	}
}