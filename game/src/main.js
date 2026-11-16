// FROSTLINE v4 — the game itself: state machine, loop, economy, waves.
// Screens: title -> playing <-> relic -> victory / gameover (+ endless).
// The loop is a plain requestAnimationFrame loop; the river, the enemies and
// the mill all advance on dt. Shot scenes (?shot=) and the self-test
// (?selftest=1) run through the same code as a human player.

import {
  VIEW_W, VIEW_H, WAVES, RELICS, ROUTES, SPAWN_GAP, WAVE_CLEAR_BONUS,
  FREEZE_COST, FLOW_FROST_PER_SEGMENT, SHATTER_FROST, START_FROST, START_HEAT,
  makeRng,
} from './config.js';
import { River } from './river.js';
import { Enemy, buildWave } from './enemies.js';
import { render } from './render.js';
import { attachInput } from './input.js';
import { AudioBus } from './audio.js';
import { applyShot } from './shots.js';

const params = new URLSearchParams(location.search);
const SHOT = params.get('shot');
const SEED = Number(params.get('seed') || 7);
const SELFTEST = params.get('selftest') === '1';
const TESTMODE = params.get('mode') || 'win'; // win: autopilot plays to win; idle: never freezes, must lose

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.audio = new AudioBus();
    this.river = new River();
    this.rng = makeRng(SEED);
    this.snow = this.makeSnow();
    this.route = ROUTES[0];
    this.best = this.loadBest();
    this.lastRuns = this.loadRuns();
    this.reset();
    this.screen = 'title';
    this.time = 0;
    this.shotReady = false;
    this.shotMode = false;
    this.paused = false;
    this.selftest = SELFTEST;
    this.testLog = [];
    if (SHOT) applyShot(this, SHOT, SEED);
    if (SELFTEST) this.startSelftest();
  }

  makeSnow() {
    const rng = makeRng(99);
    return {
      stars: Array.from({ length: 40 }, () => [rng() * VIEW_W, rng() * 200]),
      flakes: Array.from({ length: 60 }, () => [rng() * VIEW_W, rng() * VIEW_H, 8 + rng() * 14]),
    };
  }

  loadBest() {
    try { return Number(localStorage.getItem('frostline-best') || 0); } catch { return 0; }
  }

  loadRuns() {
    try { return JSON.parse(localStorage.getItem('frostline-runs') || '[]'); } catch { return []; }
  }

  saveBest() {
    try {
      localStorage.setItem('frostline-best', String(this.best));
      localStorage.setItem('frostline-runs', JSON.stringify(this.lastRuns.slice(0, 3)));
    } catch { /* storage unavailable: best score just does not persist */ }
  }

  reset() {
    this.frost = START_FROST;
    this.heat = START_HEAT;
    this.score = 0;
    this.wave = 1;
    this.waveState = 'idle';
    this.enemies = [];
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.betweenTimer = 0;
    this.floats = [];
    this.relicsOwned = [];
    this.relicChoices = [];
    this.relics = new Set();
    this.permaUsedThisWave = false;
    this.stats = { shattered: 0, frostSpent: 0, milled: 0, freezes: 0 };
    this.runTime = '0:00';
    this.runSeconds = 0;
    this.endless = false;
    this.river.segments.forEach((s) => { s.frozen = false; s.meltIn = 0; s.perma = false; });
  }

  get damage() { return this.relics.has('deep') ? 2 : 1; }

  get flowRate() {
    const flowing = this.river.flowingCount();
    let rate = FLOW_FROST_PER_SEGMENT * flowing;
    if (this.relics.has('mill')) rate *= 1.5;
    return rate * (1 + this.route.frost);
  }

  get nextWave() {
    const def = WAVES[Math.min(this.wave, 10) - 1];
    if (!def) return { imp: 0, brute: 0, hound: 0, colossus: 0 };
    const route = this.route;
    const out = { ...def };
    if (this.wave >= route.bruteFrom && out.brute === 0 && this.wave >= 3) out.brute = 1;
    return out;
  }

  addFloat(text, x, y, color, size = 20) {
    // One queue, at most two floats at once, never stacked on each other.
    if (this.floats.length >= 2) this.floats.shift();
    this.floats.push({ text, x, y, age: 0, life: 1.2, size, color });
  }

  startRun() {
    this.reset();
    this.screen = 'playing';
    this.audio.ensure();
    this.audio.horn();
    this.startWave(1);
  }

  startWave(n) {
    this.wave = n;
    this.waveState = 'spawning';
    this.permaUsedThisWave = false;
    const def = this.nextWave;
    // Route speed modifier: Veteran waves spawn faster.
    this.spawnQueue = buildWave(def, this.rng);
    this.spawnTimer = 0;
    this.audio.horn();
  }

  spawnNext() {
    const type = this.spawnQueue.shift();
    if (!type) return;
    const speedMul = this.route.speed;
    const e = new Enemy(type, 0, this.rng);
    e.speed *= speedMul;
    this.enemies.push(e);
  }

  onShatter(e) {
    this.stats.shattered++;
    this.score += Math.round(e.score * this.route.score);
    this.frost += SHATTER_FROST;
    const p = this.river.pointAt(e.s);
    this.addFloat(`SHATTER! +${e.score}`, p.x, p.y - e.radius - 18, '#ffd166', 22);
    if (e.type === 'hound') {
      // A hound splits into two imps where it fell.
      for (const ds of [-14, 14]) {
        const imp = new Enemy('imp', Math.max(0, e.s + ds), this.rng);
        this.enemies.push(imp);
      }
    }
    if (this.relics.has('burst')) {
      // Shatterburst: the tiles beside the shatter freeze, free.
      const i = this.river.segmentAt(e.s);
      for (const j of [i - 1, i + 1]) {
        if (j >= 0 && j < this.river.segments.length) this.river.freeze(j, false);
      }
    }
    this.audio.shatter();
  }

  onEscape(e) {
    this.heat -= e.heat;
    const p = this.river.pointAt(this.river.length - 4);
    this.addFloat(`-${e.heat} HEAT`, p.x - 60, p.y - 60, '#ff6b6b', 22);
    if (this.heat <= 0) {
      this.heat = 0;
      this.endRun(false);
    }
  }

  endRun(won) {
    this.waveState = 'done';
    this.screen = won ? 'victory' : 'gameover';
    const mins = Math.floor(this.runSeconds / 60);
    const secs = Math.floor(this.runSeconds % 60).toString().padStart(2, '0');
    this.runTime = `${mins}:${secs}`;
    const record = `${won ? 'WON' : 'LOST'} ${this.score.toLocaleString('en-US')}`;
    this.lastRuns.unshift(record);
    this.lastRuns = this.lastRuns.slice(0, 3);
    if (this.score > this.best) this.best = this.score;
    this.saveBest();
    if (won) this.audio.win(); else this.audio.lose();
    if (this.selftest) this.finishSelftest(won);
  }

  pickRelic(i) {
    if (this.screen !== 'relic') return;
    const relic = this.relicChoices[i];
    if (!relic) return;
    if (!this.relics.has(relic.id)) {
      this.relics.add(relic.id);
      this.relicsOwned.push(relic);
      if (relic.id === 'surge') {
        const n = this.river.meltAll();
        this.frost += 2 * n;
        this.addFloat(`MELT SURGE +${2 * n} ❄`, 640, 360, '#ff9d76', 22);
      }
      if (relic.id === 'heart') this.heat += 2;
    } else {
      // An owned relic again: attune it into Frost instead of nothing.
      this.frost += 3;
    }
    this.audio.click();
    this.screen = 'playing';
    if (this.wave >= 10 && !this.endless) this.endRun(true);
    else this.startWave(this.wave + 1);
  }

  offerRelics() {
    const pool = RELICS.filter((r) => !this.relics.has(r.id));
    const picks = [];
    const bag = [...pool];
    while (picks.length < 3 && bag.length) {
      picks.push(bag.splice(Math.floor(this.rng() * bag.length), 1)[0]);
    }
    while (picks.length < 3) picks.push(RELICS[Math.floor(this.rng() * RELICS.length)]);
    this.relicChoices = picks;
    this.screen = 'relic';
    this.waveState = 'between';
    this.betweenTimer = 0;
  }

  freezeAt(x, y) {
    const i = this.river.segmentNear(x, y);
    if (i < 0) return;
    const seg = this.river.segments[i];
    if (seg.frozen) {
      if (this.river.thaw(i)) this.audio.thaw();
      return;
    }
    if (this.frost < FREEZE_COST) {
      const p = this.river.pointAt((this.river.cum[seg.a] + this.river.cum[seg.b]) / 2);
      this.addFloat('NEED FROST', p.x, p.y - 30, '#ff6b6b', 18);
      return;
    }
    const perma = this.relics.has('perma') && !this.permaUsedThisWave;
    if (this.river.freeze(i, perma)) {
      if (perma) this.permaUsedThisWave = true;
      this.frost -= FREEZE_COST;
      this.stats.frostSpent += FREEZE_COST;
      this.stats.freezes++;
      this.audio.freeze();
    }
  }

  click(x, y) {
    this.audio.ensure();
    if (this.screen === 'title') {
      // Route cards.
      const rw = 270, gap = 20;
      for (let i = 0; i < ROUTES.length; i++) {
        const rx = 220 + i * (rw + gap);
        if (x >= rx && x <= rx + rw && y >= 340 && y <= 432) {
          this.route = ROUTES[i];
          this.audio.click();
          return;
        }
      }
      if (x >= 540 && x <= 740 && y >= 566 && y <= 618) this.startRun();
      return;
    }
    if (this.screen === 'playing') { this.freezeAt(x, y); return; }
    if (this.screen === 'relic') {
      for (let i = 0; i < 3; i++) {
        const cx = 320 + i * 230;
        if (x >= cx && x <= cx + 210 && y >= 240 && y <= 430) { this.pickRelic(i); return; }
      }
      return;
    }
    if (this.screen === 'victory' || this.screen === 'gameover') {
      if (y >= 560 && y <= 610) {
        if (x >= 380 && x <= 620) this.pressRestart();
        else if (x >= 660 && x <= 900) this.pressContinue();
      }
    }
  }

  pressSpace() {
    if (this.screen === 'title') this.startRun();
    else if (this.screen === 'playing') this.paused = !this.paused;
  }

  pressRestart() {
    if (this.screen === 'victory' || this.screen === 'gameover') this.startRun();
  }

  pressContinue() {
    if (this.screen !== 'victory') return;
    this.endless = true;
    this.screen = 'playing';
    this.wave = 11;
    this.startWave(11);
  }

  toggleSound() { this.audio.on = !this.audio.on; }

  update(dt) {
    if (this.paused) return;
    this.runSeconds += dt;
    // Mill income from flowing water.
    const earned = this.flowRate * dt;
    this.frost += earned;
    this.stats.milled += earned;
    this.river.update(dt);
    for (const f of this.floats) f.age += dt;
    this.floats = this.floats.filter((f) => f.age < f.life);

    if (this.waveState === 'spawning') {
      this.spawnTimer -= dt;
      if (this.spawnQueue.length && this.spawnTimer <= 0) {
        this.spawnNext();
        this.spawnTimer = SPAWN_GAP;
      }
      if (!this.spawnQueue.length) this.waveState = 'fighting';
    }
    if (this.waveState === 'fighting' || this.waveState === 'spawning') {
      const fx = {
        river: this.river,
        relics: this.relics,
        damage: this.damage,
        onShatter: (e) => this.onShatter(e),
        onEscape: (e) => this.onEscape(e),
      };
      for (const e of this.enemies) e.update(dt, fx);
      this.enemies = this.enemies.filter((e) => !e.dead && !e.escaped);
      if (this.screen === 'gameover') return;
      if (this.waveState === 'fighting' && !this.spawnQueue.length && !this.enemies.length) {
        this.score += Math.round(WAVE_CLEAR_BONUS(this.wave) * this.route.score);
        if (this.wave >= 10 && !this.endless) {
          this.endRun(true);
        } else if (this.endless) {
          this.startWave(this.wave + 1);
        } else {
          this.offerRelics();
        }
      }
    }
  }

  // ---- self-test: an autopilot plays the real game at 8x speed. ----
  startSelftest() {
    this.testLog.push('selftest start');
    this.audio.on = false; // headless run: no sound needed, no AudioContext
    this.startRun();
    this.selftestTimer = 0;
    this.selftestDone = false;
    // Synchronous fast-forward: step the real update loop until the run
    // ends. requestAnimationFrame barely advances under virtual time in
    // headless Chrome, so the live loop is not a reliable playtest there.
    let steps = 0;
    while (!this.selftestDone && steps < 40000) {
      if (this.screen === 'playing') this.update(0.05);
      this.selftestStep(0.05);
      steps++;
    }
    if (!this.selftestDone) {
      this.selftestDone = true;
      this.testLog.push(`TIMEOUT steps=${steps} wave=${this.wave} heat=${this.heat} score=${this.score}`);
      this.reportSelftest('TIMEOUT');
    }
    if (TESTMODE === 'idle' && this.screen === 'gameover') {
      // Lose path verified: restart must bring a fresh run back.
      this.pressRestart();
      const ok = this.screen === 'playing' && this.wave === 1 && this.heat === START_HEAT;
      for (let i = 0; i < 200; i++) { if (this.screen === 'playing') this.update(0.05); }
      this.testLog.push(`restart ${ok ? 'ok' : 'BROKEN'} screen=${this.screen} wave=${this.wave}`);
      this.reportSelftest(ok ? 'LOSE-OK' : 'RESTART-BROKEN');
    }
  }

  selftestStep(dt) {
    if (this.selftestDone) return;
    this.selftestTimer += dt;
    // Idle mode: never freeze, so the embers walk through and the run ends.
    if (TESTMODE === 'idle') {
      if (this.screen === 'relic') this.pickRelic(0);
      return;
    }
    // Freeze the segment just ahead of the nearest live enemy, when affordable.
    if (this.screen === 'playing' && !this.paused) {
      const live = this.enemies.filter((e) => !e.dead && !e.escaped);
      if (live.length) {
        live.sort((a, b) => b.s - a.s);
        const lead = live[0];
        const ahead = this.river.segmentAt(Math.min(lead.s + 60, this.river.length - 1));
        const seg = this.river.segments[ahead];
        if (seg && !seg.frozen && this.frost >= FREEZE_COST) {
          const p = this.river.pointAt((this.river.cum[seg.a] + this.river.cum[seg.b]) / 2);
          this.freezeAt(p.x, p.y);
        }
      }
    }
    if (this.screen === 'relic') this.pickRelic(0);
    if (this.selftestTimer > 400) {
      this.selftestDone = true;
      this.testLog.push(`TIMEOUT wave=${this.wave} heat=${this.heat} score=${this.score}`);
      this.reportSelftest('TIMEOUT');
    }
  }

  finishSelftest(won) {
    if (this.selftestDone) return;
    this.selftestDone = true;
    this.testLog.push(`END won=${won} wave=${this.wave} heat=${this.heat} score=${this.score} frost=${Math.floor(this.frost)} time=${this.runTime}`);
    if (TESTMODE === 'idle') return; // the restart check below reports
    this.reportSelftest(won ? 'PASS' : 'FAIL');
  }

  reportSelftest(result) {
    const line = `SELFTEST ${result} | ${this.testLog.join(' | ')}`;
    const el = document.getElementById('test');
    if (el) el.textContent = line;
    document.title = line;
  }

  frame(now) {
    const t = this.shotMode ? 1.234 : now / 1000;
    const dt = Math.min(0.05, (now - (this.lastNow ?? now)) / 1000 || 0.016);
    this.lastNow = now;
    if (!this.shotMode && this.screen === 'playing') {
      this.update(this.selftest ? dt * 8 : dt);
      if (this.selftest) this.selftestStep(dt * 8);
    }
    this.time = t;
    render(this.ctx, this, t);
    const status = document.getElementById('status');
    if (status) {
      status.textContent = this.screen === 'playing'
        ? `Wave ${this.wave} of 10. Frost ${Math.floor(this.frost)}, heat ${this.heat}, score ${this.score}.`
        : this.screen;
    }
    if (!this.shotReady) this.shotReady = true;
    window.__shotReady = true;
  }

  run() {
    const loop = (now) => { this.frame(now); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
}

const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const game = new Game(canvas);
window.__game = game;
attachInput(canvas, game);
game.run();
