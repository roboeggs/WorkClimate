import p5 from 'p5';

window.p5 = p5;
globalThis.p5 = p5;

import './core/AppConstants.js';
import './core/nrf24l01.js';
import './script.js';
import './modes/orbitEditor.js';
import { debugLog, initDebugFromUrl } from './core/debug.js';

initDebugFromUrl();
debugLog('[debug] startup complete');
