// FROSTLINE board — one job: the three meltwater channels and their state.
// A tile is either FLOWING (water runs, the mill earns Frost) or FROZEN
// (solid ice: blocks ember enemies and damages them). Freezing costs Frost;
// thawing is free. Every click is the fight-vs-earn trade-off.

import {
  CHANNELS, TILE_ROWS, CHANNEL_X, CHANNEL_W, BOARD_TOP, BOARD_BOTTOM,
  TILE_H, FREEZE_COST, FROST_MAX, MILL_BASE, MELT_S,
} from './config.js';

// Build a fresh board: every tile flowing, nothing frozen.
export function newBoard() {
  const tiles = [];
  for (let c = 0; c < CHANNELS; c++) {
    for (let r = 0; r < TILE_ROWS; r++) {
      tiles.push({ channel: c, row: r, frozen: false, perma: false, melt: 0 });
    }
  }
  return { tiles, millTick: 0 };
}

export function tileAt(board, channel, row) {
  return board.tiles[channel * TILE_ROWS + row];
}

export function tileRect(tile) {
  const x = CHANNEL_X[tile.channel] - CHANNEL_W / 2;
  const y = BOARD_TOP + tile.row * TILE_H;
  return { x, y, w: CHANNEL_W, h: TILE_H };
}

// Which tile (if any) sits under a canvas point?
export function tileAtPoint(board, px, py) {
  if (py < BOARD_TOP || py >= BOARD_BOTTOM) return null;
  for (let c = 0; c < CHANNELS; c++) {
    const x0 = CHANNEL_X[c] - CHANNEL_W / 2;
    if (px >= x0 && px < x0 + CHANNEL_W) {
      const row = Math.floor((py - BOARD_TOP) / TILE_H);
      if (row >= 0 && row < TILE_ROWS) return tileAt(board, c, row);
    }
  }
  return null;
}

// Freeze a flowing tile (costs Frost) or thaw a frozen one (free).
// Returns 'frozen' | 'thawed' | 'denied' (not enough Frost) | 'locked' (permafrost).
export function toggleTile(G, tile) {
  if (!tile) return 'none';
  if (tile.frozen) {
    if (tile.perma) return 'locked';
    tile.frozen = false;
    return 'thawed';
  }
  if (G.frost < FREEZE_COST) return 'denied';
  G.frost -= FREEZE_COST;
  G.stats.frostSpent += FREEZE_COST;
  G.stats.freezesCast += 1;
  tile.frozen = true;
  tile.melt = 0;
  return 'frozen';
}

// Ice melts on its own: a frozen tile (permafrost excepted) thaws after
// MELT_S seconds, so the Warden must keep re-freezing. tile.melt counts
// the seconds the tile has been frozen.
export function boardTick(G, dt) {
  for (const t of G.board.tiles) {
    if (!t.frozen || t.perma) continue;
    t.melt += dt;
    if (t.melt >= MELT_S) {
      t.frozen = false;
      t.melt = 0;
    }
  }
}

// The mill: once a second, flowing tiles earn Frost. Frozen tiles earn nothing.
export function millTick(G, dt) {
  const board = G.board;
  board.millTick += dt;
  if (board.millTick < 1) return;
  board.millTick -= 1;
  let flowing = 0;
  for (const t of board.tiles) if (!t.frozen) flowing++;
  const millMul = G.relics.includes('mill') ? 1.5 : 1.0;
  const gained = MILL_BASE * flowing * millMul * G.route.frostMul;
  G.frost = Math.min(FROST_MAX, G.frost + gained);
  G.stats.waterMilled += gained;
}

// Freeze every tile (used by the shatterburst relic and boss melt visuals).
export function freezeTileAt(board, channel, row) {
  const t = tileAt(board, channel, row);
  if (t && !t.frozen) { t.frozen = true; t.melt = 0; }
}

export function thawAll(board) {
  for (const t of board.tiles) {
    if (!t.perma) { t.frozen = false; t.melt = 0; }
  }
}

export function frozenCount(board) {
  let n = 0;
  for (const t of board.tiles) if (t.frozen) n++;
  return n;
}
