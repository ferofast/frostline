// FROSTLINE input — one job: mouse + keyboard → game actions.
// Clicks hit tiles on the board, buttons on the screens, relic cards between
// waves. Keys: 1–3 relics, Space start/continue, R restart, M mute, P pause.

import { tileAtPoint, toggleTile, tileRect } from './board.js';
import { playSfx } from './audio.js';

export function attachInput(G, canvas) {
  canvas.addEventListener('click', (ev) => {
    const rect = canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * (canvas.width / rect.width);
    const y = (ev.clientY - rect.top) * (canvas.height / rect.height);
    handleClick(G, x, y);
  });
  window.addEventListener('keydown', (ev) => {
    if (ev.repeat) return;
    handleKey(G, ev.key);
  });
}

function hitButton(G, x, y) {
  for (const b of G.uiButtons || []) {
    if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return b.id;
  }
  return null;
}

export function handleClick(G, x, y) {
  const btn = hitButton(G, x, y);
  if (btn) { doButton(G, btn); return; }
  if (G.screen !== 'playing' || G.paused) return;
  const tile = tileAtPoint(G.board, x, y);
  if (!tile) return;
  const res = toggleTile(G, tile);
  if (res === 'frozen') {
    playSfx(G, 'freeze');
    addFloater(G, tile, '❄', '#bfe9ff');
  } else if (res === 'thawed') {
    playSfx(G, 'thaw');
    addFloater(G, tile, '≋', '#8fd8ff');
  } else if (res === 'denied') {
    addFloater(G, tile, 'NO FROST!', '#ff8fa0');
  } else if (res === 'locked') {
    addFloater(G, tile, 'PERMAFROST', '#eaf7ff');
  }
}

function addFloater(G, tile, text, color) {
  const { x, y, w, h } = tileRect(tile);
  G.floaters.push({ x: x + w / 2, y: y + h / 2, text, color, age: 0, life: 0.9 });
}

export function handleKey(G, key) {
  const k = key.toLowerCase();
  if (k === 'm') { G.muted = !G.muted; return; }
  if (k === 'p' && G.screen === 'playing') { G.paused = !G.paused; return; }
  if (k === 'r') { G.restart(); return; }
  if (G.screen === 'title' && (k === ' ' || k === 'enter')) { G.startRun(); return; }
  if (G.screen === 'relic' && ['1', '2', '3'].includes(k)) {
    G.pickRelic(Number(k) - 1);
    return;
  }
  if ((G.screen === 'victory' || G.screen === 'gameover') && (k === ' ' || k === 'enter')) {
    G.restart();
  }
}

export function doButton(G, id) {
  if (id === 'start') { G.startRun(); return; }
  if (id.startsWith('route:')) { G.routeSel = id.slice(6); playSfx(G, 'click'); return; }
  if (id.startsWith('relic:')) { G.pickRelic(Number(id.slice(6))); return; }
  if (id === 'endless') { G.startEndless(); return; }
  if (id === 'again') { G.restart(); return; }
  if (id === 'routes') { G.toTitle(); return; }
}
