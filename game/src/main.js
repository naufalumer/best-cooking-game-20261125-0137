// Dapur Sore — the game loop and the page wiring.
// One file, one job: boot the canvas, run frames, translate clicks into
// world input, and stage a screenshot scene when the URL asks for one.
// The rules live in world.js, the drawing in render.js, the sound in sound.js.
import { CANVAS } from './config.js';
import { createWorld, startShift, step, drainEvents, takeFromPantry } from './world.js';
import { render } from './render.js';
import { createInput, pantryCrateAt } from './input.js';
import { stageShot } from './shots.js';
import { unlockSound, playEvent } from './sound.js';

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') ?? 1) || 1;
const shot = params.get('shot');

const canvas = document.getElementById('game');
canvas.width = CANVAS.width;
canvas.height = CANVAS.height;
const ctx = canvas.getContext('2d');

const world = createWorld(seed);
const input = createInput();
input.attach(canvas);

function handleClick(click) {
  if (click === null) return;
  unlockSound();
  if (world.phase === 'title') {
    startShift(world);
    return;
  }
  if (world.phase === 'over') return; // R restarts; clicks do nothing here
  const crate = pantryCrateAt(click.x, click.y);
  if (crate !== null) {
    takeFromPantry(world, crate);
    return;
  }
  // A click on a station counts as pressing E there.
  return { interact: true };
}

if (shot !== null) {
  // Screenshot mode: stage the scene synchronously, draw once, stop.
  stageShot(shot, world, seed);
  render(ctx, world, 1.2);
  document.title = `Dapur Sore — ${shot}`;
} else {
  let last = performance.now();
  let nowSeconds = 0;
  window.addEventListener('keydown', (event) => {
    unlockSound();
    if (event.code === 'Enter' && world.phase === 'title') startShift(world);
    if (event.code === 'KeyR' && world.phase === 'over') {
      const fresh = createWorld(seed);
      Object.assign(world, fresh);
      startShift(world);
    }
  });
  canvas.addEventListener('mousedown', () => unlockSound());
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    nowSeconds += dt;
    const polled = input.poll();
    const clickAction = handleClick(polled.click);
    if (world.phase === 'play') {
      step(world, dt, {
        mx: polled.mx,
        my: polled.my,
        interact: polled.interact || Boolean(clickAction?.interact),
        interactHeld: polled.interactHeld,
        pantryKey: polled.pantryKey,
        takeBack: polled.takeBack,
      });
      for (const event of drainEvents(world)) playEvent(event);
    }
    render(ctx, world, nowSeconds);
    requestAnimationFrame(frame);
  }
  render(ctx, world, 0);
  requestAnimationFrame(frame);
}
