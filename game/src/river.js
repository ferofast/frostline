// FROSTLINE v4 — the river: one serpentine channel, cut into freeze segments.
// The river is a polyline spine with a fixed width. Enemies walk the spine
// in the water; the player freezes whole segments of it. A frozen segment is
// a temporary wall: it melts on its own, and the Colossus melts it faster.

import { RIVER_POINTS, RIVER_WIDTH, SEGMENT_LENGTH, FREEZE_SECONDS } from './config.js';

function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }

// Build the spine: sample the waypoint polyline into points ~8 px apart so
// the channel curves smoothly, then group the samples into segments.
function buildSpine() {
  const pts = [];
  for (let i = 0; i < RIVER_POINTS.length - 1; i++) {
    const [ax, ay] = RIVER_POINTS[i];
    const [bx, by] = RIVER_POINTS[i + 1];
    const len = dist(ax, ay, bx, by);
    const steps = Math.max(1, Math.round(len / 8));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      pts.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
    }
  }
  pts.push(RIVER_POINTS[RIVER_POINTS.length - 1]);
  return pts;
}

export class River {
  constructor() {
    this.spine = buildSpine();
    // Cumulative distance along the spine for each sample point.
    this.cum = [0];
    for (let i = 1; i < this.spine.length; i++) {
      this.cum.push(this.cum[i - 1] + dist(...this.spine[i - 1], ...this.spine[i]));
    }
    this.length = this.cum[this.cum.length - 1];
    // Freeze segments: groups of spine samples, each with a frozen state.
    this.segments = [];
    let start = 0;
    for (let i = 1; i < this.spine.length; i++) {
      if (this.cum[i] - this.cum[start] >= SEGMENT_LENGTH || i === this.spine.length - 1) {
        this.segments.push({ a: start, b: i, frozen: false, meltIn: 0, perma: false });
        start = i;
      }
    }
    this.width = RIVER_WIDTH;
  }

  // Point + heading at a distance s along the spine.
  pointAt(s) {
    s = Math.max(0, Math.min(this.length, s));
    let lo = 0, hi = this.cum.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (this.cum[mid] <= s) lo = mid; else hi = mid;
    }
    const [ax, ay] = this.spine[lo];
    const [bx, by] = this.spine[Math.min(lo + 1, this.spine.length - 1)];
    const segLen = Math.max(0.001, this.cum[lo + 1] - this.cum[lo]);
    const t = (s - this.cum[lo]) / segLen;
    return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t, angle: Math.atan2(by - ay, bx - ax) };
  }

  // Which freeze segment contains distance s.
  segmentAt(s) {
    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      if (s >= this.cum[seg.a] && s <= this.cum[seg.b]) return i;
    }
    return this.segments.length - 1;
  }

  // Nearest segment to a canvas point (for clicks). Returns -1 when the
  // point is further than the channel's half-width plus a small margin.
  segmentNear(x, y) {
    let best = -1, bestD = Infinity;
    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      const mid = (this.cum[seg.a] + this.cum[seg.b]) / 2;
      const p = this.pointAt(mid);
      const d = dist(x, y, p.x, p.y);
      if (d < bestD) { bestD = d; best = i; }
    }
    return bestD <= this.width / 2 + 14 ? best : -1;
  }

  freeze(i, perma) {
    const seg = this.segments[i];
    if (!seg || seg.frozen) return false;
    seg.frozen = true;
    seg.meltIn = perma ? Infinity : FREEZE_SECONDS;
    seg.perma = !!perma;
    return true;
  }

  thaw(i) {
    const seg = this.segments[i];
    if (!seg || !seg.frozen) return false;
    seg.frozen = false;
    seg.meltIn = 0;
    seg.perma = false;
    return true;
  }

  meltAll() {
    let n = 0;
    for (const seg of this.segments) if (seg.frozen && !seg.perma) { seg.frozen = false; seg.meltIn = 0; n++; }
    return n;
  }

  // Advance melt timers. Returns how many segments melted this tick.
  update(dt) {
    let melted = 0;
    for (const seg of this.segments) {
      if (seg.frozen && !seg.perma) {
        seg.meltIn -= dt;
        if (seg.meltIn <= 0) { seg.frozen = false; seg.meltIn = 0; melted++; }
      }
    }
    return melted;
  }

  flowingCount() {
    let n = 0;
    for (const seg of this.segments) if (!seg.frozen) n++;
    return n;
  }

  frozenCount() {
    return this.segments.length - this.flowingCount();
  }
}
