// FROSTLINE v4 — scripted screenshot scenes. All four shots come from ONE
// scripted run (seed 7, same relic loadout) so they stay coherent: the cover
// and the relic screen show the same run, the same wave, the same relics,
// and the victory screen carries the relic the relic screen offers.
// In shot mode time is frozen: the scene is fully built at load and the
// render loop draws it unchanged, so a screenshot is exact.

import { makeRng, RELICS } from './config.js';
import { Enemy } from './enemies.js';

const LOADOUT = ['deep', 'mill']; // relics owned in cover + relic scenes
const PICKED = 'burst'; // the relic the victory screen carries as picked

function relicById(id) { return RELICS.find((r) => r.id === id); }

function placeEnemies(game, specs, rng) {
  game.enemies = specs.map(([type, s]) => new Enemy(type, s, rng));
}

function freezeSegments(game, distances) {
  for (const s of distances) {
    const i = game.river.segmentAt(s);
    game.river.freeze(i, false);
    game.river.segments[i].meltIn = 3; // mid-freeze, visibly iced
  }
}

export function applyShot(game, scene, seed) {
  const rng = makeRng(seed);
  game.shotMode = true;
  game.frost = 14;
  game.heat = 8;
  game.score = 2840;
  game.best = 2840;
  game.wave = 6;
  game.relicsOwned = LOADOUT.map(relicById);
  game.floats = [];
  game.enemies = [];
  game.river.segments.forEach((s) => { s.frozen = false; s.meltIn = 0; s.perma = false; });

  if (scene === 'cover') {
    // Wave 6 in full flow: frozen walls mid-river, embers marching in the
    // water, a brute shattering, the Colossus looming at the headwaters.
    game.screen = 'playing';
    game.waveState = 'fighting';
    placeEnemies(game, [
      ['imp', 300], ['imp', 420], ['imp', 560], ['imp', 700], ['imp', 830],
      ['brute', 500], ['brute', 800], ['hound', 650], ['hound', 900],
      ['colossus', 120],
    ], rng);
    freezeSegments(game, [350, 480, 620, 760]);
    // Two float texts only, far apart vertically (never stacked).
    game.floats = [
      { text: 'SHATTER! +25', x: 700, y: 300, age: 0.4, life: 1.2, size: 22, color: '#ffd166' },
      { text: 'FROST +1', x: 300, y: 560, age: 0.2, life: 1.2, size: 18, color: '#bfe8ff' },
    ];
  } else if (scene === 'title') {
    // Title over a live board: the river flowing, a few imps on their way.
    game.screen = 'title';
    game.wave = 1;
    game.frost = 12;
    game.heat = 10;
    game.score = 0;
    game.relicsOwned = [];
    game.lastRuns = ['WON 2,840', 'LOST 1,120'];
    placeEnemies(game, [['imp', 260], ['imp', 480], ['imp', 700]], rng);
  } else if (scene === 'relic') {
    // Wave 6 cleared: the same run as the cover, same loadout, offering
    // the three relics not yet owned.
    game.screen = 'relic';
    game.waveState = 'between';
    game.relicChoices = ['burst', 'perma', 'surge'].map(relicById);
    placeEnemies(game, [], rng);
  } else if (scene === 'victory') {
    // Wave 10 cleared by the same run: the loadout now includes the relic
    // the relic screen offered (Shatterburst).
    game.screen = 'victory';
    game.wave = 10;
    game.waveState = 'done';
    game.score = 5210;
    game.relicsOwned = [...LOADOUT, PICKED].map(relicById);
    game.stats = { shattered: 87, frostSpent: 96, milled: 38, freezes: 96 };
    game.runTime = '3:35';
    placeEnemies(game, [], rng);
  }
  game.shotReady = true;
}
