import HorizontalMapper from './HorizontalMapper.js';
import VerticalMapper from './VerticalMapper.js';

// Небольшой адаптер для Matrix: единый метод установки пикселя
export function createMapperForOrientation(orientation) {
  if (orientation === 1) { // Orientation.VERTICAL
    return new VerticalMapper();
  } else {
    return new HorizontalMapper();
  }
}
