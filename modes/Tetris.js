import BaseMode from './BaseMode.js';
import { AppMode } from './../core/AppConstants.js';
import { debugLog } from './../core/debug.js';

export default class TetrisMode extends BaseMode {
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
		// Initialize Tetris mode.
		// this.game = new Tetris(this.ctx.matrix);
		// this.game.start();
		debugLog('Tetris enter');
		this.startGame();
	}

	startGame() {
		this.isGameOver = false;
		this.linesCleared = 0;
		this.#bitmask.fill(0x0);
		this.currentTetro = this.createFig();

		// Clear previous interval if it exists.
		if (this.gameInterval) {
			clearInterval(this.gameInterval);
		}

		// Create and store a new interval.
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

		debugLog('Tetris game over');
	}

	exit(nextMode) {
		// Stop timers/game loop.
		if (this.gameInterval) {
			clearInterval(this.gameInterval);
			this.gameInterval = null;
		}
		debugLog('Tetris exit');
	}

	calculateInitialPosition(tetromino) {
		return {
			x: Math.floor(tetromino[0].length / 2) * -1 + 4, // Center on X relative to matrix width (8).
			y: 0
		};
	}



	handleInput(btnIdx, pressType) {
		if (this.isGameOver) {
			this.startGame();
			return;
		}

		if (pressType === 'combo' && btnIdx === 3) {
			this.ctx.switchMode(AppMode.CLOCK);
			return;
		}

		// Exit to clock with LEFT+RIGHT combo (button 4).
		if (pressType === 'combo' && btnIdx === 4) {
			this.ctx.matrix.changeOrientation();
			this.ctx.switchMode(AppMode.CLOCK);
			return;
		}

		// Handle single-key actions based on game state.
		switch (btnIdx) {
			case 0: // LEFT_ARROW - move left
				if (pressType === 'short') {
					this.moveTetromino(-1, 0);
				}
				break;

			case 2: // RIGHT_ARROW - move right
				if (pressType === 'short') {
					this.moveTetromino(1, 0);
				}
				break;

			case 1: // DOWN_ARROW - speed up falling
				if (pressType === 'short') { // ROTATE (if available) - rotate piece
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

		// Create matrix with swapped dimensions.
		const rotated = Array(cols).fill().map(() => Array(rows).fill(0));

		// Rotate: element [i][j] moves to [j][n-1-i].
		for (let i = 0; i < rows; i++) {
			for (let j = 0; j < cols; j++) {
				rotated[j][rows - 1 - i] = this.currentTetro[i][j];
			}
		}

		if (this.checkCollision(rotated, this.pos.x, this.pos.y) === TetrisMode.COLLISION_OK) {

			this.currentTetro = rotated; // Update current piece state.
			this.offset = this.setOffset(rotated);
			this.matrixDraw(this.currentTetro, this.pos.x, this.pos.y)
		}

	}

	removeFullLines() {
		let removed = 0;

		for (let row = this.#bitmask.length - 1; row >= 0; row--) {
			if (this.#bitmask[row] === 0xFF) {
				// Shift all rows above down by one.
				for (let y = row; y > 0; y--) {
					this.#bitmask[y] = this.#bitmask[y - 1];
				}
				// Top row becomes empty.
				this.#bitmask[0] = 0x00;
				removed++;

				// Re-check this row because a new one shifted into it.
				row++;
			}
		}

		if (removed > 0) {
			this.linesCleared += removed;
			debugLog(`Tetris lines cleared: ${this.linesCleared}`);
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
		// Get list of tetromino keys.
		const keys = Object.keys(this.#TETROMINOES);

		// Generate random index in key range.
		const randomIndex = Math.floor(Math.random() * keys.length);

		// Get random key.
		const randomKey = keys[randomIndex];

		// Get random piece by key.
		const randomTetromino = this.#TETROMINOES[randomKey];

		this.pos = this.calculateInitialPosition(randomTetromino);
		this.offset = this.setOffset(randomTetromino);

		return randomTetromino;
	}

	setOffset(arr) {
		return { x: arr[0].length - 1, y: arr.length - 1 };
	}


	matrixDraw(figure, x, y) {
		const matrix = this.ctx.matrix;

		// Clear bitmask.
		matrix.clearBitmask();

		// Draw active piece.
		for (let i = 0; i < figure.length; i++) {
			for (let j = 0; j < figure[i].length; j++) {
				if (figure[i][j] === 1) {
					matrix.setPixel(x + j, y + i);
				}
			}
		}

		// Draw already placed blocks.
		for (let row = 0; row < 16; row++) {
			for (let col = 0; col < 8; col++) {
				if (this.#bitmask[row] & (1 << (7 - col))) {
					matrix.setPixel(col, row);
				}
			}
		}

		matrix.flush();
		matrix.draw();
	}


	mergeBitmapToMask() {
		if (!this.currentTetro) return;

		for (let i = 0; i < this.currentTetro.length; i++) {
			for (let j = 0; j < this.currentTetro[i].length; j++) {
				if (this.currentTetro[i][j] !== 1) continue;

				const bx = this.pos.x + j;
				const by = this.pos.y + i;

				if (bx < 0 || bx >= 8) continue;
				if (by < 0 || by >= 16) continue;

				this.#bitmask[by] |= (1 << (7 - bx));
			}
		}
	}



	checkCollision(figure, x, y) {
		for (let i = 0; i < figure.length; i++) {
			for (let j = 0; j < figure[i].length; j++) {
				if (figure[i][j] !== 1) continue;

				const bx = x + j;
				const by = y + i;

				// X boundaries.
				if (bx < 0 || bx >= 8) {
					return TetrisMode.COLLISION_X;
				}

				// Bottom boundary.
				if (by >= 16) {
					return TetrisMode.COLLISION_BLOCKED;
				}

				// Collision with placed blocks.
				if (by >= 0 && (this.#bitmask[by] & (1 << (7 - bx)))) {
					// If this was an X move attempt, treat as X collision.
					if (x !== this.pos.x) return TetrisMode.COLLISION_X;
					return TetrisMode.COLLISION_BLOCKED;
				}
			}
		}
		return TetrisMode.COLLISION_OK;
	}



	onMinute() {
		// Usually empty for Tetris.
	}
}