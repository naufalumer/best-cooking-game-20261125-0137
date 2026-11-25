// Dapur Sore — everything the eye sees.
// One file, one job: draw the kitchen, the food, the chef and the HUD from
// the world's state, and nothing else. No rules, no input, no sound.
import { BOARD_SPOT, BURNERS, CANVAS, FLOOR_TOP, PLATE_SPOTS, SHIFT_SECONDS, STARS, STATIONS, PANTRY_ORDER } from './config.js';
import { INGREDIENTS, DISHES, dishMatchingPlate } from './recipes.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, colour, align = 'center', weight = '700') {
  ctx.fillStyle = colour;
  ctx.font = `${weight} ${size}px "Trebuchet MS", Verdana, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

// One ingredient, drawn at (x, y) with radius r, in its current state.
// Raw is whole, chopped is cut pieces, cooked is darker with steam,
// burnt is charcoal with a wisp of smoke.
export function drawIngredient(ctx, item, x, y, r) {
  const def = INGREDIENTS[item.id];
  const burnt = item.state === 'burnt';
  const cooked = item.state === 'cooked';
  const chopped = item.state === 'chopped';
  ctx.save();
  ctx.translate(x, y);
  if (burnt) {
    ctx.fillStyle = '#2b2b2b';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.9);
    ctx.quadraticCurveTo(0, -r * 1.5, r * 0.3, -r * 1.9);
    ctx.stroke();
    ctx.restore();
    return;
  }
  switch (def.shape) {
    case 'bun': {
      ctx.fillStyle = cooked ? '#c98f3d' : def.colour;
      ctx.beginPath();
      ctx.arc(0, r * 0.25, r, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f7e3b0';
      for (const [dx, dy] of [[-0.4, -0.35], [0, -0.55], [0.4, -0.35]]) {
        ctx.beginPath();
        ctx.ellipse(dx * r, dy * r, r * 0.12, r * 0.07, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'patty': {
      ctx.fillStyle = cooked ? '#5d3a1e' : def.colour;
      rr(ctx, -r, -r * 0.55, r * 2, r * 1.1, r * 0.5);
      ctx.fill();
      if (cooked) {
        ctx.strokeStyle = '#3d2412';
        ctx.lineWidth = 2;
        for (const dx of [-0.5, 0, 0.5]) {
          ctx.beginPath();
          ctx.moveTo(dx * r, -r * 0.4);
          ctx.lineTo(dx * r, r * 0.4);
          ctx.stroke();
        }
      }
      break;
    }
    case 'tomato': {
      ctx.fillStyle = def.colour;
      if (chopped) {
        for (const [dx, dy, rot] of [[-0.45, 0.1, 0.4], [0.4, -0.15, -0.5], [0, 0.45, 0.1]]) {
          ctx.save();
          ctx.translate(dx * r, dy * r);
          ctx.rotate(rot);
          ctx.beginPath();
          ctx.moveTo(0, -r * 0.55);
          ctx.lineTo(r * 0.45, r * 0.4);
          ctx.lineTo(-r * 0.45, r * 0.4);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff8a7a';
        ctx.beginPath();
        ctx.arc(-r * 0.3, -r * 0.3, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'lettuce': {
      ctx.fillStyle = def.colour;
      if (chopped) {
        for (const [dx, dy] of [[-0.4, 0], [0.35, -0.2], [0, 0.4]]) {
          rr(ctx, dx * r - r * 0.35, dy * r - r * 0.18, r * 0.7, r * 0.36, r * 0.18);
          ctx.fill();
        }
      } else {
        ctx.beginPath();
        for (let i = 0; i < 8; i += 1) {
          const a = (i / 8) * Math.PI * 2;
          const rad = i % 2 === 0 ? r : r * 0.72;
          const px = Math.cos(a) * rad;
          const py = Math.sin(a) * rad;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = def.dark;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case 'onion': {
      ctx.strokeStyle = def.colour;
      ctx.lineWidth = r * 0.28;
      if (chopped) {
        for (const [dx, dy] of [[-0.35, 0.1], [0.3, -0.1], [0, 0.45]]) {
          ctx.beginPath();
          ctx.arc(dx * r, dy * r, r * 0.32, 0.4, Math.PI * 1.6);
          ctx.stroke();
        }
      } else {
        for (const rad of [0.85, 0.55, 0.28]) {
          ctx.beginPath();
          ctx.arc(0, 0, r * rad, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      break;
    }
    case 'noodle': {
      ctx.strokeStyle = cooked ? '#e0a92e' : def.colour;
      ctx.lineWidth = r * 0.22;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        const y0 = (i - 1) * r * 0.5;
        ctx.moveTo(-r * 0.8, y0);
        ctx.bezierCurveTo(-r * 0.3, y0 - r * 0.45, r * 0.3, y0 + r * 0.45, r * 0.8, y0);
        ctx.stroke();
      }
      break;
    }
    case 'egg': {
      if (cooked) {
        ctx.fillStyle = '#fff8e6';
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.78, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffb52e';
        ctx.beginPath();
        ctx.arc(r * 0.1, 0, r * 0.42, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = def.colour;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.72, r, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d9c48a';
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.2, r * 0.2, r * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    default:
      break;
  }
  if (cooked && !burnt) {
    // A wisp of steam says "ready" at a glance.
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 1.1);
    ctx.quadraticCurveTo(0, -r * 1.6, r * 0.2, -r * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawProgressRing(ctx, x, y, radius, frac, colour) {
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = colour;
  ctx.beginPath();
  ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
  ctx.stroke();
}

function drawStationBase(ctx, rect, label, active) {
  ctx.fillStyle = active ? '#8a5a33' : '#6e4525';
  rr(ctx, rect.x, rect.y, rect.width, rect.height, 8);
  ctx.fill();
  // The name lives in the top band, so the counter below stays clear for food.
  ctx.fillStyle = '#a4713f';
  rr(ctx, rect.x + 3, rect.y + 3, rect.width - 6, 14, 5);
  ctx.fill();
  text(ctx, label, rect.x + rect.width / 2, rect.y + 10, 9, '#ffe9c4', 'center', '800');
}

function drawTicket(ctx, order, x, y, readyPlate) {
  const w = 148;
  const h = 76;
  const dish = DISHES[order.dish];
  const frac = Math.max(0, order.patience / order.max);
  const urgent = frac < 0.35;
  ctx.fillStyle = readyPlate ? '#fff3c4' : '#fffaf0';
  rr(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = readyPlate ? '#e8a100' : urgent ? '#e2483a' : '#d8c9a8';
  ctx.lineWidth = readyPlate ? 3 : 2;
  rr(ctx, x, y, w, h, 8);
  ctx.stroke();
  text(ctx, dish.name, x + 8, y + 13, 12, '#3a2a1a', 'left', '800');
  text(ctx, `$${dish.price}`, x + w - 8, y + 13, 12, '#8a5a33', 'right', '800');
  dish.needs.forEach((need, i) => {
    const [id, state] = need.split(':');
    drawIngredient(ctx, { id, state }, x + 18 + i * 30, y + 40, 11);
  });
  ctx.fillStyle = '#e8e0cc';
  rr(ctx, x + 8, y + h - 12, w - 16, 6, 3);
  ctx.fill();
  ctx.fillStyle = frac > 0.5 ? '#7dc24a' : frac > 0.25 ? '#f2a93b' : '#e2483a';
  rr(ctx, x + 8, y + h - 12, (w - 16) * frac, 6, 3);
  ctx.fill();
  if (readyPlate) text(ctx, 'READY!', x + w / 2, y + h - 22, 11, '#b57700', 'center', '800');
}

function drawChef(ctx, chef) {
  ctx.save();
  ctx.translate(chef.x, chef.y);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, 14, 18, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Apron body.
  ctx.fillStyle = '#f4f1e8';
  rr(ctx, -13, -6, 26, 22, 9);
  ctx.fill();
  ctx.fillStyle = '#e2483a';
  rr(ctx, -13, 8, 26, 7, 3);
  ctx.fill();
  // Head and toque.
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath();
  ctx.arc(0, -14, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-6, -22, 6, 0, Math.PI * 2);
  ctx.arc(0, -25, 7, 0, Math.PI * 2);
  ctx.arc(6, -22, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  rr(ctx, -10, -22, 20, 5, 2);
  ctx.fill();
  // Eyes look where the chef walks.
  const ex = Math.cos(chef.dir) * 3;
  const ey = Math.sin(chef.dir) * 2;
  ctx.fillStyle = '#2b2b2b';
  ctx.beginPath();
  ctx.arc(-3.5 + ex, -14 + ey, 1.6, 0, Math.PI * 2);
  ctx.arc(3.5 + ex, -14 + ey, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Carried food floats above the toque, newest on top.
  chef.carry.forEach((item, i) => {
    drawIngredient(ctx, item, chef.x - (chef.carry.length - 1) * 11 + i * 22, chef.y - 40, 10);
  });
}

function drawPlates(ctx, world) {
  const readyDish = new Set();
  for (const plate of world.plates) {
    const dish = dishMatchingPlate(plate);
    if (dish !== null) readyDish.add(dish);
  }
  world.plates.forEach((plate, i) => {
    const spot = PLATE_SPOTS[i];
    const dish = dishMatchingPlate(plate);
    ctx.fillStyle = '#f4f1e8';
    ctx.beginPath();
    ctx.ellipse(spot.x, spot.y, spot.radius, spot.radius * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = dish ? '#e8a100' : '#cfc4a8';
    ctx.lineWidth = dish ? 3 : 2;
    ctx.beginPath();
    ctx.ellipse(spot.x, spot.y, spot.radius, spot.radius * 0.8, 0, 0, Math.PI * 2);
    ctx.stroke();
    plate.forEach((item, j) => {
      const dx = (j - (plate.length - 1) / 2) * 18;
      drawIngredient(ctx, item, spot.x + dx, spot.y - 2 + (j % 2) * 5, 9);
    });
    // A ready plate wears a gold ring; the ticket says READY in words.
  });
  return readyDish;
}

export function render(ctx, world, now = 0) {
  // Floor and walls: a warm checkerboard, a rug where the chef works,
  // and a plant in each bottom corner so the floor is not a void.
  ctx.fillStyle = '#f6e7c8';
  ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
  ctx.fillStyle = '#eed9a8';
  for (let x = 0; x < CANVAS.width; x += 48) {
    for (let y = FLOOR_TOP + 8; y < CANVAS.height; y += 48) {
      if ((Math.floor(x / 48) + Math.floor(y / 48)) % 2 === 0) ctx.fillRect(x, y, 46, 46);
    }
  }
  ctx.fillStyle = '#e8b96a';
  ctx.beginPath();
  ctx.ellipse(CANVAS.width / 2, 430, 210, 110, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c98f3d';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(CANVAS.width / 2, 430, 190, 96, 0, 0, Math.PI * 2);
  ctx.stroke();
  for (const px of [48, CANVAS.width - 48]) {
    ctx.fillStyle = '#b4632e';
    rr(ctx, px - 16, 580, 32, 26, 4);
    ctx.fill();
    ctx.fillStyle = '#4f8f2a';
    ctx.beginPath();
    ctx.arc(px - 8, 572, 12, 0, Math.PI * 2);
    ctx.arc(px + 8, 570, 13, 0, Math.PI * 2);
    ctx.arc(px, 560, 12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#c98f5f';
  ctx.fillRect(0, FLOOR_TOP - 8, CANVAS.width, 8);
  ctx.fillStyle = '#a4713f';
  ctx.fillRect(0, 0, CANVAS.width, 4);

  // Order board strip. Tickets fill the strip; the stats live on the right.
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(0, 0, CANVAS.width, 88);
  world.orders.forEach((order, i) => {
    drawTicket(ctx, order, 12 + i * 156, 6, false);
  });
  if (world.orders.length === 0 && world.phase === 'play') {
    text(ctx, 'no orders — breathe...', 180, 52, 12, '#e8d5ae', 'left', '400');
  }
  // Stats on the right of the board.
  const mins = Math.floor(world.timeLeft / 60);
  const secs = Math.floor(world.timeLeft % 60);
  const timeText = `${mins}:${String(secs).padStart(2, '0')}`;
  const timeColour = world.timeLeft < 30 ? '#ff8a7a' : '#fffaf0';
  text(ctx, timeText, 940, 22, 26, timeColour, 'right', '800');
  text(ctx, 'SHIFT', 940, 44, 9, '#e8d5ae', 'right', '700');
  text(ctx, `$${world.coins}`, 860, 22, 22, '#ffd94d', 'right', '800');
  text(ctx, 'EARNED', 860, 44, 9, '#e8d5ae', 'right', '700');
  let heartX = 700;
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = i < world.hearts ? '#e2483a' : '#5a4632';
    ctx.beginPath();
    ctx.arc(heartX + 6, 62, 6, 0, Math.PI * 2);
    ctx.arc(heartX + 14, 62, 6, 0, Math.PI * 2);
    ctx.moveTo(heartX, 66);
    ctx.lineTo(heartX + 10, 76);
    ctx.lineTo(heartX + 20, 66);
    ctx.closePath();
    ctx.fill();
    heartX += 24;
  }
  if (world.combo > 1) text(ctx, `COMBO x${world.combo}`, 700, 22, 15, '#ff9d5c', 'left', '800');
  // Shift timer bar under the board.
  ctx.fillStyle = '#2b2118';
  ctx.fillRect(0, 88, CANVAS.width, 6);
  ctx.fillStyle = world.timeLeft < 30 ? '#e2483a' : '#7dc24a';
  ctx.fillRect(0, 88, CANVAS.width * (world.timeLeft / SHIFT_SECONDS), 6);

  // Stations.
  const near = world.phase === 'play' ? nearestStationName(world) : null;
  drawStationBase(ctx, STATIONS.pantry, 'PANTRY · 1-7', near === 'pantry');
  PANTRY_ORDER.forEach((id, i) => {
    const x = STATIONS.pantry.x + 14 + i * 26;
    drawIngredient(ctx, { id, state: 'raw' }, x, STATIONS.pantry.y + 33, 10);
    text(ctx, String(i + 1), x, STATIONS.pantry.y + 47, 8, '#ffe9c4', 'center', '700');
  });
  drawStationBase(ctx, STATIONS.board, 'CHOP · hold E', near === 'board');
  if (world.board.item !== null) {
    drawIngredient(ctx, world.board.item, BOARD_SPOT.x, BOARD_SPOT.y, 14);
    if (world.board.item.state === 'raw') {
      drawProgressRing(ctx, BOARD_SPOT.x, BOARD_SPOT.y, 19, world.board.progress, '#7dc24a');
    }
  } else {
    text(ctx, 'drop food, hold E', BOARD_SPOT.x, BOARD_SPOT.y, 9, '#ffe9c4', 'center', '400');
  }
  drawStationBase(ctx, STATIONS.stove, 'STOVE', near === 'stove');
  world.burners.forEach((burner, i) => {
    const spot = BURNERS[i];
    ctx.fillStyle = '#3a3a3a';
    ctx.beginPath();
    ctx.arc(spot.x, spot.y, spot.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.arc(spot.x, spot.y, spot.radius - 4, 0, Math.PI * 2);
    ctx.fill();
    if (burner.item !== null) {
      drawIngredient(ctx, burner.item, spot.x, spot.y, 11);
      if (!burner.done && burner.item.state !== 'burnt') {
        drawProgressRing(ctx, spot.x, spot.y, spot.radius + 3, burner.progress, '#f2a93b');
      } else if (burner.item.state === 'burnt') {
        // A red ring says burnt at a glance; green says ready to lift.
        ctx.strokeStyle = '#ff6b5e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(spot.x, spot.y, spot.radius + 3, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#7dc24a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(spot.x, spot.y, spot.radius + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  });
  drawStationBase(ctx, STATIONS.plates, 'PLATE · E to add', near === 'plates');
  const readyDishes = drawPlates(ctx, world);
  // Re-draw tickets with the ready glow once plates are known.
  world.orders.forEach((order, i) => {
    if (readyDishes.has(order.dish)) {
      drawTicket(ctx, order, 12 + i * 156, 6, true);
    }
  });
  drawStationBase(ctx, STATIONS.bin, 'BIN', near === 'bin');
  ctx.fillStyle = '#ffe9c4';
  ctx.beginPath();
  ctx.moveTo(STATIONS.bin.x + 22, STATIONS.bin.y + 24);
  ctx.lineTo(STATIONS.bin.x + 42, STATIONS.bin.y + 24);
  ctx.lineTo(STATIONS.bin.x + 39, STATIONS.bin.y + 42);
  ctx.lineTo(STATIONS.bin.x + 25, STATIONS.bin.y + 42);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(STATIONS.bin.x + 20, STATIONS.bin.y + 20, 24, 3);
  drawStationBase(ctx, STATIONS.window, 'SERVE · E', near === 'window');

  // Chef and floaters.
  drawChef(ctx, world.chef);
  for (const f of world.floaters) {
    ctx.globalAlpha = Math.max(0, f.ttl / 1.4);
    text(ctx, f.text, f.x, f.y, 16, f.colour, 'center', '800');
    ctx.globalAlpha = 1;
  }

  if (world.phase === 'title') drawTitle(ctx, world, now);
  if (world.phase === 'over') drawOver(ctx, world);
}

function nearestStationName(world) {
  // Same range rule as the world, kept local so render never imports it.
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
  return bestDist <= 58 ? best : null;
}

function drawTitle(ctx, world, now) {
  ctx.fillStyle = 'rgba(30,20,10,0.72)';
  ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
  text(ctx, 'DAPUR SORE', CANVAS.width / 2, 170, 64, '#ffd94d', 'center', '800');
  text(ctx, 'rush hour kitchen — one chef, one shift, no mercy', CANVAS.width / 2, 215, 17, '#fffaf0', 'center', '400');
  const lines = [
    'WASD / arrows — run around the kitchen',
    'E — pick up, place, chop (hold), serve      Q — take food back off a plate',
    '1-7 at the pantry — grab an ingredient      click a pantry crate or a station',
    'Chop it, cook it, plate it, serve it before the ticket walks out.',
    'Burnt food goes in the BIN. Fast serves earn tips — chain them for combos.',
  ];
  lines.forEach((line, i) => text(ctx, line, CANVAS.width / 2, 280 + i * 28, 15, '#ffe9c4', 'center', '400'));
  const blink = Math.floor(now * 2) % 2 === 0;
  if (blink) text(ctx, 'PRESS ENTER OR CLICK TO START THE SHIFT', CANVAS.width / 2, 470, 19, '#ffd94d', 'center', '800');
  text(ctx, '150 seconds · 3 hearts · serve them all', CANVAS.width / 2, 510, 13, '#e8d5ae', 'center', '400');
}

export function starCount(coins) {
  if (coins >= STARS.three) return 3;
  if (coins >= STARS.two) return 2;
  if (coins >= STARS.one) return 1;
  return 0;
}

function drawOver(ctx, world) {
  ctx.fillStyle = 'rgba(30,20,10,0.78)';
  ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
  const stars = starCount(world.coins);
  text(ctx, world.hearts > 0 ? 'SHIFT COMPLETE!' : 'THE KITCHEN CLOSED EARLY', CANVAS.width / 2, 150, 40, '#ffd94d', 'center', '800');
  let starLine = '';
  for (let i = 0; i < 3; i += 1) starLine += i < stars ? '★ ' : '☆ ';
  text(ctx, starLine.trim(), CANVAS.width / 2, 215, 44, '#ffd94d', 'center', '400');
  text(ctx, `Earned  $${world.coins}`, CANVAS.width / 2, 290, 26, '#fffaf0', 'center', '800');
  text(ctx, `Dishes served  ${world.served}      Walked out  ${world.lost}      Best combo  x${world.bestCombo}`, CANVAS.width / 2, 330, 16, '#ffe9c4', 'center', '400');
  text(ctx, 'PRESS R TO RUN IT BACK', CANVAS.width / 2, 400, 16, '#ffd94d', 'center', '800');
}
