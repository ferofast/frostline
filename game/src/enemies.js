// FROSTLINE enemies — one job: imps, brutes, hounds and the Ember Colossus.
// Enemies walk down a channel toward the village. A frozen tile BLOCKS them
// and damages them; a brute shatters a frozen tile after standing on it;
// a hound splits into two imps when shattered; the Colossus MELTS frozen
// tiles as it walks — the counter-play to freezing everything forever.

import { ENEMIES, TILE_ROWS, BOARD_TOP, TILE_H, FREEZE_TICK_S, FREEZE_DMG, CHANNEL_X } from './config.js';
import { tileAt, freezeTileAt } from './board.js';

let nextId = 1;

export function spawnEnemy(G, kind, channel) {
  const def = ENEMIES[kind];
  const e = {
    id: nextId++,
    kind,
    channel,
    // y in tile units, 0 = top of the board, TILE_ROWS = village line.
    y: -0.6,
    hp: def.hp,
    maxHp: def.hp,
    speed: def.speed * G.route.speedMul,
    tick: 0, // freeze-damage accumulator
    stand: 0, // seconds standing blocked on a frozen tile (brutes shatter it)
    melt: 0, // boss melt accumulator
    wobble: Math.random() * 6.28,
    dead: false,
    reached: false,
  };
  G.enemies.push(e);
  return e;
}

// Build the spawn queue for a wave: shuffled kinds, boss last.
export function buildQueue(G, comp, rng) {
  const q = [];
  for (let i = 0; i < comp.imps; i++) q.push('imp');
  for (let i = 0; i < comp.brutes; i++) q.push('brute');
  for (let i = 0; i < comp.hounds; i++) q.push('hound');
  // Shuffle (Fisher-Yates on the seeded rng) but keep the boss last.
  for (let i = q.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [q[i], q[j]] = [q[j], q[i]];
  }
  if (comp.boss) q.push('colossus');
  return q;
}

export function enemyPixelY(e) {
  return BOARD_TOP + e.y * TILE_H;
}

export function enemyPixelX(e) {
  const wob = Math.sin(e.wobble) * 14;
  return CHANNEL_X[e.channel] + wob;
}

// One simulation step. Returns events the main loop turns into feedback:
// [{type:'shatter'|'reach'|'split'|'melt'|'boss-hit', ...}]
export function updateEnemies(G, dt) {
  const events = [];
  const deep = G.relics.includes('deepfreeze') ? 2 : 1;
  for (const e of G.enemies) {
    if (e.dead || e.reached) continue;
    const row = Math.floor(e.y);
    const tile = row >= 0 && row < TILE_ROWS ? tileAt(G.board, e.channel, row) : null;
    const onFrozen = tile && tile.frozen;

    if (onFrozen) {
      // Blocked by ice: frozen tiles stop the march and burn the enemy.
      e.tick += dt;
      if (e.tick >= FREEZE_TICK_S) {
        e.tick -= FREEZE_TICK_S;
        e.hp -= FREEZE_DMG * deep;
        if (e.hp <= 0) {
          shatter(G, e, events);
          continue;
        }
      }
      // Brutes shatter the ice they stand on.
      if (e.kind === 'brute') {
        e.stand += dt;
        if (e.stand >= 2.0) {
          tile.frozen = false; tile.melt = 0;
          e.stand = 0;
          events.push({ type: 'thaw', channel: e.channel, row, by: 'brute' });
        }
      }
      // The Colossus melts frozen tiles as it walks.
      if (e.kind === 'colossus') {
        e.melt += dt;
        if (e.melt >= 1.0) {
          tile.frozen = false; tile.melt = 0;
          e.melt = 0;
          events.push({ type: 'melt', channel: e.channel, row });
        }
      }
      // Frozen: no forward movement this step.
      continue;
    }

    // Flowing tile: march on.
    e.tick = 0;
    e.stand = 0;
    e.y += e.speed * dt;
    e.wobble += dt * 3;
    if (e.y >= TILE_ROWS) {
      if (e.kind === 'colossus') {
        // The Colossus does NOT slip away: it camps at the village gate,
        // smashing the warmth out of the village until it is shattered.
        e.y = TILE_ROWS - 0.5;
        e.camp = (e.camp || 0) + dt;
        if (e.camp >= 2.0) {
          e.camp -= 2.0;
          G.heat -= 1;
          events.push({ type: 'reach', enemy: e });
        }
        return;
      }
      e.reached = true;
      G.heat -= ENEMIES[e.kind].heat;
      events.push({ type: 'reach', enemy: e });
    }
  }
  // Sweep the dead/reached out of the live list.
  G.enemies = G.enemies.filter((e) => !e.dead && !e.reached);
  return events;
}

function shatter(G, e, events) {
  e.dead = true;
  const def = ENEMIES[e.kind];
  G.score += Math.round(def.score * G.route.scoreMul);
  G.stats.impsShattered += 1;
  G.frost = Math.min(14, G.frost + 0.25);
  events.push({ type: 'shatter', enemy: e });
  if (e.kind === 'hound') {
    // A shattered hound splits into two imps at the same spot.
    for (let i = 0; i < 2; i++) {
      const imp = spawnEnemy(G, 'imp', e.channel);
      imp.y = Math.max(0, e.y);
    }
    events.push({ type: 'split', enemy: e });
  }
  if (G.relics.includes('shatterburst')) {
    // Frost bursts onto the tiles beside the shatter.
    const row = Math.max(0, Math.min(TILE_ROWS - 1, Math.floor(e.y)));
    freezeTileAt(G.board, e.channel, Math.max(0, row - 1));
    freezeTileAt(G.board, e.channel, Math.min(TILE_ROWS - 1, row + 1));
  }
}
