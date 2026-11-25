// Dapur Sore — tiny synthesised sounds.
// One file, one job: turn world events into short WebAudio blips. No audio
// files, no network, and silence until the player first touches the game
// (browsers demand a gesture before sound).
let context = null;
let enabled = false;

function ensureContext() {
  if (context !== null) return context;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    context = new AudioContext();
  } catch {
    context = null;
  }
  return context;
}

function blip(freq, dur, type, gainValue, when = 0) {
  const ctx = ensureContext();
  if (ctx === null || !enabled) return;
  const t = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(gainValue, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export function unlockSound() {
  enabled = true;
  const ctx = ensureContext();
  if (ctx !== null && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

export function playEvent(name) {
  if (!enabled) return;
  switch (name) {
    case 'pickup':
      blip(520, 0.07, 'sine', 0.12);
      break;
    case 'place':
      blip(340, 0.07, 'triangle', 0.12);
      break;
    case 'chop':
      blip(180, 0.09, 'square', 0.1);
      blip(140, 0.09, 'square', 0.08, 0.05);
      break;
    case 'ding':
      blip(880, 0.18, 'sine', 0.14);
      blip(1320, 0.22, 'sine', 0.1, 0.09);
      break;
    case 'serve':
      blip(660, 0.1, 'triangle', 0.14);
      blip(880, 0.1, 'triangle', 0.14, 0.08);
      blip(1100, 0.16, 'triangle', 0.14, 0.16);
      break;
    case 'ticket':
      blip(440, 0.08, 'sine', 0.08);
      break;
    case 'burn':
    case 'expire':
      blip(160, 0.3, 'sawtooth', 0.12);
      break;
    case 'bin':
      blip(220, 0.08, 'square', 0.07);
      break;
    case 'error':
      blip(110, 0.08, 'square', 0.06);
      break;
    case 'over':
      blip(523, 0.15, 'triangle', 0.12);
      blip(392, 0.15, 'triangle', 0.12, 0.14);
      blip(330, 0.3, 'triangle', 0.12, 0.28);
      break;
    default:
      break;
  }
}
