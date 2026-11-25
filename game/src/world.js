// Dapur Sore — the kitchen itself: orders, stations, the chef, the clock.
// One file, one job: the whole game as pure state and steps, with no DOM in
// it, so the same code runs in the browser and in a Node test harness.
// Every rule the player feels lives here: chopping, cooking, burning,
// plating, serving, patience, combos and the shift timer.
import {
  BOARD_SPOT,
  BURNERS,
  BURN_AFTER_DONE_SECONDS,
  CANVAS,
  CHOP_SECONDS,
  COOK_SECONDS,
  CHEF_SPEED,
  INTERACT_RANGE,
  MAX_CARRY,
  MAX_HEARTS,
  MAX_ORDERS,
  ORDER,
  PLATE_SPOTS,
  SHIFT_SECONDS,
  STATIONS,
} from './config.js';
import { INGREDIENTS, DISHES, DISH_IDS, dishMatchingPlate, plateStillPossible, itemKey } from './recipes.js';
import { mulberry32, weightedPick } from './random.js';

export const COMBO_WINDOW = 20;

const DISH_TABLE = DISH_IDS.map((id) => ({ value: id, weight: DISHES[id].weight }));

export function createWorld(seed) {
  return {
    seed,
    rng: mulberry32(seed),
    phase: 'title', // title | play | over
    time: 0,
    timeLeft: SHIFT_SECONDS,
    chef: { x: CANVAS.width / 2, y: 560, dir: 0, carry: [] },
    board: { item: null, progress: 0 },
    burners: BURNERS.map(() => ({ item: null, progress: 0, done: false, burnTimer: 0 })),
    plates: [[], []],
    orders: [],
    nextOrderIn: ORDER.firstSpawnAt,
    orderSeq: 0,
    served: 0,
    lost: 0,
    coins: 0,
    combo: 0,
    comboTimer: 0,
    bestCombo: 0,
    hearts: MAX_HEARTS,
    floaters: [],
    events: [],
    stats: { chopped: 0, cooked: 0, served: 0, burnt: 0, binned: 0, picked: 0 },
  };
}

export function startShift(world) {
  world.phase = 'play';
  world.time = 0;
  world.timeLeft = SHIFT_SECONDS;
  world.orders = [];
  world.nextOrderIn = ORDER.firstSpawnAt;
  world.served = 0;
  world.lost = 0;
  world.coins = 0;
  world.combo = 0;
  world.comboTimer = 0;
  world.bestCombo = 0;
  world.hearts = MAX_HEARTS;
  world.floaters = [];
  world.events = [];
  world.chef.carry = [];
  world.chef.x = CANVAS.width / 2;
  world.chef.y = 560;
  world.board = { item: null, progress: 0 };
  world.burners = BURNERS.map(() => ({ item: null, progress: 0, done: false, burnTimer: 0 }));
  world.plates = [[], []];
}

// A point on the floor in front of a station, where the chef stands to use it.
export function stationFront(id) {
  const s = STATIONS[id];
  return { x: s.x + s.width / 2, y: s.y + s.height + 34 };
}

function rectHit(x, y, rect, pad) {
  return x > rect.x - pad && x < rect.x + rect.width + pad && y > rect.y - pad && y < rect.y + rect.height + pad;
}

function collides(world, x, y) {
  if (x < 24 || x > CANVAS.width - 24 || y < 168 || y > CANVAS.height - 24) return true;
  for (const id of Object.keys(STATIONS)) {
    if (rectHit(x, y, STATIONS[id], 14)) return true;
  }
  return false;
}

function nearestStation(world) {
  const chef = world.chef;
  let best = null;
  let bestDist = Infinity;
  for (const id of Object.keys(STATIONS)) {
    const s = STATIONS[id];
    const cx = Math.max(s.x, Math.min(chef.x, s.x + s.width));
    const cy = Math.max(s.y, Math.min(chef.y, s.y + s.height));
    const d = Math.hypot(chef.x - cx, chef.y - cy);
    if (d < bestDist) {
      bestDist = d;
      best = id;
    }
  }
  return bestDist <= INTERACT_RANGE ? best : null;
}

function floater(world, x, y, text, colour) {
  world.floaters.push({ x, y, text, colour, ttl: 1.4 });
}

function spawnOrder(world) {
  const dish = weightedPick(world.rng, DISH_TABLE);
  const patience = Math.max(
    ORDER.patienceMin,
    ORDER.patienceStart - ORDER.patienceStep * world.served,
  );
  world.orderSeq += 1;
  world.orders.push({ id: world.orderSeq, dish, patience, max: patience });
  world.events.push('ticket');
}

function endShift(world) {
  world.phase = 'over';
  world.events.push('over');
}

function servePlate(world, plateIndex) {
  const plate = world.plates[plateIndex];
  const dishId = dishMatchingPlate(plate);
  if (dishId === null) return false;
  const orderIndex = world.orders.findIndex((o) => o.dish === dishId);
  if (orderIndex === -1) return false;
  const order = world.orders[orderIndex];
  const dish = DISHES[dishId];
  world.combo = world.comboTimer > 0 ? world.combo + 1 : 1;
  world.comboTimer = COMBO_WINDOW;
  if (world.combo > world.bestCombo) world.bestCombo = world.combo;
  const tip = Math.round(dish.price * 0.5 * (order.patience / order.max)) + (world.combo - 1) * 2;
  const earned = dish.price + tip;
  world.coins += earned;
  world.served += 1;
  world.stats.served += 1;
  world.orders.splice(orderIndex, 1);
  world.plates[plateIndex] = [];
  const spot = PLATE_SPOTS[plateIndex];
  floater(world, spot.x, spot.y - 48, `+$${earned}`, '#ffd94d');
  if (world.combo > 1) floater(world, spot.x, spot.y - 70, `COMBO x${world.combo}`, '#ff9d5c');
  world.events.push('serve');
  return true;
}

// The one interaction: what E (or a click) does at the station the chef
// stands nearest. Returns true when something happened.
function interact(world) {
  const station = nearestStation(world);
  if (station === null) return false;
  const chef = world.chef;

  if (station === 'bin') {
    if (chef.carry.length === 0) return false;
    chef.carry.pop();
    world.stats.binned += 1;
    world.events.push('bin');
    return true;
  }

  if (station === 'window') {
    for (let i = 0; i < world.plates.length; i += 1) {
      if (servePlate(world, i)) return true;
    }
    world.events.push('error');
    return false;
  }

  if (station === 'board') {
    const board = world.board;
    if (board.item !== null && board.item.state === 'chopped') {
      if (chef.carry.length >= MAX_CARRY) {
        world.events.push('error');
        return false;
      }
      chef.carry.push(board.item);
      board.item = null;
      board.progress = 0;
      world.events.push('pickup');
      return true;
    }
    if (board.item === null) {
      const at = chef.carry.findIndex(
        (item) => item.state === 'raw' && INGREDIENTS[item.id].canChop,
      );
      if (at === -1) {
        world.events.push('error');
        return false;
      }
      board.item = chef.carry.splice(at, 1)[0];
      board.progress = 0;
      world.events.push('place');
      return true;
    }
    return false; // mid-chop: hold E instead of tapping it
  }

  if (station === 'stove') {
    for (let i = 0; i < world.burners.length; i += 1) {
      const burner = world.burners[i];
      if (burner.item !== null && (burner.done || burner.item.state === 'burnt')) {
        if (chef.carry.length >= MAX_CARRY) {
          world.events.push('error');
          return false;
        }
        chef.carry.push(burner.item);
        burner.item = null;
        burner.progress = 0;
        burner.done = false;
        burner.burnTimer = 0;
        world.events.push('pickup');
        return true;
      }
    }
    const at = chef.carry.findIndex(
      (item) => item.state === 'raw' && INGREDIENTS[item.id].canCook,
    );
    if (at === -1) {
      world.events.push('error');
      return false;
    }
    const free = world.burners.find((b) => b.item === null);
    if (!free) {
      world.events.push('error');
      return false;
    }
    free.item = chef.carry.splice(at, 1)[0];
    free.progress = 0;
    free.done = false;
    free.burnTimer = 0;
    world.events.push('place');
    return true;
  }

  if (station === 'plates') {
    if (chef.carry.length === 0) {
      world.events.push('error');
      return false;
    }
    const item = chef.carry[chef.carry.length - 1];
    if (item.state === 'burnt') {
      world.events.push('error');
      return false;
    }
    // Plate onto the counter that already holds this dish's food when there
    // is one (and the item keeps that plate on a real recipe), else an
    // empty plate, else any plate with room.
    const plate =
      world.plates.find(
        (p) => p.length > 0 && p.length < 4 && plateStillPossible([...p, item]),
      ) ??
      world.plates.find((p) => p.length === 0) ??
      world.plates.find((p) => p.length < 4);
    if (!plate) {
      world.events.push('error');
      return false;
    }
    plate.push(chef.carry.pop());
    world.events.push('place');
    return true;
  }

  return false; // pantry: take with a number key or a click on the crate
}

// Take the last item back off a plate (Q) or off the chopping board.
// plateIndex names one plate; without it, the last non-empty plate.
function takeBack(world, plateIndex = null) {
  const station = nearestStation(world);
  if (station === null) return false;
  const chef = world.chef;
  if (chef.carry.length >= MAX_CARRY) {
    world.events.push('error');
    return false;
  }
  if (station === 'plates') {
    if (plateIndex !== null) {
      const plate = world.plates[plateIndex];
      if (plate && plate.length > 0) {
        chef.carry.push(plate.pop());
        world.events.push('pickup');
        return true;
      }
      return false;
    }
    for (let i = world.plates.length - 1; i >= 0; i -= 1) {
      if (world.plates[i].length > 0) {
        chef.carry.push(world.plates[i].pop());
        world.events.push('pickup');
        return true;
      }
    }
    return false;
  }
  if (station === 'board' && world.board.item !== null) {
    chef.carry.push(world.board.item);
    world.board.item = null;
    world.board.progress = 0;
    world.events.push('pickup');
    return true;
  }
  return false;
}

// Take one raw ingredient from the pantry (number key or crate click).
export function takeFromPantry(world, ingredientId) {
  if (nearestStation(world) !== 'pantry') return false;
  if (!INGREDIENTS[ingredientId]) return false;
  if (world.chef.carry.length >= MAX_CARRY) {
    world.events.push('error');
    return false;
  }
  world.chef.carry.push({ id: ingredientId, state: 'raw' });
  world.stats.picked += 1;
  world.events.push('pickup');
  return true;
}

function stepCooking(world, dt) {
  // Chopping: hold E at the board and the knife works.
  const board = world.board;
  if (board.item !== null && board.item.state === 'raw' && world.holdingInteract) {
    if (nearestStation(world) === 'board') {
      board.progress += dt / CHOP_SECONDS;
      if (board.progress >= 1) {
        board.item.state = 'chopped';
        board.progress = 0;
        world.stats.chopped += 1;
        world.events.push('chop');
      }
    }
  }
  // Stove: food cooks on its own; left too long after done, it burns.
  for (const burner of world.burners) {
    if (burner.item === null || burner.item.state === 'burnt') continue;
    if (!burner.done) {
      burner.progress += dt / COOK_SECONDS[burner.item.id];
      if (burner.progress >= 1) {
        burner.done = true;
        burner.item.state = 'cooked';
        burner.burnTimer = 0;
        world.stats.cooked += 1;
        world.events.push('ding');
      }
    } else {
      burner.burnTimer += dt;
      if (burner.burnTimer >= BURN_AFTER_DONE_SECONDS) {
        burner.item.state = 'burnt';
        burner.done = false;
        world.stats.burnt += 1;
        world.events.push('burn');
        floater(world, BURNERS[world.burners.indexOf(burner)].x, BURNERS[world.burners.indexOf(burner)].y - 48, 'BURNT!', '#ff6b5e');
      }
    }
  }
}

function stepOrders(world, dt) {
  world.nextOrderIn -= dt;
  if (world.nextOrderIn <= 0 && world.orders.length < MAX_ORDERS) {
    spawnOrder(world);
    const gap = Math.max(
      ORDER.spawnMin,
      ORDER.spawnStart - ORDER.spawnStep * world.served,
    );
    world.nextOrderIn = gap;
  }
  for (let i = world.orders.length - 1; i >= 0; i -= 1) {
    const order = world.orders[i];
    order.patience -= dt;
    if (order.patience <= 0) {
      world.orders.splice(i, 1);
      world.lost += 1;
      world.hearts -= 1;
      world.combo = 0;
      world.comboTimer = 0;
      world.events.push('expire');
      floater(world, CANVAS.width / 2, 120, 'ORDER WALKED OUT', '#ff6b5e');
      if (world.hearts <= 0) {
        endShift(world);
        return;
      }
    }
  }
}

// input: { mx, my, interact, interactHeld, pantryKey, takeBack }
// interact is an edge (just pressed), interactHeld stays true while held.
export function step(world, dt, input) {
  if (world.phase !== 'play') return;
  world.holdingInteract = Boolean(input.interactHeld);
  world.time += dt;
  world.timeLeft -= dt;
  if (world.comboTimer > 0) world.comboTimer -= dt;

  // Move the chef, sliding along counters instead of sticking to them.
  const chef = world.chef;
  const nx = chef.x + input.mx * CHEF_SPEED * dt;
  if (!collides(world, nx, chef.y)) chef.x = nx;
  const ny = chef.y + input.my * CHEF_SPEED * dt;
  if (!collides(world, chef.x, ny)) chef.y = ny;
  if (input.mx !== 0 || input.my !== 0) {
    chef.dir = Math.atan2(input.my, input.mx);
  }

  if (input.pantryKey) takeFromPantry(world, input.pantryKey);
  if (input.interact) interact(world);
  // takeBack is true (Q key: last non-empty plate) or a plate index (0 counts).
  if (input.takeBack !== undefined && input.takeBack !== false && input.takeBack !== null) {
    takeBack(world, typeof input.takeBack === 'number' ? input.takeBack : null);
  }

  stepCooking(world, dt);
  stepOrders(world, dt);

  for (let i = world.floaters.length - 1; i >= 0; i -= 1) {
    world.floaters[i].ttl -= dt;
    world.floaters[i].y -= 22 * dt;
    if (world.floaters[i].ttl <= 0) world.floaters.splice(i, 1);
  }

  if (world.timeLeft <= 0) {
    world.timeLeft = 0;
    endShift(world);
  }
}

// Drain the event queue (the renderer turns them into sounds).
export function drainEvents(world) {
  const out = world.events;
  world.events = [];
  return out;
}

export { itemKey };
