class TetrisMode extends BaseMode {
	static COLLISION_OK = 0;
	static COLLISION_BLOCKED = 1;
	static COLLISION_X = 2;

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
	#bitmask = Array(16).fill(0x0);



	constructor(ctx) {
		super(ctx);

		this.pos = {};
		this.offset = {}
		this.linesCleared = 0;
		this.currentTetro = null;
		this.gameInterval = null;
		this.isGameOver = false;


	}
	enter(prevMode) {
		// Инициализация тетриса
		// this.game = new Tetris(this.ctx.matrix);
		// this.game.start();
		console.log("Tetris enter");
		this.startGame();
	}

	startGame() {
		this.isGameOver = false;
		this.linesCleared = 0;
		this.#bitmask.fill(0x0);
		this.#bitmap.fill(0x0);
		this.currentTetro = this.createFig();

		// Очищаем старый интервал если он есть
		if (this.gameInterval) {
			clearInterval(this.gameInterval);
		}

		// Создаем новый интервал и сохраняем ссылку
		this.gameInterval = setInterval(() => {
			this.moveTetromino(0, 1);
		}, 500);
	}

	setGameOver() {
		this.isGameOver = true;

		if (this.gameInterval) {
			clearInterval(this.gameInterval);
			this.gameInterval = null;
		}

		console.log("Tetris game over");
	}

	exit(nextMode) {
		// Остановить таймеры/игру
		if (this.gameInterval) {
			clearInterval(this.gameInterval);
			this.gameInterval = null;
		}
		console.log("Tetris exit");
	}

	calculateInitialPosition(tetromino) {
		return {
			x: Math.floor(tetromino[0].length / 2) * -1 + 4, // Центрируем по X относительно ширины матрицы (8)
			y: 0
		};
	}



	handleInput(btnIdx, pressType) {
		if (this.isGameOver) {
			this.startGame();
			return;
		}

		// Выход в часы по комбинации LEFT+RIGHT (кнопка 4)
		if (pressType === 'combo' && btnIdx === 4) {
			this.ctx.matrix.changeOrientation();
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
				} else if (pressType === 'hold') {
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

		if(this.checkCollision(rotated, this.pos.x, this.pos.y) === TetrisMode.COLLISION_OK){

			this.currentTetro = rotated; // обновляем текущее состояние
			this.offset = this.setOffset(rotated);
			this.matrixDraw(this.currentTetro, this.pos.x, this.pos.y)
		}

	}

	removeFullLines() {
		let removed = 0;

		for (let row = this.#bitmask.length - 1; row >= 0; row--) {
			if (this.#bitmask[row] === 0xFF) {
				// сдвигаем все строки выше вниз на 1
				for (let y = row; y > 0; y--) {
					this.#bitmask[y] = this.#bitmask[y - 1];
				}
				// верхняя строка пустая
				this.#bitmask[0] = 0x00;
				removed++;

				// важно: повторно проверяем этот же row,
				// потому что сюда приехала новая строка сверху
				row++;
			}
		}

		if (removed > 0) {
			this.linesCleared += removed;
			console.log(`Tetris lines cleared: ${this.linesCleared}`);
		}
	}

	moveTetromino(x, y) {
		if (this.isGameOver || !this.currentTetro) {
			return;
		}

		const move = {
			x: this.pos.x + x,
			y: this.pos.y + y
		}

		const state = this.checkCollision(this.currentTetro, move.x, move.y);

		switch (state) {
			case TetrisMode.COLLISION_OK:
				this.pos.x = move.x;
				this.pos.y = move.y;
				break;

			case TetrisMode.COLLISION_X: {
				// const stateY = this.checkCollision(this.currentTetro, this.pos.x, this.pos.y + y);
				// if (stateY === TetrisMode.COLLISION_OK) {
				this.pos.y += y;
				// } 
				// else if (stateY === TetrisMode.COLLISION_BLOCKED) {
				// 	this.mergeBitmapToMask();
				// 	this.currentTetro = this.createFig();
				// }
				break;
			}

			case TetrisMode.COLLISION_BLOCKED:
				this.mergeBitmapToMask();
				this.removeFullLines();
				this.currentTetro = this.createFig();

				if (this.checkCollision(this.currentTetro, this.pos.x, this.pos.y) !== TetrisMode.COLLISION_OK) {
					this.setGameOver();
					this.currentTetro = null;
					this.matrixDraw([[0]], 0, 0);
					return;
				}
				break;
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

	setOffset(arr) {
		return { x: arr[0].length - 1, y: arr.length - 1 };
	}

	matrixDraw(figure, x, y) {
		this.#bitmap.fill(0);

		for (let i = 0; i < figure.length; i++) {
			for (let j = 0; j < figure[i].length; j++) {
				if (figure[i][j] === 1) {
					const bitmapIndex = y + i;
					if (bitmapIndex >= 0 && bitmapIndex < this.#bitmap.length) {
						// Устанавливаем бит в позиции j
						this.#bitmap[bitmapIndex] |= (1 << (7 - (x + j)));
					}
				}
			}
		}



		const transformArr = Array(16).fill(0x0);

		for (let i = 0; i < transformArr.length; i++) {
			let tansMask = 0x00;
			let n = 0;
			// Берём колонку, но в перевёрнутом порядке
			if (i < 8) {
				n = 8;
			}
			else {
				n = 0;
			}
			for (let j = 0; j < 8; j++) {
				let m = n + j;
				const col = this.#bitmask[m] | this.#bitmap[m];
				// Проверяем бит j в колонке col
				const bit = (col >> (7 - i % 8)) & 1;

				if (bit === 1) {
					tansMask |= (1 << j);
				}
			}

			transformArr[i] = tansMask;
		}

		// this.#bitmap.forEach((num, index) => {
		// 	const transformNum = transformArr[index];
		// 	console.log(`${String(index + 1).padStart(2, '0')}: 0b${num.toString(2).padStart(8, '0')} 0b${transformNum.toString(2).padStart(8, '0')}`);
		// });



		// Отрисовка на физической матрице
		for (let matrixNum = 0; matrixNum < 2; matrixNum++) {
			for (let i = 1; i < 9; i++) {
				const bitmapIndex = (matrixNum * 8 + i - 1);
				// let mergeBits = this.#bitmap[bitmapIndex]; // | this.#bitmask[bitmapIndex]
				let mergeBits = transformArr[bitmapIndex];

				this.ctx.matrix.maxWrite(i + (matrixNum * 8), mergeBits);

			}
		}
		// transformArr.forEach((num, index) => {
		// 	console.log(`Элемент ${index}: 0b${num.toString(2).padStart(8, '0')}`);
		// });

		this.ctx.matrix.draw();
	}

	mergeBitmapToMask() {
		for (let i = 0; i < this.#bitmap.length; i++) {
			this.#bitmask[i] |= this.#bitmap[i];
		}
	}

	checkCollision(figure, x, y) {
		for (let i = 0; i < figure.length; i++) {
			for (let j = 0; j < figure[i].length; j++) {
				if (figure[i][j] !== 1) continue;

				const bx = x + j;
				const by = y + i;

				// стенки по X
				if (bx < 0 || bx >= 8) {
					return TetrisMode.COLLISION_X;
				}

				// низ
				if (by >= 16) {
					return TetrisMode.COLLISION_BLOCKED;
				}

				// столкновение с маской
				if (by >= 0 && (this.#bitmask[by] & (1 << (7 - bx)))) {
					// если пробовали смещение по X — считаем X-коллизией
					if (x !== this.pos.x) return TetrisMode.COLLISION_X;
					return TetrisMode.COLLISION_BLOCKED;
				}
			}
		}
		return TetrisMode.COLLISION_OK;
	}



	onMinute() {
		// Обычно пусто для тетриса
	}
}