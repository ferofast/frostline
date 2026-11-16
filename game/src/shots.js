// FROSTLINE shots — one job: deterministic scenes + autopilot + headless tests.
// ?shot=<scene>&seed=<n> stages a fixed moment, simulates it with a fixed
// timestep, renders once and sets window.__shotReady. ?test=<win|lose|restart>
// plays the whole game synchronously (no rAF) and reports into the document.

import { mulberry32, pickN, RELICS, TILE_ROWS } from './config.js';
import { tileAt } from './board.js';
import { spawnEnemy } from './enemies.js';
import { drawGame } from './render.js';

const DT = 1 / 60;

// Greedy autopilot: freeze the tile ahead of every marching enemy, and the
// tile under any enemy that is already on a frozen tile's doorstep. It plays
// the way a careful human would: ice ahead of the march, never under it.
export function autopilot(G) {
  if (G.screen !== 'playing') return;
  for (const e of G.enemies) {
    if (e.dead || e.reached) continue;
    const ahead = Math.min(TILE_ROWS - 1, Math.floor(e.y) + 1);
    const tile = tileAt(G.board, e.channel, ahead);
    if (tile && !tile.frozen && G.frost >= 1) {
      tile.frozen = true;
      G.frost -= 1;
      G.stats.frostSpent += 1;
      G.stats.freezesCast += 1;
    }
    // The boss camps at the gate: keep its tile frozen at all costs.
    if (e.kind === 'colossus') {
      const gate = tileAt(G.board, e.channel, TILE_ROWS - 1);
      if (gate && !gate.frozen && G.frost >= 1) {
        gate.frozen = true;
        G.frost -= 1;
        G.stats.frostSpent += 1;
        G.stats.freezesCast += 1;
      }
    }
  }
}

function simulate(G, ctx, seconds, withPilot) {
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) {
    if (withPilot) autopilot(G);
    if (G.screen === 'relic') G.pickRelic(0);
    G.step(DT);
    if (G.screen === 'victory' || G.screen === 'gameover') break;
  }
  drawGame(ctx, G, G.time);
}

function markReady(G, info) {
  if (typeof window !== 'undefined') {
    window.__shotReady = true;
    // Report ONLY via document.title — never append visible DOM: a stray
    // div would be photographed into the screenshots.
    if (info) document.title = info;
  }
}

// Full-game headless test. Returns a result object; also writes it to the DOM.
export function runTest(G, kind) {
  G.shotMode = true;
  G.rng = mulberry32(99);
  G.startRun();
  let steps = 0;
  const maxSteps = 60 * 60 * 12; // 12 simulated minutes, plenty
  while (steps < maxSteps && G.screen !== 'victory' && G.screen !== 'gameover') {
    if (kind === 'win') autopilot(G);
    if (G.screen === 'relic') G.pickRelic(0);
    G.step(DT);
    steps++;
  }
  const res = {
    test: kind,
    result: G.screen,
    wave: G.wave,
    score: G.score,
    heat: G.heat,
    frost: +G.frost.toFixed(1),
    steps,
    simSeconds: +(steps * DT).toFixed(1),
    impsShattered: G.stats.impsShattered,
    freezesCast: G.stats.freezesCast,
  };
  const line = 'TEST ' + kind.toUpperCase() + ': ' + JSON.stringify(res);
  markReady(G, line);
  return res;
}

export function runShot(G, ctx, shot, test, seed) {
  G.shotMode = true;
  G.rng = mulberry32(seed || 7);
  if (test) {
    if (test === 'restart') {
      const win = runTest(G, 'win');
      const before = { screen: G.screen, wave: G.wave, score: G.score };
      G.restart();
      const ok = G.screen === 'playing' && G.wave === 1 && G.score === 0 && G.heat === 10;
      markReady(G, 'TEST RESTART: ' + JSON.stringify({ ok, before, after: { screen: G.screen, wave: G.wave, score: G.score, heat: G.heat } }));
      return Promise.resolve(G);
    }
    runTest(G, test);
    return Promise.resolve(G);
  }

  if (shot === 'start') {
    // Title over a live board: water flowing, a few imps wandering, some ice.
    G.toTitle();
    tileAt(G.board, 0, 3).frozen = true;
    tileAt(G.board, 1, 5).frozen = true;
    tileAt(G.board, 2, 2).frozen = true;
    simulate(G, ctx, 1.5, false);
    markReady(G, 'SHOT start ready');
  } else if (shot === 'play') {
    // Mid-game wave 6, dense: frozen channels, embers mid-march, a brute
    // shattering, meltwater streams, village below, full HUD.
    G.startRun();
    simulate(G, ctx, 1, true); // wave 1 starts
    // Fast-forward through waves 1–5 with the autopilot, then play wave 6.
    let guard = 0;
    while (G.wave < 6 && guard < 60 * 60 * 6) {
      autopilot(G);
      if (G.screen === 'relic') G.pickRelic(0);
      G.step(DT);
      guard++;
      if (G.screen === 'victory' || G.screen === 'gameover') break;
    }
    // Wave 6 in full swing: let the fight develop for a few seconds.
    simulate(G, ctx, 5, true);
    // Stage a dense frame: a burst of embers mid-march, ice everywhere,
    // a brute about to shatter on a frozen tile. (Placed, not simulated —
    // the natural spawn pace leaves the frame empty.)
    const burst = [
      ['imp', 0, 1.5], ['imp', 0, 3.5], ['imp', 1, 2.5], ['imp', 1, 4.5],
      ['imp', 2, 1.5], ['imp', 2, 3.0], ['imp', 2, 5.0], ['hound', 1, 5.5],
      ['brute', 0, 5.0], ['brute', 2, 4.0],
    ];
    for (const [kind, ch, y] of burst) {
      const e = spawnEnemy(G, kind, ch);
      e.y = y;
    }
    const ice = [[0, 2], [0, 4], [1, 1], [1, 3], [1, 5], [2, 2], [2, 4], [2, 6], [0, 6]];
    for (const [c, r] of ice) {
      const t = tileAt(G.board, c, r);
      if (t) { t.frozen = true; t.melt = 1.5; }
    }
    // A brute at 1 hp on ice, about to shatter — the money moment.
    const brute = G.enemies.find((e) => e.kind === 'brute');
    if (brute) {
      brute.hp = 1;
      const t = tileAt(G.board, brute.channel, Math.max(0, Math.floor(brute.y)));
      if (t) t.frozen = true;
    }
    G.floaters.push({ x: 640, y: 300, text: 'SHATTER! +25', color: '#bfe9ff', age: 0, life: 1.4 });
    G.floaters.push({ x: 320, y: 220, text: '+10', color: '#ffd98a', age: 0.2, life: 1.2 });
    simulate(G, ctx, 0.9, true);
    markReady(G, 'SHOT play ready wave=' + G.wave);
  } else if (shot === 'relic') {
    // Between waves: wave 6 cleared, 3 relic cards, resources on show.
    G.startRun();
    G.wave = 6;
    G.frost = 8.5;
    G.heat = 8;
    G.score = 1240;
    G.stats.impsShattered = 61;
    G.stats.frostSpent = 52;
    G.stats.freezesCast = 52;
    G.relicChoices = pickN(G.rng, RELICS, 3);
    G.screen = 'relic';
    drawGame(ctx, G, 12.5);
    markReady(G, 'SHOT relic ready');
  } else if (shot === 'end') {
    // Victory: all 10 waves frozen, 6 stat boxes, relic loadout, 3 buttons.
    G.startRun();
    G.wave = 10;
    G.score = 4860;
    G.stats = { impsShattered: 87, frostSpent: 96, waterMilled: 38, freezesCast: 96, runTime: 215, wavesCleared: 10 };
    G.relics = ['deepfreeze', 'mill', 'shatterburst'];
    G.screen = 'victory';
    drawGame(ctx, G, 20);
    markReady(G, 'SHOT end ready');
  } else {
    // No scene: plain title.
    G.toTitle();
    drawGame(ctx, G, 1);
    markReady(G, 'SHOT default ready');
  }
  return Promise.resolve(G);
}
