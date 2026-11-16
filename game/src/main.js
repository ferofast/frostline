// FROSTLINE main — one job: the game itself.
// State machine (title → playing → relic → victory / gameover → endless),
// wave flow, relic picks, scoring, the animation loop. All other modules
// do one job each; this one wires them together.

import { VIEW_W, VIEW_H, FROST_START, HEAT_START, ROUTES, RELICS, waveComp, mulberry32, pickN } from './config.js';
import { newBoard, millTick, boardTick, thawAll, tileAt, frozenCount } from './board.js';
import { spawnEnemy, buildQueue, updateEnemies, enemyPixelX, enemyPixelY } from './enemies.js';
import { drawGame } from './render.js';
import { attachInput } from './input.js';
import { playSfx } from './audio.js';

export function createGame() {
  const G = {
    screen: 'title',
    routeSel: 'standard',
    route: ROUTES.standard,
    wave: 0,
    endless: false,
    frost: FROST_START,
    heat: HEAT_START,
    score: 0,
    board: newBoard(),
    enemies: [],
    spawnQueue: [],
    spawnTimer: 0,
    relics: [],
    relicChoices: [],
    floaters: [],
    banner: null,
    paused: false,
    muted: false,
    shotMode: false,
    time: 0,
    rng: mulberry32(1337),
    stats: freshStats(),
    uiButtons: [],
  };

  function freshStats() {
    return { impsShattered: 0, frostSpent: 0, waterMilled: 0, freezesCast: 0, runTime: 0 };
  }
  G.freshStats = freshStats;

  G.resetRun = function (routeId) {
    G.route = ROUTES[routeId || G.routeSel];
    G.routeSel = G.route.id;
    G.wave = 0;
    G.endless = false;
    G.frost = FROST_START;
    G.heat = HEAT_START;
    G.score = 0;
    G.board = newBoard();
    G.enemies = [];
    G.spawnQueue = [];
    G.relics = [];
    G.relicChoices = [];
    G.floaters = [];
    G.banner = null;
    G.paused = false;
    G.stats = freshStats();
    G.rng = mulberry32(1337 + G.wave);
  };

  G.startRun = function () {
    G.resetRun(G.routeSel);
    G.screen = 'playing';
    G.nextWave();
    playSfx(G, 'horn');
  };

  G.toTitle = function () {
    G.resetRun(G.routeSel);
    G.screen = 'title';
    // A live board behind the title: a few imps wander down, water flows.
    for (let i = 0; i < 3; i++) {
      const e = spawnEnemy(G, 'imp', i);
      e.y = 1 + i * 2;
      e.speed = 0.3;
    }
  };

  G.restart = function () {
    G.startRun();
  };

  G.nextWave = function () {
    G.wave += 1;
    const comp = waveComp(Math.min(G.wave, 10), G.route.id);
    // Endless waves keep scaling past 10.
    if (G.endless) {
      comp.imps += (G.wave - 10) * 3;
      comp.brutes += Math.floor((G.wave - 10) / 2);
      comp.hounds += Math.floor((G.wave - 10) / 2);
    }
    G.spawnQueue = buildQueue(G, comp, G.rng);
    G.spawnTimer = 0.8;
    const label = G.wave === 10 && !G.endless
      ? 'WAVE 10 — THE EMBER COLOSSUS'
      : 'WAVE ' + G.wave + (G.endless ? ' (ENDLESS)' : ' / 10');
    G.banner = { text: label, age: 0 };
    playSfx(G, 'horn');
  };

  G.pickRelic = function (idx) {
    const rel = G.relicChoices[idx];
    if (!rel || G.screen !== 'relic') return;
    G.relics.push(rel.id);
    applyRelic(G, rel);
    playSfx(G, 'relic');
    G.relicChoices = [];
    G.screen = 'playing';
    G.nextWave();
  };

  G.startEndless = function () {
    G.endless = true;
    G.screen = 'playing';
    G.nextWave();
  };

  // One fixed simulation step. Pure logic — render is separate.
  G.step = function (dt) {
    G.time += dt;
    if (G.screen === 'title') {
      // The title board stays alive behind the panel.
      updateEnemies(G, dt);
      if (G.enemies.length < 3 && Math.random() < dt * 0.2) {
        const e = spawnEnemy(G, 'imp', Math.floor(Math.random() * 3));
        e.speed = 0.3;
      }
    }
    if (G.screen !== 'playing' || G.paused) return;
    G.stats.runTime += dt;
    if (G.banner) G.banner.age += dt;
    for (const f of G.floaters) f.age += dt;
    G.floaters = G.floaters.filter((f) => f.age < f.life);

    millTick(G, dt);
    boardTick(G, dt);

    // Spawning.
    if (G.spawnQueue.length) {
      G.spawnTimer -= dt;
      if (G.spawnTimer <= 0) {
        const kind = G.spawnQueue.shift();
        const channel = Math.floor(G.rng() * 3);
        spawnEnemy(G, kind, channel);
        G.spawnTimer = waveComp(Math.min(G.wave, 10), G.route.id).interval;
      }
    }

    // Enemies move / freeze / shatter / reach the village.
    const events = updateEnemies(G, dt);
    for (const ev of events) {
      if (ev.type === 'shatter') {
        playSfx(G, 'shatter');
        G.floaters.push({ x: enemyPixelX(ev.enemy), y: enemyPixelY(ev.enemy) - 10, text: 'SHATTER! +' + Math.round(10 * G.route.scoreMul), color: '#bfe9ff', age: 0, life: 1 });
      } else if (ev.type === 'reach') {
        playSfx(G, 'reach');
        G.floaters.push({ x: 640, y: 560, text: 'EMBER THROUGH! −' + ev.enemy.heat + ' HEAT', color: '#ff8fa0', age: 0, life: 1.2 });
      } else if (ev.type === 'split') {
        G.floaters.push({ x: enemyPixelX(ev.enemy), y: enemyPixelY(ev.enemy) - 10, text: 'HOUND SPLITS!', color: '#ffb020', age: 0, life: 1 });
      }
    }

    // Wave cleared?
    if (!G.spawnQueue.length && !G.enemies.length) {
      G.score += Math.round(100 * G.route.scoreMul);
      G.stats.wavesCleared = (G.stats.wavesCleared || 0) + 1;
      if (G.wave >= 10 && !G.endless) {
        G.screen = 'victory';
        playSfx(G, 'victory');
      } else {
        G.relicChoices = pickN(G.rng, RELICS.filter((r) => !G.relics.includes(r.id) || r.id === 'meltsurge'), 3);
        G.screen = 'relic';
      }
      return;
    }

    // Lose?
    if (G.heat <= 0) {
      G.heat = 0;
      G.screen = 'gameover';
      playSfx(G, 'defeat');
    }
  };

  return G;
}

function applyRelic(G, rel) {
  switch (rel.effect) {
    case 'permafrost': {
      // A random flowing tile freezes forever.
      const flowing = G.board.tiles.filter((t) => !t.frozen);
      if (flowing.length) {
        const t = flowing[Math.floor(G.rng() * flowing.length)];
        t.frozen = true; t.perma = true;
      }
      break;
    }
    case 'meltsurge':
      thawAll(G.board);
      G.frost = Math.min(14, G.frost + 4);
      break;
    case 'rimeheart':
      G.heat = Math.min(10, G.heat + 2);
      break;
    default:
      // deepfreeze / mill / shatterburst are passive flags read at use time.
      break;
  }
}

// Boot: wire the canvas, the loop, the input. `root` is the canvas element.
export function boot(canvas, query) {
  const ctx = canvas.getContext('2d');
  const G = createGame();
  G.canvas = canvas;
  attachInput(G, canvas);
  const params = new URLSearchParams(query || '');
  const shot = params.get('shot');
  const test = params.get('test');
  const seed = Number(params.get('seed') || 7);
  if (shot || test) {
    // Deterministic scenes and headless tests live in shots.js.
    return import('./shots.js').then((m) => m.runShot(G, ctx, shot, test, seed));
  }
  G.toTitle();
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    G.step(dt);
    drawGame(ctx, G, G.time);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return Promise.resolve(G);
}
