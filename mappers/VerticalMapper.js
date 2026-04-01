import CoordinateMapper from './CoordinateMapper.js';
import HorizontalMapper from './HorizontalMapper.js';

const horizontal = new HorizontalMapper();

export default class VerticalMapper extends CoordinateMapper {
  // логическая область: x 0..7, y 0..15
  map(x, y) {
    if (x < 0 || x >= 8 || y < 0 || y >= 16) return null;

    const logicalRow = 7 - x;
    const logicalCol = y;

    // ровно то же, что было: this.#setBitmaskPixelByMatrixView(logicalCol, logicalRow)
    return horizontal.map(logicalCol, logicalRow);
  }
}
