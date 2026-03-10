// --- Timing ---
export const SIMULATION_TICK_MS = 250;
export const BROADCAST_TICK_MS = 150;
export const ROUND_DURATION_MS = 75_000; // 75 seconds
export const COUNTDOWN_SECONDS = 3;

// --- Zone grid ---
export const GRID_COLS = 3;
export const GRID_ROWS = 3;
export const ZONE_COUNT = GRID_COLS * GRID_ROWS;

// --- Map dimensions (game units) ---
export const MAP_WIDTH = 800;
export const MAP_HEIGHT = 600;
export const ZONE_RADIUS = 48;

// --- Instability thresholds ---
export const THRESHOLD_CALM = 24;
export const THRESHOLD_EMERGING = 49;
export const THRESHOLD_ACTIVE = 74;
export const THRESHOLD_CRITICAL = 75;
export const INSTABILITY_MAX = 100;
export const INSTABILITY_MIN = 0;

// --- Simulation tuning ---
export const ESCALATION_ZONES_MIN = 1;
export const ESCALATION_ZONES_MAX = 2;
export const ESCALATION_AMOUNT_MIN = 1;
export const ESCALATION_AMOUNT_MAX = 3.5;
export const NATURAL_DECAY_RATE = 0.35;
export const SPREAD_THRESHOLD = 75;
export const SPREAD_SUSTAIN_TICKS = 16; // ~4 seconds at 250ms tick before spread
export const SPREAD_AMOUNT_MIN = 3;
export const SPREAD_AMOUNT_MAX = 6;
export const SPREAD_MAX_NEIGHBORS = 2;

// --- Player action ---
export const ACTION_RANGE = 170;
export const ACTION_REDUCTION_PER_TICK = 15;

// --- Player movement ---
export const PLAYER_SPEED = 4; // pixels per frame at 60fps equivalent
export const PLAYER_RADIUS = 16;

// --- Scoring ---
export const CRITICAL_SAVE_THRESHOLD = 50; // zone dropped from >=75 to below this
