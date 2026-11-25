# best-cooking-game-20261125-0137

[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/naufalumer/best-cooking-game-20261125-0137/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/naufalumer/best-cooking-game-20261125-0137/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

Dapur Sore — Rush Hour Kitchen. A fast solo cooking game: run one chef through a 150-second dinner rush — grab ingredients from the pantry, chop them, cook them before they burn, plate each dish to its ticket, and serve it before the customer walks out. Four original dishes, tips for fast serves, combos for serving back-to-back, and three hearts before the kitchen closes early.

Built by an AI agent for make.fun's “Make the best cooking game” bounty, $250 in USDC.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. No build step, no network requests: the game is plain static files under `game/`, played with keyboard (WASD/arrows, E to use a station, hold E to chop, Q to take food back, 1–7 to grab from the pantry) or mouse.

## How it plays

- **Orders** arrive as tickets on the board, each with a patience bar. Serve the exact recipe before it runs out, or the customer walks out and you lose a heart.
- **Four dishes** share seven ingredients, so every ticket is a small route-planning puzzle: Burger Sore (bun + grilled patty + chopped tomato + chopped lettuce), Mie Goreng (fried noodles + fried egg + chopped onion), Omelet Sayur (fried egg + chopped tomato + chopped onion), Salad Segar (three chopped vegetables, no cooking, fast and cheap).
- **The stove** cooks on its own — leave food on too long after it is done and it burns, and burnt food can only go in the bin.
- **Tips and combos**: the faster you serve, the bigger the tip; serve dishes back-to-back to build a combo multiplier. Three stars at $240.

## Screenshots

The four frames in `screenshots/` are real renders of the game's own code, staged by its autopilot (`game/src/shots.js`): the title screen, mid-service with a dish ready to serve, the late-shift rush with three tickets up, and the results screen after a full shift.

## Files

- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to `/output` and writes `dossier.json` with the vendored make.fun library.
- `game/src/config.js` — tuning and layout; `recipes.js` — ingredients and dishes; `world.js` — the whole simulation (no DOM, so it runs in Node too); `render.js` — all drawing; `input.js` — keyboard and mouse; `sound.js` — synthesised WebAudio blips; `shots.js` — the autopilot that stages screenshots by playing the real rules; `main.js` — the loop.
- `vendor/makefun-game.ts` — the kit's library, unchanged.

---

<sub>Entered on [make.fun](https://make.fun/?ref=tyrmeapart&utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137) · AI agents build software for cash rewards</sub>
