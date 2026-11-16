// FROSTLINE v4 — enemies. They walk IN the river, along its spine.
// A frozen segment stops them and hurts them; the Colossus melts the ice
// it stands on. Hounds split into two imps when shattered.

import { ENEMIES, FREEZE_TICK_SECONDS } from './config.js';

let nextId = 1;

export class Enemy {
  constructor(type, s, rng) {
    const def = ENEMIES[type];
    this.id = nextId++;
    this.type = type;
    this.s = s; // distance along the river spine
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.speed = def.speed;
    this.radius = def.radius;
    this.score = def.score;
    this.heat = def.heat;
    this.color = def.color;
    this.dark = def.dark;
    this.tick = 0; // time until the next freeze-damage tick
    this.melt = 0; // time the Colossus has stood on one frozen segment
    this.wobble = rng() * Math.PI * 2; // visual phase, seeded
    this.dead = false;
    this.escaped = false;
  }

  // Returns 'shattered' | 'escaped' | null. `fx` is the game context:
  // { river, relics:Set, damage, onShatter(enemy), onEscape(enemy) }.
  update(dt, fx) {
    if (this.dead || this.escaped) return null;
    const segIdx = fx.river.segmentAt(this.s);
    const seg = fx.river.segments[segIdx];
    if (seg && seg.frozen) {
      // Stopped on ice: it hurts. The Colossus melts its way out.
      this.tick -= dt;
      if (this.tick <= 0) {
        this.tick = FREEZE_TICK_SECONDS;
        this.hp -= fx.damage;
        if (this.hp <= 0) {
          this.dead = true;
          fx.onShatter(this);
          return 'shattered';
        }
      }
      if (this.type === 'colossus') {
        this.melt += dt;
        if (this.melt >= 1.2) {
          this.melt = 0;
          fx.river.thaw(segIdx);
        }
      }
      return null;
    }
    this.melt = 0;
    this.s += this.speed * dt;
    if (this.s >= fx.river.length) {
      this.escaped = true;
      fx.onEscape(this);
      return 'escaped';
    }
    return null;
  }
}

// Build one wave's spawn list: types in shuffled order, boss last.
export function buildWave(waveDef, rng) {
  const list = [];
  for (const [type, n] of Object.entries(waveDef)) {
    for (let i = 0; i < n; i++) list.push(type);
  }
  const boss = list.indexOf('colossus');
  const rest = list.filter((t) => t !== 'colossus');
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  if (boss >= 0) rest.push('colossus');
  return rest;
}
