import CoordinateMapper from './CoordinateMapper.js';

export default class HorizontalMapper extends CoordinateMapper {
  // Logical area: x 0..15, y 0..7
  map(x, y) {
    if (x < 0 || x >= 16 || y < 0 || y >= 8) return null;

    const matrixRow = (x >= 8 ? 0 : 8) + (7 - y);
    const matrixBit = x >= 8 ? x - 8 : x;

    const sourceBase = matrixRow < 8 ? 8 : 0;
    const sourceRow = sourceBase + matrixBit;
    const sourceBit = 7 - (matrixRow % 8);

    return { row: sourceRow, bitIndex: sourceBit };
  }
}
