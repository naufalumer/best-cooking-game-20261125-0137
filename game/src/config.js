// Dapur Sore — Rush Hour Kitchen: tuning and layout constants.
// One file, one job: every number the kitchen runs on lives here, so the
// world, the renderer and the screenshot autopilot all read the same truth.
export const CANVAS = { width: 960, height: 640 };

export const SHIFT_SECONDS = 150;
export const MAX_HEARTS = 3;
export const MAX_ORDERS = 4;
export const MAX_CARRY = 3;
export const CHEF_SPEED = 260; // px per second
export const INTERACT_RANGE = 58; // px from a station's front edge

// The top strip (y 0..88) is the order board; the kitchen floor starts at y 96.
export const BOARD = { x: 0, y: 0, width: 960, height: 88 };
export const FLOOR_TOP = 96;

// Counters run along the top wall; the chef works the open floor below them.
export const STATIONS = {
  pantry: { x: 16, y: 100, width: 190, height: 52, label: 'PANTRY' },
  board: { x: 222, y: 100, width: 130, height: 52, label: 'CHOP' },
  stove: { x: 368, y: 100, width: 170, height: 52, label: 'STOVE' },
  plates: { x: 554, y: 100, width: 150, height: 52, label: 'PLATE' },
  bin: { x: 720, y: 100, width: 64, height: 52, label: 'BIN' },
  window: { x: 800, y: 100, width: 144, height: 52, label: 'SERVE' },
};

// Burners sit on the stove counter, left and right.
export const BURNERS = [
  { x: 392, y: 133, radius: 17 },
  { x: 482, y: 133, radius: 17 },
];
// Plates sit on the plate counter.
export const PLATE_SPOTS = [
  { x: 592, y: 134, radius: 20 },
  { x: 662, y: 134, radius: 20 },
];
export const BOARD_SPOT = { x: 287, y: 133, radius: 15 };

export const CHOP_SECONDS = 1.1;
export const BURN_AFTER_DONE_SECONDS = 8;

export const COOK_SECONDS = {
  patty: 4,
  noodle: 5,
  egg: 3,
};

export const ORDER = {
  firstSpawnAt: 2, // seconds into the shift before the first ticket
  spawnStart: 16, // seconds between tickets at the start
  spawnMin: 9, // fastest the tickets ever come
  spawnStep: 0.35, // seconds faster per dish served
  patienceStart: 52, // seconds a ticket lives at the start
  patienceMin: 34,
  patienceStep: 0.5, // seconds shorter per dish served
};

// Stars are tuned from the autopilot's own scored runs (avg ~$237 a shift,
// best ~$257, 0 orders lost): a decent human shift clears two stars, and
// three stars means playing as clean as the autopilot.
export const STARS = { one: 100, two: 170, three: 240 };

// Ingredient ids in pantry order (keys 1..7 when standing at the pantry).
export const PANTRY_ORDER = ['bun', 'patty', 'tomato', 'lettuce', 'onion', 'noodle', 'egg'];
