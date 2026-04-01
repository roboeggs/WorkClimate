export default class CoordinateMapper {
  map(x, y) {
    throw new Error('map not implemented');
  }
  isInside(x, y) {
    return this.map(x, y) !== null;
  }
}
