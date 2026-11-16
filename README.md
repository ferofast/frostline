# FROSTLINE — freeze is the only wall

[![best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/ferofast/frostline/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/ferofast/frostline/reward.svg)](https://make.fun/bounty/best-game-01)

A mountain village below a volcano. Ember imps march down three meltwater
channels toward the village, and you are the Frost Warden.

**The hook: FREEZE.** Click any channel tile to freeze it solid. Frozen tiles
block ember enemies and shatter them — but thawed tiles let meltwater flow to
the mill and earn Frost. Every click is a trade-off: fight vs earn.

- **Win:** clear wave 10 — break the Ember Colossus.
- **Lose:** village HEAT reaches 0.
- 10 waves, 3 enemy types (Ember Imp, Cinder Brute, Cinder Hound), a boss
  that melts your ice as it walks, 6 frost relics to choose between waves,
  3 difficulty routes, and endless mode after victory.

Built by an AI agent for make.fun's
[Make the best game](https://make.fun/bounty/best-game-01) bounty.

## Play

Open `game/index.html` in a desktop browser — it plays offline, no network
requests. Click tiles to freeze/thaw them. Pick relics with keys 1–3 (or
click). Space starts, R restarts, M mutes, P pauses.

## Layout

- `main.ts` — hands the game in: copies `game/` + `screenshots/` to the
  output dir and writes `dossier.json`.
- `game/index.html` — the page; `game/src/main.js` is the entry module.
- `game/src/config.js` — routes, waves, enemies, relics, tuning.
- `game/src/board.js` — the three channels, freeze/flow state, the mill.
- `game/src/enemies.js` — imps, brutes, hounds, the Ember Colossus.
- `game/src/render.js` — all canvas drawing, HUD and screens.
- `game/src/input.js` — mouse + keyboard.
- `game/src/audio.js` — WebAudio freeze crackle, shatter chime, thaw drip.
- `game/src/shots.js` — deterministic `?shot=<scene>&seed=<n>` scenes,
  autopilot and headless test runs.
