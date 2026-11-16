// FROSTLINE config — one job: every number the game tunes on.
// Routes, waves, enemies, relics, economy. No DOM, no drawing here.

export const VIEW_W = 1280;
export const VIEW_H = 720;

// Board geometry: 3 meltwater channels running top (volcano) to bottom (village).
export const CHANNELS = 3;
export const TILE_ROWS = 8;
export const CHANNEL_X = [320, 640, 960]; // center x of each channel
export const CHANNEL_W = 260;
export const BOARD_TOP = 96;
export const BOARD_BOTTOM = 592;
export const TILE_H = (BOARD_BOTTOM - BOARD_TOP) / TILE_ROWS;
export const VILLAGE_Y = 600;

// Economy
export const FROST_START = 6;
export const FROST_MAX = 14;
export const FREEZE_COST = 1; // frost per tile frozen
export const MILL_BASE = 0.10; // frost per second per flowing tile
export const HEAT_START = 10;

// Freeze damage: an enemy standing on a frozen tile takes this per tick.
export const FREEZE_TICK_S = 0.5;
export const FREEZE_DMG = 1;

// Ice melts: a frozen tile thaws on its own after this many seconds
// (permafrost excepted). Freezing everything forever is not a strategy —
// the Warden must keep re-freezing, and Frost must keep flowing.
export const MELT_S = 6;

// Routes (picked on the title screen — like the canyon lines of the winners).
export const ROUTES = {
  standard: {
    id: 'standard',
    name: 'Ember Pass',
    tag: 'STANDARD',
    desc: 'The classic crossing. Steady embers, steady frost.',
    frostMul: 1.0,
    speedMul: 1.0,
    scoreMul: 1.0,
    bruteFrom: 4,
  },
  veteran: {
    id: 'veteran',
    name: 'Ashfall Ridge',
    tag: 'VETERAN',
    desc: '+15% Frost from the mill. Waves run 15% faster.',
    frostMul: 1.15,
    speedMul: 1.15,
    scoreMul: 1.0,
    bruteFrom: 4,
  },
  expert: {
    id: 'expert',
    name: 'Magma Throat',
    tag: 'EXPERT',
    desc: '+25% score. Brutes march from wave 3.',
    frostMul: 1.0,
    speedMul: 1.1,
    scoreMul: 1.25,
    bruteFrom: 3,
  },
};

// Enemy kinds. hp = freeze ticks to shatter. speed = tiles per second.
export const ENEMIES = {
  imp: { name: 'Ember Imp', hp: 1, speed: 1.28, score: 10, heat: 1, color: '#ff7a2a' },
  brute: { name: 'Cinder Brute', hp: 3, speed: 0.55, score: 25, heat: 2, color: '#e5484d' },
  hound: { name: 'Cinder Hound', hp: 2, speed: 0.95, score: 15, heat: 1, color: '#ffb020' },
  colossus: { name: 'Ember Colossus', hp: 30, speed: 0.35, score: 500, heat: 3, color: '#ff2e63' },
};

// Wave composition. count = imps; brutes/hounds added by wave.
export function waveComp(wave, route) {
  const brutesFrom = ROUTES[route].bruteFrom;
  const imps = 4 + wave * 2;
  const brutes = wave >= brutesFrom ? Math.floor((wave - brutesFrom + 2) / 2) : 0;
  const hounds = wave >= 6 ? Math.floor((wave - 4) / 2) : 0;
  const boss = wave === 10;
  // Spawn interval shrinks as waves rise; veteran/expert speed it up.
  const interval = Math.max(0.55, 1.5 - wave * 0.09) / ROUTES[route].speedMul;
  return { imps, brutes, hounds, boss, interval };
}

// Relic pool — between waves the player picks 1 of 3.
export const RELICS = [
  { id: 'deepfreeze', name: 'Deep Freeze', icon: '❄', desc: 'Frozen tiles deal 2× damage.', effect: 'deepfreeze' },
  { id: 'mill', name: 'Glacial Mill', icon: '⚙', desc: 'Flowing water earns +50% Frost.', effect: 'mill' },
  { id: 'shatterburst', name: 'Shatterburst', icon: '✦', desc: 'Shattered enemies freeze tiles next to them.', effect: 'shatterburst' },
  { id: 'permafrost', name: 'Permafrost', icon: '◆', desc: 'One random tile stays frozen forever.', effect: 'permafrost' },
  { id: 'meltsurge', name: 'Melt Surge', icon: '≋', desc: 'Thaw every tile now and gain +4 Frost.', effect: 'meltsurge' },
  { id: 'rimeheart', name: 'Rimeheart', icon: '♥', desc: 'Village HEAT +2. Once per run.', effect: 'rimeheart' },
];

// Deterministic RNG (mulberry32) — shots and tests replay exactly.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickN(rng, arr, n) {
  const copy = arr.slice();
  const out = [];
  while (out.length < n && copy.length) {
    out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0]);
  }
  return out;
}
