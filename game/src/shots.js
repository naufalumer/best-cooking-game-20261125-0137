// Dapur Sore — staged scenes for the screenshots.
// One file, one job: play the real rules forward from a fresh world, steered
// by a simple planner, so each screenshot is a frame a real shift actually
// reaches — never a posed mock-up. The same seed always gives the same frame.
import { BOARD_SPOT, BURNERS, PLATE_SPOTS, STATIONS } from './config.js';
import { DISHES, dishMatchingPlate } from './recipes.js';
import { createWorld, startShift, step, stationFront } from './world.js';

const STEP = 1 / 60;

// A task the pilot works through, one at a time.
function gotoTask(x, y) {
  return { kind: 'goto', x, y };
}

// Build the next job for a ticket: fetch, prepare and plate every missing
// item, then serve. One job at a time; the pilot re-plans after each.
// Phased like a real cook: start everything that cooks first, chop and plate
// while it cooks, then collect the cooked food and serve.
// When canServe is false (staging a busy frame), a finished plate is left
// waiting and the pilot starts the next ticket instead of serving.
function planJob(world, canServe = true) {
  if (world.orders.length === 0) return null;
  let order = world.orders[0];
  if (!canServe) {
    order =
      world.orders.find(
        (o) => !world.plates.some((p) => dishMatchingPlate(p) === o.dish),
      ) ?? null;
    if (order === null) return null; // every ticket has a finished plate
  }
  const dish = DISHES[order.dish];
  // The plate whose food is already part of this dish (most items first),
  // else an empty plate. A plate holding another dish's food can never
  // complete, so it gets cleared first.
  let plateIndex = -1;
  let best = -1;
  world.plates.forEach((plate, i) => {
    const subset = plate.every((item) => dish.needs.includes(`${item.id}:${item.state}`));
    if (!subset) return;
    const score = plate.length === 0 ? 0.5 : plate.length;
    if (score > best) {
      best = score;
      plateIndex = i;
    }
  });
  if (plateIndex === -1) {
    let worst = -1;
    let worstForeign = -1;
    world.plates.forEach((plate, i) => {
      const foreign = plate.filter(
        (item) => !dish.needs.includes(`${item.id}:${item.state}`),
      ).length;
      if (foreign > worstForeign) {
        worstForeign = foreign;
        worst = i;
      }
    });
    if (worstForeign > 0) return [{ kind: 'clearPlate', plateIndex: worst }];
    return null;
  }
  const plate = world.plates[plateIndex];
  if (dishMatchingPlate(plate) === order.dish) {
    if (!canServe) return null; // leave the finished plate waiting
    return [{ kind: 'serve' }];
  }
  // A stale item in hand (a ticket expired mid-plan) goes in the bin first.
  const stale = world.chef.carry.find(
    (item) => !dish.needs.includes(`${item.id}:${item.state}`),
  );
  if (stale) return [{ kind: 'bin' }];
  const onPlate = new Set(plate.map((item) => `${item.id}:${item.state}`));
  const missing = dish.needs.filter((need) => !onPlate.has(need));
  if (missing.length === 0) return canServe ? [{ kind: 'serve' }] : null;
  const tasks = [];
  const byState = (state) => missing.filter((need) => need.endsWith(`:${state}`));
  // Phase 1: everything that cooks goes on the stove first.
  for (const need of byState('cooked')) {
    const [id] = need.split(':');
    tasks.push({ kind: 'take', id }, { kind: 'cook', id });
  }
  // Phase 2: chop and plate while the stove works.
  for (const need of byState('chopped')) {
    const [id] = need.split(':');
    tasks.push({ kind: 'take', id }, { kind: 'chop', id }, { kind: 'pickupBoard' }, { kind: 'plate', plateIndex });
  }
  // Phase 3: plate the raw items.
  for (const need of byState('raw')) {
    const [id] = need.split(':');
    tasks.push({ kind: 'take', id }, { kind: 'plate', plateIndex });
  }
  // Phase 4: collect the cooked food and plate it, then serve — unless the
  // frame is being staged, in which case the finished plate waits.
  for (const need of byState('cooked')) {
    const [id] = need.split(':');
    tasks.push({ kind: 'pickupBurner', id }, { kind: 'plate', plateIndex });
  }
  if (canServe) tasks.push({ kind: 'serve' });
  return tasks;
}

function freeBurner(world) {
  return world.burners.findIndex((b) => b.item === null);
}

function burnerWith(world, id) {
  return world.burners.findIndex(
    (b) => b.item !== null && b.item.id === id && (b.done || b.item.state === 'burnt'),
  );
}

function anyDoneBurner(world) {
  return world.burners.findIndex(
    (b) => b.item !== null && (b.done || b.item.state === 'burnt'),
  );
}

// Drive one simulation step toward the current task. Returns the task list
// (possibly re-planned) so the caller can keep it.
function pilotStep(world, tasks) {
  const input = { mx: 0, my: 0, interact: false, interactHeld: false, pantryKey: null, takeBack: false };
  if (tasks.length === 0) return input;
  const task = tasks[0];
  const chef = world.chef;

  function steerTo(x, y) {
    const dx = x - chef.x;
    const dy = y - chef.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 18) return true;
    input.mx = dx / dist;
    input.my = dy / dist;
    return false;
  }

  switch (task.kind) {
    case 'goto': {
      if (steerTo(task.x, task.y)) tasks.shift();
      break;
    }
    case 'take': {
      const front = stationFront('pantry');
      if (steerTo(front.x, front.y)) {
        input.pantryKey = task.id;
        tasks.shift();
      }
      break;
    }
    case 'chop': {
      // Place the raw item on the board, then hold E until it is chopped.
      const board = world.board;
      if (board.item === null) {
        const front = stationFront('board');
        if (steerTo(front.x, front.y)) input.interact = true;
      } else if (board.item.state === 'chopped') {
        tasks.shift();
      } else {
        const front = stationFront('board');
        if (steerTo(front.x, front.y)) input.interactHeld = true;
      }
      break;
    }
    case 'pickupBoard': {
      const front = stationFront('board');
      if (steerTo(front.x, front.y)) {
        input.interact = true;
        tasks.shift();
      }
      break;
    }
    case 'cook': {
      // Already cooked and in hand (rescued by the reflex below)? Done.
      if (world.chef.carry.some((i) => i.id === task.id && i.state === 'cooked')) {
        tasks.shift();
        break;
      }
      // One burner at a time keeps the pilot deadlock-free: if a finished
      // item sits on a burner, collect it (and bin it when it is not ours)
      // before starting the next one.
      const doneAt = anyDoneBurner(world);
      if (doneAt !== -1) {
        const doneItem = world.burners[doneAt].item;
        // Collect the finished item first; bin it when it is not ours.
        const extra = [{ kind: 'pickupBurner', id: doneItem.id }];
        if (doneItem.id !== task.id) extra.push({ kind: 'bin' });
        tasks.splice(0, 0, ...extra);
        break;
      }
      const burner = world.burners.find((b) => b.item !== null && b.item.id === task.id && !b.done);
      if (burner) {
        tasks.shift(); // it is on; wait for it in pickupBurner
        break;
      }
      if (freeBurner(world) === -1) {
        // Both burners busy with food still cooking: wait a beat.
        break;
      }
      const front = stationFront('stove');
      if (steerTo(front.x, front.y)) input.interact = true;
      break;
    }
    case 'pickupBurner': {
      // Already rescued and in hand? Nothing to collect.
      if (
        world.chef.carry.some(
          (i) => i.id === task.id && (i.state === 'cooked' || i.state === 'burnt'),
        )
      ) {
        tasks.shift();
        break;
      }
      const at = burnerWith(world, task.id);
      if (at === -1) {
        // Nowhere to collect from: no burner is cooking it either (it was
        // plated or binned already) — give up instead of waiting forever.
        const cooking = world.burners.some(
          (b) => b.item !== null && b.item.id === task.id && !b.done,
        );
        if (!cooking) tasks.shift();
        break;
      }
      const front = stationFront('stove');
      if (steerTo(front.x, front.y)) {
        input.interact = true;
        tasks.shift();
      }
      break;
    }
    case 'plate': {
      const spot = PLATE_SPOTS[task.plateIndex];
      const front = stationFront('plates');
      if (steerTo(front.x, front.y)) {
        input.interact = true;
        tasks.shift();
      }
      break;
    }
    case 'clearPlate': {
      const plate = world.plates[task.plateIndex];
      if (!plate || plate.length === 0) {
        tasks.shift();
        break;
      }
      if (world.chef.carry.length > 0) {
        tasks.splice(0, 0, { kind: 'bin' });
        break;
      }
      const front = stationFront('plates');
      if (steerTo(front.x, front.y)) input.takeBack = task.plateIndex;
      break;
    }
    case 'bin': {
      const front = stationFront('bin');
      if (steerTo(front.x, front.y)) {
        input.interact = true;
        tasks.shift();
      }
      break;
    }
    case 'serve': {
      const front = stationFront('window');
      if (steerTo(front.x, front.y)) {
        input.interact = true;
        tasks.shift();
      }
      break;
    }
    default:
      tasks.shift();
      break;
  }
  return input;
}

// Exported for the Node playtest harness (and for debugging the pilot).
export { planJob, pilotStep, runPilot };
// canServe false leaves finished plates waiting, so the frame stays busy.
function runPilot(world, stop, capSeconds, canServe = true) {
  let tasks = [];
  let guard = 0;
  const maxSteps = Math.floor(capSeconds / STEP);
  for (let i = 0; i < maxSteps; i += 1) {
    if (world.phase !== 'play') break;
    if (stop(world)) break;
    if (tasks.length === 0) {
      const planned = planJob(world, canServe) ?? [];
      if (planned.length > 0) {
        tasks = planned;
        guard = 0; // a real job resets the stuck counter
      } else {
        // No job right now (no tickets yet, or every ticket has a finished
        // plate waiting): idle until one appears. The counter only grows
        // across one unbroken idle stretch, never across a whole shift.
        guard += 1;
        if (guard > 1200) break;
      }
    }
    // Reflex: a finished item on a burner gets rescued before it burns,
    // whatever the pilot was doing — unless it is already on its way to
    // collect one or to serve. Only when a hand is free, so the rescue never
    // fills the chef's carry and strands the next item, and never while the
    // chef is about to plate or bin: the rescue would land on top of the
    // carry and the wrong item would go on the plate or in the bin.
    if (
      tasks.length > 0 &&
      world.chef.carry.length <= 1 &&
      (tasks[0].kind === 'take' || tasks[0].kind === 'chop' || tasks[0].kind === 'cook' || tasks[0].kind === 'goto')
    ) {
      const doneAt = world.burners.findIndex(
        (b) => b.item !== null && (b.done || b.item.state === 'burnt'),
      );
      if (doneAt !== -1) {
        tasks.unshift({ kind: 'pickupBurner', id: world.burners[doneAt].item.id });
      }
    }
    const input = pilotStep(world, tasks);
    step(world, STEP, input);
  }
  return world;
}

function plateHasItems(world, n) {
  return world.plates.some((p) => p.length >= n);
}

function burnerCooking(world) {
  return world.burners.some((b) => b.item !== null && !b.done);
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * start: the title screen over a fresh kitchen with two tickets waiting.
 * service: mid-service — tickets up, a dish mid-assembly, food on the stove.
 * rush: late shift — four tickets, both burners going, a plate half-built.
 * end: the results screen after a full shift played by the pilot.
 */
export function stageShot(name, world, seed = 1) {
  const fresh = createWorld(seed);
  Object.assign(world, fresh);
  startShift(world);
  if (name === 'start') {
    runPilot(world, () => world.orders.length >= 2, 30);
    world.phase = 'title';
    return world;
  }
  if (name === 'service') {
    // A busy frame, not a served one: dishes wait on the plates. Stop early,
    // before the first ticket's patience runs out.
    runPilot(
      world,
      (w) => w.orders.length >= 2 && plateHasItems(w, 2) && burnerCooking(w),
      60,
      false,
    );
    return world;
  }
  if (name === 'rush') {
    runPilot(
      world,
      (w) => w.orders.length >= 3 && plateHasItems(w, 3) && burnerCooking(w),
      75,
      false,
    );
    return world;
  }
  // end: play the whole shift out.
  runPilot(world, () => world.phase !== 'play', 200);
  return world;
}
