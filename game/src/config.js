// FROSTLINE v4 — tuning, waves, enemies, relics, routes.
// One verb: FREEZE. Enemies walk IN the river; a frozen segment is a
// temporary wall that melts. No lanes, no towers.

export const VIEW_W = 1280;
export const VIEW_H = 720;

// The river is one serpentine channel from the volcano (top) to the village
// (bottom right). Waypoints are the river's spine; the channel is cut into
// short segments between them. Enemies walk the spine, in the water.
export const RIVER_POINTS = [
  [640, 30], [640, 120], [980, 190], [1080, 300], [820, 380],
  [420, 430], [200, 520], [300, 620], [640, 660], [1020, 692],
];
export const RIVER_WIDTH = 66;
export const SEGMENT_LENGTH = 46; // px of spine per freeze segment

export const FREEZE_COST = 2; // Frost per segment (2 keeps the freeze/mill trade-off real)
export const FREEZE_SECONDS = 6; // a frozen segment melts after this long
export const FREEZE_TICK_SECONDS = 0.4; // damage tick while an enemy stands frozen
export const FLOW_FROST_PER_SEGMENT = 0.05; // Frost/sec earned per flowing segment
export const SHATTER_FROST = 1; // Frost earned when an enemy shatters
export const START_FROST = 12;
export const START_HEAT = 10;

export const ENEMIES = {
  imp: { hp: 1, speed: 58, radius: 24, score: 10, heat: 1, color: '#ff7a1a', dark: '#c24e00' },
  brute: { hp: 3, speed: 30, radius: 32, score: 25, heat: 1, color: '#ff4d2e', dark: '#8f1d0b' },
  hound: { hp: 2, speed: 42, radius: 27, score: 20, heat: 1, color: '#e63b3b', dark: '#7d1010' },
  colossus: { hp: 24, speed: 17, radius: 58, score: 200, heat: 3, color: '#3a0d0d', dark: '#120303' },
};

// Waves: [imps, brutes, hounds, colossus]. Spawned over the first seconds
// of the wave, one every SPAWN_GAP, in shuffled order (boss last).
export const WAVES = [
  { imp: 6, brute: 0, hound: 0, colossus: 0 },
  { imp: 9, brute: 0, hound: 0, colossus: 0 },
  { imp: 12, brute: 0, hound: 0, colossus: 0 },
  { imp: 10, brute: 2, hound: 0, colossus: 0 },
  { imp: 12, brute: 3, hound: 0, colossus: 0 },
  { imp: 10, brute: 3, hound: 2, colossus: 0 },
  { imp: 12, brute: 4, hound: 3, colossus: 0 },
  { imp: 14, brute: 4, hound: 4, colossus: 0 },
  { imp: 14, brute: 6, hound: 5, colossus: 0 },
  { imp: 8, brute: 4, hound: 3, colossus: 1 },
];
export const SPAWN_GAP = 0.85;
export const WAVE_CLEAR_BONUS = (wave) => 50 + 10 * wave;

// Six frost relics; pick 1 of 3 between waves. Each relic is a visible
// system change, not a number in a tooltip.
export const RELICS = [
  { id: 'deep', name: 'Deep Freeze', text: 'Frozen water deals 2x damage.', color: '#7cc7f0' },
  { id: 'mill', name: 'Glacial Mill', text: 'Flowing water earns +50% Frost.', color: '#9fe08a' },
  { id: 'burst', name: 'Shatterburst', text: 'A shatter freezes the tiles beside it, free.', color: '#ffd166' },
  { id: 'perma', name: 'Permafrost', text: 'Your first freeze each wave never melts.', color: '#c9b8ff' },
  { id: 'surge', name: 'Melt Surge', text: 'Thaw every tile now: +2 Frost per tile.', color: '#ff9d76' },
  { id: 'heart', name: 'Rimeheart', text: 'Village HEAT +2, once per run.', color: '#ff8fb3' },
];

// Routes shown on the title screen. The modifier is printed on the card.
export const ROUTES = [
  { id: 'pass', name: 'Ember Pass', level: 'STANDARD', text: 'The open river. Learn the freeze.', frost: 0, speed: 1.0, score: 1.0, bruteFrom: 4 },
  { id: 'ridge', name: 'Ashfall Ridge', level: 'VETERAN', text: '+15% Frost, waves 15% faster.', frost: 0.15, speed: 1.15, score: 1.0, bruteFrom: 4 },
  { id: 'throat', name: 'Magma Throat', level: 'EXPERT', text: '+25% score, brutes from wave 3.', frost: 0, speed: 1.0, score: 1.25, bruteFrom: 3 },
];

// Seeded RNG (mulberry32) so scripted scenes and the self-test are exact.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
