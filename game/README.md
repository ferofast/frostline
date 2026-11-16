# FROSTLINE — freeze is the only wall

![FROSTLINE](https://img.shields.io/badge/FROSTLINE-freeze%20is%20the%20only%20wall-7cc7f0)
![Best Game](https://img.shields.io/badge/make.fun-best--game--01-blue)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

**[Play FROSTLINE](https://make.fun/bounty/best-game-01)** — a 10-wave arcade defence
where the river itself is the weapon.

## The game in one line

Ember imps march **down the river** on the village. There are no towers and
no lanes: you click a river segment to freeze it into a wall, the frozen
water shatters whatever walks into it, and the wall melts after 6 seconds.
Flowing water feeds the mill — every flowing segment earns Frost — so every
freeze is a trade: a wall now, or income for the next wall.

- **One serpentine river** from the volcano to the village. Enemies walk in
  the water, never beside it. Freeze is a temporary wall that melts.
- **3 ember types + the Colossus**: Imps (1 HP), Hounds (2 HP, split into
  two imps), Brutes (3 HP), and the Ember Colossus (24 HP) — the boss melts
  frozen tiles as it walks through them.
- **6 Frost relics** — one offered after each cleared wave: Deep Freeze,
  Glacial Mill, Shatterburst, Permafrost, Melt Surge, Rimeheart.
- **3 routes**: Ember Pass (Standard), Ashfall Ridge (Veteran, +15% Frost,
  waves 15% faster), Magma Throat (Expert, +25% score, brutes from wave 3).
- **WIN: clear wave 10. LOSE: HEAT 0.** After victory, endless mode keeps
  the waves coming.
- Best score and last runs are saved locally; no account, no download.

## How to play

- **Click a river segment** to freeze it (2 Frost) — click again to thaw it
  early and get the water flowing again.
- **1 / 2 / 3** pick a relic after a wave. **Space** starts / pauses.
- **R** new run, **C** continue endless after victory, **M** mute.

## Why it plays this way

Most defences give you towers on lanes. FROSTLINE gives you one river and
one verb — freeze — and the economy is the river itself: the water you freeze
stops paying you. The Colossus exists so the late game is not "freeze
everything": it walks through your walls, melting them, and you have to
spend Frost faster than the mill makes it.

## Tech

- Pure HTML5 Canvas + vanilla JS modules, no assets, no network calls.
- Seeded RNG (Mulberry32) — the same seed plays the same waves.
- Deterministic screenshots: `?shot=cover|title|relic|victory&seed=7`.
- Self-test: `?selftest=1` runs an autopilot through a full win in the
  browser; `?selftest=1&mode=idle` verifies the lose path and restart.
- Sound is synthesized with WebAudio — no audio files.

## License

MIT — see [LICENSE](LICENSE).
