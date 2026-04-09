import HorizontalMapper from './HorizontalMapper.js';
import VerticalMapper from './VerticalMapper.js';

// Small adapter for Matrix: unified pixel-set method.
export function createMapperForOrientation(orientation) {
  if (orientation === 1) { // Orientation.VERTICAL
    return new VerticalMapper();
  } else {
    return new HorizontalMapper();
  }
}
