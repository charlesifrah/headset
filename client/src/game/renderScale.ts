import { MAP_WIDTH, MAP_HEIGHT } from '@shared-field/shared';

// The world is 800x600, but Scale.FIT stretches the canvas to fill the screen,
// so rendering at 1x looks blurry (especially on retina). Render the canvas at
// the real on-screen pixel size instead and zoom the camera by the same factor,
// so all game code keeps working in 800x600 world coordinates.
const fit = Math.min(window.innerWidth / MAP_WIDTH, window.innerHeight / MAP_HEIGHT);
const dpr = window.devicePixelRatio || 1;

export const RENDER_SCALE = Math.min(4, Math.max(1, Math.ceil(fit * dpr)));
