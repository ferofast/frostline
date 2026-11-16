// FROSTLINE v4 — all canvas drawing. One rule: the play screen must prove
// the game at a glance. The river is the biggest thing in the frame; the
// enemies are big and walk IN the water; WIN/LOSE is printed on the screen.

import { VIEW_W, VIEW_H, ENEMIES, RELICS, ROUTES } from './config.js';

const FONT = (px, weight = 'bold') => `${weight} ${px}px system-ui, -apple-system, sans-serif`;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, px, color, align = 'left', weight = 'bold') {
  ctx.font = FONT(px, weight);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
}

function enemyGlyph(ctx, type, x, y, r, t, wobble) {
  const def = ENEMIES[type];
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 3 + wobble) * 2);
  if (type === 'colossus') {
    // A huge dark mass with glowing cracks and eyes.
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff5a1f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, -r * 0.2); ctx.lineTo(-r * 0.1, r * 0.3); ctx.lineTo(r * 0.4, -r * 0.4);
    ctx.stroke();
    ctx.fillStyle = '#ffb347';
    ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.25, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.35, -r * 0.25, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff3b1f';
    ctx.beginPath(); ctx.moveTo(-r * 0.4, r * 0.35); ctx.lineTo(r * 0.4, r * 0.35); ctx.lineTo(0, r * 0.6); ctx.closePath(); ctx.fill();
  } else if (type === 'brute') {
    // Armored square with cracks and a visor.
    ctx.fillStyle = def.color;
    roundRect(ctx, -r, -r, r * 2, r * 2, 8);
    ctx.fill();
    ctx.strokeStyle = def.dark; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(-r * 0.55, -r * 0.15, r * 1.1, r * 0.3);
    ctx.strokeStyle = '#3a0d0d'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.7); ctx.lineTo(0, -r * 0.2); ctx.lineTo(r * 0.3, -r * 0.6); ctx.stroke();
  } else if (type === 'hound') {
    // Dark red hound: body, ears, snout, ember eyes.
    ctx.fillStyle = def.color;
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 0.6); ctx.lineTo(-r * 0.4, -r * 1.25); ctx.lineTo(-r * 0.1, -r * 0.6); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(r * 0.1, -r * 0.6); ctx.lineTo(r * 0.4, -r * 1.25); ctx.lineTo(r * 0.7, -r * 0.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.1, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.35, -r * 0.1, 5, 0, Math.PI * 2); ctx.fill();
  } else {
    // Ember imp: a flame teardrop with eyes.
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.15);
    ctx.quadraticCurveTo(r * 0.9, -r * 0.2, r * 0.75, r * 0.45);
    ctx.quadraticCurveTo(r * 0.4, r * 0.95, 0, r * 0.95);
    ctx.quadraticCurveTo(-r * 0.4, r * 0.95, -r * 0.75, r * 0.45);
    ctx.quadraticCurveTo(-r * 0.9, -r * 0.2, 0, -r * 1.15);
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath(); ctx.arc(-r * 0.28, -r * 0.1, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.28, -r * 0.1, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawBackground(ctx, t, snow) {
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, '#2a0e1e');
  sky.addColorStop(0.25, '#1a2340');
  sky.addColorStop(0.6, '#0e2a4a');
  sky.addColorStop(1, '#0a1626');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Stars.
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (const s of snow.stars) {
    ctx.fillRect(s[0], s[1], 2, 2);
  }
  // Volcano cone at the river source (top center), glowing lava mouth.
  ctx.fillStyle = '#1c0f16';
  ctx.beginPath();
  ctx.moveTo(520, 0); ctx.lineTo(760, 0); ctx.lineTo(700, 96); ctx.lineTo(580, 96); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ff5a1f';
  ctx.beginPath();
  ctx.ellipse(640, 52, 52, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffb347';
  ctx.beginPath();
  ctx.ellipse(640, 50, 30, 8, 0, 0, Math.PI * 2); ctx.fill();
  // Drifting snow.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const f of snow.flakes) {
    const y = (f[1] + t * f[2]) % VIEW_H;
    ctx.fillRect(f[0], y, 3, 3);
  }
}

function drawRiver(ctx, river, t) {
  const spine = river.spine;
  // Channel bed: dark rock edge.
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(spine[0][0], spine[0][1]);
  for (let i = 1; i < spine.length; i++) ctx.lineTo(spine[i][0], spine[i][1]);
  ctx.strokeStyle = '#0a2f52';
  ctx.lineWidth = river.width + 10;
  ctx.stroke();
  // Flowing water.
  ctx.strokeStyle = '#1a6fc4';
  ctx.lineWidth = river.width;
  ctx.stroke();
  ctx.strokeStyle = '#2f8fe0';
  ctx.lineWidth = river.width - 18;
  ctx.stroke();
  // Flow dashes, drifting downstream (fixed offsets when t is frozen).
  ctx.strokeStyle = 'rgba(190,232,255,0.75)';
  ctx.lineWidth = 5;
  ctx.setLineDash([26, 60]);
  ctx.lineDashOffset = -t * 46;
  ctx.stroke();
  ctx.setLineDash([]);
  // Frozen segments: bright ice over the water, with cracks.
  for (const seg of river.segments) {
    if (!seg.frozen) continue;
    ctx.beginPath();
    ctx.moveTo(spine[seg.a][0], spine[seg.a][1]);
    for (let i = seg.a + 1; i <= seg.b; i++) ctx.lineTo(spine[i][0], spine[i][1]);
    ctx.strokeStyle = '#bfe8ff';
    ctx.lineWidth = river.width - 6;
    ctx.stroke();
    ctx.strokeStyle = '#7cc7f0';
    ctx.lineWidth = river.width - 22;
    ctx.stroke();
    // Crack lines across the ice.
    const mid = river.pointAt((river.cum[seg.a] + river.cum[seg.b]) / 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mid.x - 14, mid.y - 10); ctx.lineTo(mid.x + 2, mid.y + 2); ctx.lineTo(mid.x + 16, mid.y - 6);
    ctx.moveTo(mid.x - 4, mid.y + 12); ctx.lineTo(mid.x + 10, mid.y + 2);
    ctx.stroke();
  }
}

function drawVillage(ctx, river, t, flowFrac) {
  const end = river.pointAt(river.length);
  // Mill wheel beside the river mouth, turning with the flow.
  const mx = Math.min(end.x + 66, VIEW_W - 60), my = end.y - 8;
  ctx.save();
  ctx.translate(mx, my);
  ctx.fillStyle = '#3a2a18';
  ctx.fillRect(-8, -34, 16, 68);
  ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = t * (0.4 + flowFrac) + (i * Math.PI) / 3;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * 30, Math.sin(a) * 30); ctx.stroke();
  }
  ctx.fillStyle = '#c9a86a';
  ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  text(ctx, 'MILL', mx, my + 52, 13, '#c9a86a', 'center');
  // Village houses with warm windows, bottom edge.
  const houses = [[90, 690, 64, 46], [210, 694, 56, 40], [1080, 664, 70, 50], [1180, 690, 60, 44]];
  for (const [hx, hy, hw, hh] of houses) {
    ctx.fillStyle = '#241a12';
    ctx.fillRect(hx - hw / 2, hy - hh, hw, hh);
    ctx.fillStyle = '#4a2c14';
    ctx.beginPath(); ctx.moveTo(hx - hw / 2 - 6, hy - hh); ctx.lineTo(hx, hy - hh - 22); ctx.lineTo(hx + hw / 2 + 6, hy - hh); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(hx - 12, hy - hh + 12, 10, 12);
    ctx.fillRect(hx + 4, hy - hh + 12, 10, 12);
  }
  text(ctx, 'VILLAGE', 150, 668, 14, '#ffd166', 'center');
}

function drawHud(ctx, g) {
  ctx.fillStyle = 'rgba(6,18,34,0.82)';
  ctx.fillRect(0, 0, VIEW_W, 64);
  ctx.fillStyle = '#1a6fc4';
  ctx.fillRect(0, 64, VIEW_W, 3);
  text(ctx, `❄ FROST ${Math.floor(g.frost)}`, 24, 42, 28, '#bfe8ff');
  text(ctx, `🔥 HEAT ${g.heat}`, 260, 42, 28, g.heat <= 3 ? '#ff6b6b' : '#ffb347');
  text(ctx, `WAVE ${Math.min(g.wave, 10)}/10`, 500, 42, 28, '#ffffff');
  text(ctx, `SCORE ${g.score}`, 700, 42, 28, '#ffd166');
  // The goal, printed on the play screen itself.
  text(ctx, 'WIN: clear wave 10  ·  LOSE: HEAT 0', VIEW_W - 24, 42, 18, '#c9d6e3', 'right');
  // Boss bar on wave 10.
  const boss = g.enemies.find((e) => e.type === 'colossus' && !e.dead);
  if (boss) {
    const bw = 420, bx = (VIEW_W - bw) / 2, by = 76;
    ctx.fillStyle = 'rgba(6,18,34,0.85)';
    roundRect(ctx, bx - 10, by - 4, bw + 20, 34, 8); ctx.fill();
    text(ctx, 'EMBER COLOSSUS', VIEW_W / 2, by + 16, 15, '#ff8f5a', 'center');
    ctx.fillStyle = '#3a0d0d';
    ctx.fillRect(bx, by + 20, bw, 8);
    ctx.fillStyle = '#ff3b1f';
    ctx.fillRect(bx, by + 20, bw * (boss.hp / boss.maxHp), 8);
  }
}

function drawSidePanels(ctx, g) {
  // LEFT — NEXT WAVE: icons + counts + countdown. A system, not a glossary.
  ctx.fillStyle = 'rgba(6,18,34,0.78)';
  roundRect(ctx, 12, 84, 168, 168, 10); ctx.fill();
  const waveLabel = (g.waveState === 'spawning' || g.waveState === 'fighting') ? `WAVE ${Math.min(g.wave, 10)}` : 'NEXT WAVE';
  text(ctx, waveLabel, 96, 110, 15, '#bfe8ff', 'center');
  const next = g.nextWave;
  let y = 138;
  for (const [type, n] of Object.entries(next)) {
    if (!n) continue;
    enemyGlyph(ctx, type, 40, y, 13, 0, 0);
    text(ctx, `× ${n}`, 62, y + 5, 17, '#ffffff');
    y += 28;
  }
  if (g.waveState === 'between') {
    text(ctx, `NEXT IN ${Math.ceil(g.betweenTimer)}s`, 96, 240, 16, '#ffd166', 'center');
  } else if (g.waveState === 'spawning' || g.waveState === 'fighting') {
    text(ctx, `${g.enemies.filter((e) => !e.dead && !e.escaped).length} LEFT`, 96, 240, 16, '#ffd166', 'center');
  }
  // RIGHT — MILL: a live dial + flow rate. Flowing water earns Frost.
  ctx.fillStyle = 'rgba(6,18,34,0.78)';
  roundRect(ctx, VIEW_W - 180, 84, 168, 168, 10); ctx.fill();
  text(ctx, 'MILL', VIEW_W - 96, 110, 15, '#c9a86a', 'center');
  const cx = VIEW_W - 96, cy = 156, r = 32;
  ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  const frac = g.river.flowingCount() / g.river.segments.length;
  ctx.strokeStyle = '#7cc7f0'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
  text(ctx, `${Math.round(frac * 100)}%`, cx, cy + 5, 14, '#bfe8ff', 'center');
  text(ctx, `+${(g.flowRate).toFixed(1)} ❄/s FLOW`, cx, 222, 15, '#bfe8ff', 'center');
}

function drawFloats(ctx, floats) {
  for (const f of floats) {
    ctx.globalAlpha = Math.max(0, 1 - f.age / f.life);
    text(ctx, f.text, f.x, f.y - f.age * 34, f.size, f.color, 'center');
  }
  ctx.globalAlpha = 1;
}

function drawEnemies(ctx, g, t) {
  for (const e of g.enemies) {
    if (e.dead || e.escaped) continue;
    const p = g.river.pointAt(e.s);
    enemyGlyph(ctx, e.type, p.x, p.y, e.radius, t, e.wobble);
    // HP pips above the sprite.
    if (e.maxHp > 1) {
      for (let i = 0; i < e.maxHp; i++) {
        ctx.fillStyle = i < e.hp ? '#ff5a1f' : 'rgba(255,255,255,0.25)';
        ctx.beginPath(); ctx.arc(p.x - (e.maxHp - 1) * 7 + i * 14, p.y - e.radius - 12, 4, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
}

function drawRelicCard(ctx, relic, x, y, w, h, key) {
  ctx.fillStyle = 'rgba(16,34,58,0.95)';
  roundRect(ctx, x, y, w, h, 12); ctx.fill();
  ctx.strokeStyle = relic.color; ctx.lineWidth = 3; ctx.stroke();
  text(ctx, `[${key}]`, x + w / 2, y + 34, 15, relic.color, 'center');
  text(ctx, relic.name, x + w / 2, y + 66, 21, '#ffffff', 'center');
  ctx.fillStyle = '#c9d6e3';
  ctx.font = FONT(16, 'normal');
  ctx.textAlign = 'center';
  const words = relic.text.split(' ');
  let line = '', ly = y + 100;
  for (const word of words) {
    if ((line + ' ' + word).trim().length > 22) { ctx.fillText(line.trim(), x + w / 2, ly); line = word; ly += 22; }
    else line += ' ' + word;
  }
  ctx.fillText(line.trim(), x + w / 2, ly);
}

function drawBestiary(ctx, x, y) {
  text(ctx, 'THE EMBERS', x, y, 14, '#ffb347', 'center');
  const row = [['imp', 'Imp · 1 HP'], ['hound', 'Hound · 2 HP · splits'], ['brute', 'Brute · 3 HP'], ['colossus', 'Colossus · 24 HP · melts ice']];
  let bx = x - 300;
  for (const [type, label] of row) {
    enemyGlyph(ctx, type, bx + 24, y + 26, type === 'colossus' ? 26 : 18, 0, 0);
    text(ctx, label, bx + 56, y + 31, 12, '#c9d6e3');
    bx += 170;
  }
}

export function render(ctx, g, t) {
  drawBackground(ctx, t, g.snow);
  drawRiver(ctx, g.river, t);
  drawVillage(ctx, g.river, t, g.river.flowingCount() / g.river.segments.length);
  drawEnemies(ctx, g, t);
  drawFloats(ctx, g.floats);

  if (g.screen === 'title') {
    // The board stays bright behind the panel: the judge sees the game here too.
    ctx.fillStyle = 'rgba(4,12,24,0.45)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = 'rgba(8,22,42,0.92)';
    roundRect(ctx, 190, 84, 900, 552, 16); ctx.fill();
    ctx.strokeStyle = '#1a6fc4'; ctx.lineWidth = 3; ctx.stroke();
    text(ctx, 'FROSTLINE', 640, 152, 56, '#bfe8ff', 'center');
    text(ctx, 'freeze is the only wall', 640, 188, 24, '#7cc7f0', 'center');
    text(ctx, 'Ember imps march down the river on the village. Freeze the water to', 640, 232, 18, '#e8f1f8', 'center', 'normal');
    text(ctx, 'shatter them — but flowing water feeds the mill. Survive 10 waves,', 640, 256, 18, '#e8f1f8', 'center', 'normal');
    text(ctx, 'break the Ember Colossus.', 640, 280, 18, '#e8f1f8', 'center', 'normal');
    text(ctx, 'WIN: clear wave 10   ·   LOSE: HEAT 0', 640, 316, 19, '#ffd166', 'center');
    // Three routes, each with its modifier printed on the card.
    const rw = 270, gap = 20;
    ROUTES.forEach((route, i) => {
      const x = 220 + i * (rw + gap), y = 340;
      ctx.fillStyle = g.route === route.id ? 'rgba(26,111,196,0.5)' : 'rgba(16,34,58,0.9)';
      roundRect(ctx, x, y, rw, 92, 10); ctx.fill();
      ctx.strokeStyle = g.route === route.id ? '#ffd166' : '#2f5f8a'; ctx.lineWidth = 2; ctx.stroke();
      text(ctx, route.name, x + rw / 2, y + 30, 19, '#ffffff', 'center');
      text(ctx, route.level, x + rw / 2, y + 54, 13, '#7cc7f0', 'center');
      text(ctx, route.text, x + rw / 2, y + 78, 12, '#c9d6e3', 'center', 'normal');
    });
    drawBestiary(ctx, 640, 462);
    text(ctx, `BEST ${g.best.toLocaleString('en-US')}   ·   LAST RUNS  ${g.lastRuns.join('  ·  ') || '—'}`, 640, 540, 15, '#9fb3c8', 'center');
    ctx.fillStyle = '#1a6fc4';
    roundRect(ctx, 540, 566, 200, 52, 10); ctx.fill();
    text(ctx, 'START  [Space]', 640, 600, 20, '#ffffff', 'center');
    text(ctx, 'Click a river segment to freeze it · 1 / 2 / 3 pick a relic · M sound', 640, 628, 13, '#9fb3c8', 'center', 'normal');
    return;
  }

  drawHud(ctx, g);
  drawSidePanels(ctx, g);

  if (g.screen === 'relic') {
    ctx.fillStyle = 'rgba(4,12,24,0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, `WAVE ${g.wave} CLEARED`, 640, 150, 40, '#bfe8ff', 'center');
    text(ctx, 'CHOOSE A FROST RELIC', 640, 196, 24, '#ffd166', 'center');
    g.relicChoices.forEach((relic, i) => {
      drawRelicCard(ctx, relic, 320 + i * 230, 240, 210, 190, i + 1);
    });
    text(ctx, 'Press 1 / 2 / 3 or click a card', 640, 480, 17, '#c9d6e3', 'center');
    return;
  }

  if (g.screen === 'victory' || g.screen === 'gameover') {
    const won = g.screen === 'victory';
    ctx.fillStyle = 'rgba(4,12,24,0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = 'rgba(8,22,42,0.94)';
    roundRect(ctx, 240, 96, 800, 528, 16); ctx.fill();
    ctx.strokeStyle = won ? '#7cc7f0' : '#ff5a1f'; ctx.lineWidth = 3; ctx.stroke();
    text(ctx, won ? 'FROSTLINE HELD' : 'THE VILLAGE FELL', 640, 168, 44, won ? '#bfe8ff' : '#ff8f5a', 'center');
    text(ctx, won ? 'all 10 waves frozen — the river is yours' : `the embers reached the village on wave ${g.wave}`, 640, 206, 19, '#e8f1f8', 'center', 'normal');
    const stats = [
      ['WAVES', `${Math.min(g.wave, 10)}`],
      ['IMPS SHATTERED', `${g.stats.shattered}`],
      ['FROST SPENT', `${g.stats.frostSpent}`],
      ['WATER MILLED', `${Math.floor(g.stats.milled)}`],
      ['FREEZES CAST', `${g.stats.freezes}`],
      ['RUN TIME', g.runTime],
    ];
    stats.forEach(([label, value], i) => {
      const x = 300 + (i % 3) * 230, y = 250 + Math.floor(i / 3) * 92;
      ctx.fillStyle = 'rgba(16,34,58,0.9)';
      roundRect(ctx, x, y, 210, 76, 10); ctx.fill();
      text(ctx, label, x + 105, y + 28, 13, '#9fb3c8', 'center');
      text(ctx, value, x + 105, y + 58, 24, '#ffffff', 'center');
    });
    if (g.relicsOwned.length) {
      text(ctx, 'RELICS CARRIED', 640, 470, 14, '#9fb3c8', 'center');
      let rx = 640 - (g.relicsOwned.length * 110) / 2;
      for (const r of g.relicsOwned) {
        ctx.fillStyle = 'rgba(16,34,58,0.9)';
        roundRect(ctx, rx, 482, 100, 30, 8); ctx.fill();
        text(ctx, r.name, rx + 50, 502, 12, r.color, 'center');
        rx += 110;
      }
    }
    if (won) text(ctx, 'NEXT GOAL: hold it on Magma Throat', 640, 548, 16, '#ffd166', 'center');
    text(ctx, 'R — NEW RUN      ·      C — CONTINUE ENDLESS', 640, 584, 17, '#ffffff', 'center');
    return;
  }
}
