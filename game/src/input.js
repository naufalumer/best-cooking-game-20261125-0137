// Dapur Sore — keyboard and mouse.
// One file, one job: turn keys and clicks into the plain input object the
// world steps on. No game rules here, only devices.
import { PANTRY_ORDER, STATIONS } from './config.js';

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  KeyE: 'interact', Space: 'interact',
  KeyQ: 'takeBack',
};

export function createInput() {
  const held = new Set();
  const pressed = new Set(); // edges, drained once per frame
  let pantryKey = null;
  let click = null; // { x, y } in canvas pixels, drained once per frame

  function onKeyDown(event) {
    const action = KEYMAP[event.code];
    if (action === 'interact' && event.code === 'Space') event.preventDefault();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!action) {
      // Number keys 1..7 take that pantry ingredient.
      const n = Number(event.key);
      if (Number.isInteger(n) && n >= 1 && n <= PANTRY_ORDER.length) {
        pantryKey = PANTRY_ORDER[n - 1];
      }
      return;
    }
    if (!held.has(action)) pressed.add(action);
    held.add(action);
  }

  function onKeyUp(event) {
    const action = KEYMAP[event.code];
    if (action) held.delete(action);
  }

  function onMouseDown(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const scaleX = event.currentTarget.width / rect.width;
    const scaleY = event.currentTarget.height / rect.height;
    click = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  return {
    attach(canvas) {
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      canvas.addEventListener('mousedown', onMouseDown);
    },
    // Read this frame's input, then clear the edges.
    poll() {
      const mx = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
      const my = (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0);
      const out = {
        mx,
        my,
        interact: pressed.has('interact'),
        interactHeld: held.has('interact'),
        pantryKey,
        takeBack: pressed.has('takeBack'),
        click,
      };
      pressed.clear();
      pantryKey = null;
      click = null;
      return out;
    },
  };
}

// Where the pantry's crates sit on the counter, for clicks: one crate per
// ingredient, left to right.
export function pantryCrateAt(x, y) {
  const s = STATIONS.pantry;
  if (x < s.x || x > s.x + s.width || y < s.y - 6 || y > s.y + s.height + 6) return null;
  const slot = Math.floor(((x - s.x) / s.width) * PANTRY_ORDER.length);
  return PANTRY_ORDER[Math.max(0, Math.min(PANTRY_ORDER.length - 1, slot))];
}
