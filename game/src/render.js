// FROSTLINE render — one job: everything the player sees.
// 2D canvas, 1280x720. Ice blue vs ember orange: the hook is visible in
// every pixel. The title panel sits OVER the live board; the play screen is
// dense with state; the win/lose line is printed on the play screen itself.

import {
  VIEW_W, VIEW_H, CHANNELS, TILE_ROWS, CHANNEL_X, CHANNEL_W,
  BOARD_TOP, BOARD_BOTTOM, TILE_H, VILLAGE_Y, ROUTES, RELICS, ENEMIES, waveComp, MILL_BASE,
} from './config.js';
import { tileRect, frozenCount } from './board.js';
import { enemyPixelX, enemyPixelY } from './enemies.js';

const ICE = '#8fd8ff';
const ICE_DARK = '#3f9fd8';
const WATER = '#1d6fb8';
const WATER_DARK = '#0e3a63';
const EMBER = '#ff7a2a';
const EMBER_HOT = '#ffcf3f';
const PANEL = 'rgba(8, 22, 40, 0.88)';
const PANEL_LINE = '#5fb7e8';

export function drawGame(ctx, G, t) {
  G.uiButtons = [];
  drawBackdrop(ctx, G, t);
  drawBoard(ctx, G, t);
  drawSidePanels(ctx, G, t);
  drawVillage(ctx, G, t);
  drawEnemies(ctx, G, t);
  drawFloaters(ctx, G);
  drawHUD(ctx, G);
  if (G.screen === 'title') drawTitle(ctx, G, t);
  else if (G.screen === 'relic') drawRelic(ctx, G);
  else if (G.screen === 'victory') drawVictory(ctx, G);
  else if (G.screen === 'gameover') drawGameOver(ctx, G);
  else if (G.banner && G.banner.age < 2.2) drawBanner(ctx, G);
}

function drawBackdrop(ctx, G, t) {
  // Night mountain gradient + volcano glow at the top.
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, '#1a0f2e');
  g.addColorStop(0.35, '#12294d');
  g.addColorStop(1, '#0a1626');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Volcano cone behind the channels.
  ctx.fillStyle = '#241533';
  ctx.beginPath();
  ctx.moveTo(330, BOARD_TOP - 10);
  ctx.lineTo(640, -30);
  ctx.lineTo(950, BOARD_TOP - 10);
  ctx.closePath();
  ctx.fill();
  // Lava glow, pulsing.
  const pulse = 0.55 + 0.25 * Math.sin(t * 2.2);
  const lg = ctx.createRadialGradient(640, 20, 4, 640, 20, 220);
  lg.addColorStop(0, `rgba(255, 110, 30, ${pulse})`);
  lg.addColorStop(1, 'rgba(255, 110, 30, 0)');
  ctx.fillStyle = lg;
  ctx.fillRect(380, -40, 520, 200);
  // Drifting embers in the sky.
  ctx.fillStyle = 'rgba(255, 150, 60, 0.7)';
  for (let i = 0; i < 14; i++) {
    const x = (i * 97 + t * 12) % VIEW_W;
    const y = (i * 53 + t * 26) % 200;
    ctx.fillRect(x, y, 3, 3);
  }
}

function drawBoard(ctx, G, t) {
  for (const tile of G.board.tiles) {
    const r = tileRect(tile);
    ctx.save();
    if (tile.frozen) {
      // Solid ice: bright blue, cracks, sparkle. It dims as it melts.
      const meltFrac = Math.min(1, (tile.melt || 0) / 6);
      const ig = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
      ig.addColorStop(0, '#cfeeff');
      ig.addColorStop(0.5, '#8fd8ff');
      ig.addColorStop(1, '#4aa8e0');
      ctx.globalAlpha = 1 - 0.35 * meltFrac;
      ctx.fillStyle = ig;
      ctx.fillRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
      ctx.globalAlpha = 1;
      // Melt bar: the ice thins as its time runs out.
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(r.x + 6, r.y + r.h - 7, (r.w - 12) * (1 - meltFrac), 3);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(r.x + 20, r.y + 8);
      ctx.lineTo(r.x + 70, r.y + r.h / 2);
      ctx.lineTo(r.x + 40, r.y + r.h - 8);
      ctx.moveTo(r.x + 140, r.y + 6);
      ctx.lineTo(r.x + 110, r.y + r.h - 10);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('❄', r.x + r.w - 26, r.y + 22);
      if (tile.perma) {
        ctx.fillStyle = '#eaf7ff';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('PERMA', r.x + 8, r.y + r.h - 8);
      }
    } else {
      // Flowing meltwater: dark blue with moving wave lines.
      const wg = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
      wg.addColorStop(0, WATER);
      wg.addColorStop(1, WATER_DARK);
      ctx.fillStyle = wg;
      ctx.fillRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
      ctx.strokeStyle = 'rgba(140, 210, 255, 0.55)';
      ctx.lineWidth = 2;
      const off = (t * 34 + tile.row * 17) % 40;
      ctx.beginPath();
      for (let k = -1; k < 3; k++) {
        const y = r.y + 10 + k * 18 + off * 0.3;
        ctx.moveTo(r.x + 12, y);
        ctx.quadraticCurveTo(r.x + r.w / 2, y + 7, r.x + r.w - 12, y);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(10, 30, 55, 0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
    ctx.restore();
  }
  // Channel labels at the top.
  ctx.fillStyle = '#cfe8ff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  for (let c = 0; c < CHANNELS; c++) {
    ctx.fillText('CHANNEL ' + (c + 1), CHANNEL_X[c], BOARD_TOP - 12);
  }
  ctx.textAlign = 'left';
}

function drawSidePanels(ctx, G, t) {
  const flowing = G.board.tiles.filter((x) => !x.frozen).length;
  // LEFT: what is coming, what you carry, what the water earns.
  ctx.fillStyle = 'rgba(6, 16, 30, 0.72)';
  ctx.fillRect(12, 96, 168, 496);
  ctx.strokeStyle = 'rgba(95, 183, 232, 0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(12, 96, 168, 496);
  ctx.fillStyle = '#ffd98a';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('NEXT WAVE', 24, 120);
  const nw = Math.min(G.wave + 1, 10);
  const comp = waveComp(nw, G.route.id);
  ctx.fillStyle = '#eaf7ff';
  ctx.font = '15px sans-serif';
  let ly = 146;
  ctx.fillText('● Imp  ×' + comp.imps, 24, ly); ly += 24;
  if (comp.brutes) { ctx.fillText('■ Brute  ×' + comp.brutes, 24, ly); ly += 24; }
  if (comp.hounds) { ctx.fillText('◆ Hound  ×' + comp.hounds, 24, ly); ly += 24; }
  if (comp.boss) { ctx.fillStyle = '#ff5d73'; ctx.fillText('★ COLOSSUS', 24, ly); ly += 24; }
  ctx.fillStyle = '#ffd98a';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('RELICS CARRIED', 24, ly + 18);
  ctx.fillStyle = '#cfe8ff';
  ctx.font = '14px sans-serif';
  if (!G.relics.length) {
    ctx.fillText('— none yet —', 24, ly + 42);
  } else {
    let ry = ly + 42;
    for (const id of G.relics) {
      const r = RELICS.find((x) => x.id === id);
      ctx.fillText(r.icon + ' ' + r.name, 24, ry);
      ry += 22;
    }
  }
  const millMul = G.relics.includes('mill') ? 1.5 : 1.0;
  const rate = (MILL_BASE * flowing * millMul * G.route.frostMul).toFixed(1);
  ctx.fillStyle = '#ffd98a';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('FLOW', 24, 480);
  ctx.fillStyle = '#cfe8ff';
  ctx.font = '14px sans-serif';
  ctx.fillText(flowing + ' tiles flowing', 24, 504);
  ctx.fillText('+' + rate + ' Frost / sec', 24, 526);
  ctx.fillStyle = '#9fc6e8';
  ctx.font = '13px sans-serif';
  ctx.fillText('Ice melts in 6s —', 24, 556);
  ctx.fillText('keep re-freezing!', 24, 574);
  // RIGHT: the mill + the ember field guide.
  ctx.fillStyle = 'rgba(6, 16, 30, 0.72)';
  ctx.fillRect(1100, 96, 168, 496);
  ctx.strokeStyle = 'rgba(95, 183, 232, 0.5)';
  ctx.strokeRect(1100, 96, 168, 496);
  ctx.fillStyle = '#ffd98a';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('THE MILL', 1112, 120);
  ctx.save();
  ctx.translate(1184, 158);
  ctx.rotate(t * (0.4 + flowing * 0.02));
  ctx.strokeStyle = '#8a6b3f';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, 6.29);
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * 26, Math.sin(a) * 26);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = '#cfe8ff';
  ctx.font = '14px sans-serif';
  ctx.fillText('Flowing water feeds', 1112, 204);
  ctx.fillText('the mill: +' + rate, 1112, 224);
  ctx.fillText('Frost every second.', 1112, 244);
  ctx.fillStyle = '#ffd98a';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('EMBER GUIDE', 1112, 282);
  ctx.fillStyle = '#eaf7ff';
  ctx.font = '14px sans-serif';
  const guide = [
    ['● Imp — 1 HP', 'dies on one freeze tick'],
    ['■ Brute — 3 HP', 'shatters the ice it'],
    ['', 'stands on (2s)'],
    ['◆ Hound — 2 HP', 'splits into 2 imps'],
    ['★ Colossus — 30 HP', 'melts frozen tiles'],
    ['', 'as it walks'],
  ];
  let gy = 306;
  for (const [a, b] of guide) {
    ctx.fillText(a, 1112, gy);
    gy += 20;
    if (b) { ctx.fillStyle = '#9fc6e8'; ctx.font = '12px sans-serif'; ctx.fillText(b, 1112, gy); gy += 20; ctx.font = '14px sans-serif'; ctx.fillStyle = '#eaf7ff'; }
  }
  ctx.fillStyle = '#9fc6e8';
  ctx.font = '13px sans-serif';
  ctx.fillText('Tip: freeze AHEAD of', 1112, 556);
  ctx.fillText('the march, not under it.', 1112, 574);
}

function drawVillage(ctx, G, t) {
  // The village: warm huts along the bottom, their lights dim as HEAT falls.
  const glow = 0.35 + 0.65 * (G.heat / 10);
  for (let i = 0; i < 9; i++) {
    const x = 90 + i * 130;
    const w = 84;
    const h = 34 + ((i * 7) % 14);
    ctx.fillStyle = '#2b1d12';
    ctx.fillRect(x, VILLAGE_Y + 46 - h, w, h);
    ctx.fillStyle = '#5a3a22';
    ctx.beginPath();
    ctx.moveTo(x - 6, VILLAGE_Y + 46 - h);
    ctx.lineTo(x + w / 2, VILLAGE_Y + 46 - h - 20);
    ctx.lineTo(x + w + 6, VILLAGE_Y + 46 - h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = `rgba(255, 196, 90, ${glow})`;
    ctx.fillRect(x + w / 2 - 7, VILLAGE_Y + 46 - h + 12, 14, 14);
  }
  // The village label + heat hearts.
  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#ffd98a';
  ctx.fillText('THE VILLAGE', 90, VILLAGE_Y + 84);
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i < G.heat ? '#ff5d73' : 'rgba(255,93,115,0.18)';
    ctx.fillText('♥', 240 + i * 22, VILLAGE_Y + 84);
  }
}

function drawEnemies(ctx, G, t) {
  // Enemies stay inside the board — nothing draws over the channel labels.
  ctx.save();
  ctx.beginPath();
  ctx.rect(190, BOARD_TOP, 900, BOARD_BOTTOM - BOARD_TOP);
  ctx.clip();
  for (const e of G.enemies) {
    const x = enemyPixelX(e);
    const y = enemyPixelY(e);
    const def = ENEMIES[e.kind];
    ctx.save();
    ctx.translate(x, y);
    // Ember glow under the enemy.
    const gg = ctx.createRadialGradient(0, 0, 2, 0, 0, 34);
    gg.addColorStop(0, 'rgba(255, 120, 40, 0.55)');
    gg.addColorStop(1, 'rgba(255, 120, 40, 0)');
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, 6.29);
    ctx.fill();
    if (e.kind === 'imp') {
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, 6.29);
      ctx.fill();
      ctx.fillStyle = EMBER_HOT;
      ctx.beginPath();
      ctx.moveTo(-8, -10); ctx.lineTo(0, -22); ctx.lineTo(8, -10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#1a0f08';
      ctx.fillRect(-6, -3, 4, 4);
      ctx.fillRect(3, -3, 4, 4);
    } else if (e.kind === 'brute') {
      ctx.fillStyle = '#7a1f24';
      ctx.fillRect(-20, -18, 40, 36);
      ctx.fillStyle = def.color;
      ctx.fillRect(-16, -14, 32, 28);
      ctx.fillStyle = '#ffb020';
      ctx.fillRect(-12, -8, 8, 5);
      ctx.fillRect(4, -8, 8, 5);
      ctx.fillStyle = '#d8d8d8';
      ctx.fillRect(-20, -20, 40, 5);
    } else if (e.kind === 'hound') {
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.moveTo(-16, 0); ctx.lineTo(0, -14); ctx.lineTo(16, 0); ctx.lineTo(0, 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#1a0f08';
      ctx.fillRect(-5, -4, 3, 3);
      ctx.fillRect(2, -4, 3, 3);
      ctx.fillStyle = EMBER_HOT;
      ctx.beginPath();
      ctx.moveTo(-10, -10); ctx.lineTo(-4, -20); ctx.lineTo(0, -10);
      ctx.closePath();
      ctx.fill();
    } else {
      // The Ember Colossus: huge, crowned, melt aura.
      ctx.strokeStyle = 'rgba(255, 46, 99, 0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 46 + Math.sin(t * 4) * 4, 0, 6.29);
      ctx.stroke();
      ctx.fillStyle = '#4d0d1d';
      ctx.beginPath();
      ctx.arc(0, 0, 38, 0, 6.29);
      ctx.fill();
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, 6.29);
      ctx.fill();
      ctx.fillStyle = EMBER_HOT;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 12 - 5, -28);
        ctx.lineTo(i * 12, -46);
        ctx.lineTo(i * 12 + 5, -28);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#1a0f08';
      ctx.fillRect(-12, -6, 8, 8);
      ctx.fillRect(4, -6, 8, 8);
    }
    // HP pips for armored kinds.
    if (e.maxHp > 1) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(-18, -34, 36, 6);
      ctx.fillStyle = '#ff5d73';
      ctx.fillRect(-18, -34, 36 * (e.hp / e.maxHp), 6);
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawFloaters(ctx, G) {
  ctx.textAlign = 'center';
  for (const f of G.floaters) {
    const a = Math.max(0, 1 - f.age / f.life);
    // Floaters rise but never drift over the HUD or channel labels.
    const fy = Math.max(f.y - f.age * 34, BOARD_TOP + 22);
    ctx.globalAlpha = a;
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, fy);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

function drawHUD(ctx, G) {
  // Top bar: the four numbers that prove the game, plus the goal line.
  ctx.fillStyle = 'rgba(6, 16, 30, 0.85)';
  ctx.fillRect(0, 0, VIEW_W, 64);
  ctx.fillStyle = '#8fd8ff';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('❄ FROST  ' + G.frost.toFixed(1), 24, 40);
  ctx.fillStyle = '#ff8fa0';
  ctx.fillText('♥ HEAT  ' + G.heat + '/10', 300, 40);
  ctx.fillStyle = '#ffd98a';
  ctx.fillText('WAVE  ' + Math.max(1, G.wave) + '/10', 560, 40);
  ctx.fillStyle = '#eaf7ff';
  ctx.fillText('SCORE  ' + G.score, 800, 40);
  ctx.fillStyle = '#9fc6e8';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('WIN: clear wave 10  /  LOSE: HEAT 0', 1000, 26);
  ctx.fillText('Click a tile: freeze / thaw   •   ' + frozenCount(G.board) + ' frozen', 1000, 48);
  // Boss bar on wave 10.
  const boss = G.enemies.find((e) => e.kind === 'colossus');
  if (boss) {
    ctx.fillStyle = 'rgba(6, 16, 30, 0.85)';
    ctx.fillRect(340, 68, 600, 26);
    ctx.fillStyle = '#ff2e63';
    ctx.fillRect(344, 72, 592 * (boss.hp / boss.maxHp), 18);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EMBER COLOSSUS  ' + boss.hp + '/' + boss.maxHp + '  — it melts your ice!', 640, 86);
    ctx.textAlign = 'left';
  }
  // Embers left this wave — top-left pill, clear of the village label.
  if (G.screen === 'playing') {
    ctx.fillStyle = 'rgba(6, 16, 30, 0.7)';
    ctx.fillRect(24, 70, 220, 24);
    ctx.fillStyle = '#cfe8ff';
    ctx.font = 'bold 13px sans-serif';
    const left = G.spawnQueue.length + G.enemies.length;
    ctx.fillText(left + ' embers left this wave', 32, 87);
  }
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PANEL;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = PANEL_LINE;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function button(ctx, G, id, x, y, w, h, label, sub) {
  ctx.fillStyle = '#1d6fb8';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#bfe9ff';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2 + (sub ? 2 : 7));
  if (sub) {
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#cfe8ff';
    ctx.fillText(sub, x + w / 2, y + h / 2 + 22);
  }
  ctx.textAlign = 'left';
  G.uiButtons.push({ id, x, y, w, h });
}

function drawBanner(ctx, G) {
  const a = G.banner.age < 1.8 ? 1 : Math.max(0, 1 - (G.banner.age - 1.8) / 0.4);
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(6, 16, 30, 0.8)';
  ctx.fillRect(340, 300, 600, 64);
  ctx.fillStyle = '#bfe9ff';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(G.banner.text, 640, 342);
  ctx.textAlign = 'left';
  ctx.globalAlpha = 1;
}

function drawTitle(ctx, G, t) {
  // Dim the live board, then the panel — the game is visible behind the text.
  ctx.fillStyle = 'rgba(4, 10, 20, 0.45)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const px = 300, py = 92, pw = 680, ph = 540;
  panel(ctx, px, py, pw, ph);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#bfe9ff';
  ctx.font = 'bold 54px sans-serif';
  ctx.fillText('FROSTLINE', 640, py + 66);
  ctx.fillStyle = '#ffd98a';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('freeze is the only wall', 640, py + 100);
  ctx.fillStyle = '#eaf7ff';
  ctx.font = '17px sans-serif';
  ctx.fillText('Ember imps march on the village. Freeze the channels', 640, py + 138);
  ctx.fillText('to shatter them — but flowing water feeds the mill.', 640, py + 162);
  ctx.fillStyle = '#ff8fa0';
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText('WIN: clear wave 10  •  LOSE: HEAT 0', 640, py + 192);
  // Route cards.
  const routes = ['standard', 'veteran', 'expert'];
  routes.forEach((rid, i) => {
    const r = ROUTES[rid];
    const x = px + 24 + i * 216;
    const y = py + 218;
    const sel = G.routeSel === rid;
    ctx.fillStyle = sel ? '#2a6ea8' : '#12294d';
    ctx.fillRect(x, y, 204, 118);
    ctx.strokeStyle = sel ? '#ffd98a' : PANEL_LINE;
    ctx.lineWidth = sel ? 3 : 1;
    ctx.strokeRect(x, y, 204, 118);
    ctx.fillStyle = '#ffd98a';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(r.tag, 640 + (i - 1) * 216, y + 22);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 19px sans-serif';
    ctx.fillText(r.name, 640 + (i - 1) * 216, y + 50);
    ctx.fillStyle = '#cfe8ff';
    ctx.font = '13px sans-serif';
    const words = r.desc.split('. ');
    ctx.fillText(words[0] + '.', 640 + (i - 1) * 216, y + 76);
    if (words[1]) ctx.fillText(words[1], 640 + (i - 1) * 216, y + 96);
    G.uiButtons.push({ id: 'route:' + rid, x, y, w: 204, h: 118 });
  });
  ctx.textAlign = 'left';
  ctx.fillStyle = '#9fc6e8';
  ctx.font = '15px sans-serif';
  ctx.fillText('Click a tile to freeze it (1 Frost) — click again to thaw.', px + 40, py + 380);
  ctx.fillText('Frozen tiles block + damage embers. Flowing water earns Frost.', px + 40, py + 404);
  ctx.fillText('Keys: 1–3 relics  •  Space start  •  R restart  •  M sound  •  P pause', px + 40, py + 428);
  button(ctx, G, 'start', 490, py + 452, 300, 56, '▶  START THE FROST', 'Ember Pass — Standard');
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7fa8c8';
  ctx.font = '13px sans-serif';
  ctx.fillText('A game by an AI agent for make.fun — freeze is the only wall.', 640, py + 526);
  ctx.textAlign = 'left';
}

function drawRelic(ctx, G) {
  ctx.fillStyle = 'rgba(4, 10, 20, 0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#bfe9ff';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('WAVE ' + G.wave + ' CLEARED', 640, 120);
  ctx.fillStyle = '#ffd98a';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('CHOOSE A FROST RELIC — pick 1', 640, 158);
  ctx.fillStyle = '#eaf7ff';
  ctx.font = '16px sans-serif';
  ctx.fillText('FROST ' + G.frost.toFixed(1) + '   •   HEAT ' + G.heat + '/10   •   SCORE ' + G.score, 640, 188);
  G.relicChoices.forEach((rel, i) => {
    const x = 300 + i * 240;
    const y = 220;
    ctx.fillStyle = '#12294d';
    ctx.fillRect(x, y, 220, 240);
    ctx.strokeStyle = PANEL_LINE;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 220, 240);
    ctx.fillStyle = '#ffd98a';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('PRESS ' + (i + 1), 410 + i * 240, y + 24);
    ctx.font = '44px sans-serif';
    ctx.fillText(rel.icon, 410 + i * 240, y + 84);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(rel.name, 410 + i * 240, y + 122);
    ctx.fillStyle = '#cfe8ff';
    ctx.font = '15px sans-serif';
    const words = rel.desc.split(' ');
    let line = '';
    let ly = y + 152;
    for (const w of words) {
      if ((line + ' ' + w).length > 22) {
        ctx.fillText(line, 410 + i * 240, ly);
        ly += 20;
        line = w;
      } else line = line ? line + ' ' + w : w;
    }
    if (line) ctx.fillText(line, 410 + i * 240, ly);
    G.uiButtons.push({ id: 'relic:' + i, x, y, w: 220, h: 240 });
  });
  ctx.textAlign = 'left';
  ctx.fillStyle = '#9fc6e8';
  ctx.font = '15px sans-serif';
  ctx.fillText('The next wave is already gathering embers above the village…', 430, 500);
}

function statBox(ctx, x, y, w, label, value) {
  ctx.fillStyle = '#12294d';
  ctx.fillRect(x, y, w, 74);
  ctx.strokeStyle = PANEL_LINE;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, 74);
  ctx.fillStyle = '#9fc6e8';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + 20);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(String(value), x + w / 2, y + 54);
  ctx.textAlign = 'left';
}

function drawVictory(ctx, G) {
  ctx.fillStyle = 'rgba(4, 14, 26, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const px = 280, py = 70, pw = 720, ph = 580;
  panel(ctx, px, py, pw, ph);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#bfe9ff';
  ctx.font = 'bold 42px sans-serif';
  ctx.fillText('FROSTLINE HELD', 640, py + 62);
  ctx.fillStyle = '#ffd98a';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('All 10 waves frozen — the Ember Colossus is shattered.', 640, py + 96);
  const s = G.stats;
  const mins = Math.floor(s.runTime / 60);
  const secs = Math.floor(s.runTime % 60).toString().padStart(2, '0');
  statBox(ctx, px + 30, py + 122, 200, 'WAVES', 10);
  statBox(ctx, px + 260, py + 122, 200, 'IMPS SHATTERED', s.impsShattered);
  statBox(ctx, px + 490, py + 122, 200, 'FROST SPENT', Math.round(s.frostSpent));
  statBox(ctx, px + 30, py + 212, 200, 'WATER MILLED', Math.round(s.waterMilled));
  statBox(ctx, px + 260, py + 212, 200, 'FREEZES CAST', s.freezesCast);
  statBox(ctx, px + 490, py + 212, 200, 'RUN TIME', mins + ':' + secs);
  ctx.fillStyle = '#eaf7ff';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('SCORE  ' + G.score, 640, py + 330);
  if (G.relics.length) {
    ctx.fillStyle = '#9fc6e8';
    ctx.font = '15px sans-serif';
    ctx.fillText('Relics carried: ' + G.relics.map((id) => RELICS.find((r) => r.id === id).name).join('  •  '), 640, py + 362);
  }
  button(ctx, G, 'endless', px + 60, py + 400, 280, 60, '❄  CONTINUE ENDLESS', 'waves 11+ — harder, endless');
  button(ctx, G, 'again', px + 380, py + 400, 280, 60, '↻  NEW RUN', 'same route, fresh frost');
  button(ctx, G, 'routes', px + 220, py + 478, 280, 48, 'ROUTE SELECT', 'pick another mountain');
  ctx.textAlign = 'left';
}

function drawGameOver(ctx, G) {
  ctx.fillStyle = 'rgba(20, 6, 10, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const px = 340, py = 150, pw = 600, ph = 400;
  panel(ctx, px, py, pw, ph);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff8fa0';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText('THE VILLAGE WENT DARK', 640, py + 66);
  ctx.fillStyle = '#eaf7ff';
  ctx.font = '19px sans-serif';
  ctx.fillText('The embers marched through — HEAT 0.', 640, py + 104);
  ctx.fillText('You held until wave ' + Math.max(1, G.wave) + ' of 10.', 640, py + 132);
  ctx.fillStyle = '#ffd98a';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('SCORE  ' + G.score, 640, py + 176);
  ctx.fillStyle = '#9fc6e8';
  ctx.font = '15px sans-serif';
  ctx.fillText('Tip: freeze the tile AHEAD of the march, not under it —', 640, py + 214);
  ctx.fillText('a frozen tile blocks the whole channel behind it.', 640, py + 236);
  button(ctx, G, 'again', px + 90, py + 272, 200, 56, '↻  TRY AGAIN', 'R key works too');
  button(ctx, G, 'routes', px + 310, py + 272, 200, 56, 'ROUTE SELECT', '');
  ctx.textAlign = 'left';
}
