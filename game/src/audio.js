// FROSTLINE v4 — WebAudio bleeps, no assets. A tiny synth: freeze crackle,
// shatter chime, thaw drip, wave horn, victory arpeggio. Silent until the
// first user gesture (browser autoplay rules); M toggles it.

export class AudioBus {
  constructor() {
    this.ctx = null;
    this.on = true;
  }

  ensure() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  tone(freq, seconds, type, gain, when = 0) {
    if (!this.on || !this.ctx) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    amp.gain.setValueAtTime(gain, t0);
    amp.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
    osc.connect(amp).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + seconds);
  }

  freeze() { this.ensure(); this.tone(880, 0.12, 'triangle', 0.12); this.tone(1320, 0.1, 'sine', 0.07, 0.03); }
  shatter() { this.ensure(); this.tone(1568, 0.16, 'sine', 0.14); this.tone(2093, 0.2, 'sine', 0.1, 0.05); }
  thaw() { this.ensure(); this.tone(392, 0.14, 'sine', 0.08); }
  horn() { this.ensure(); this.tone(220, 0.3, 'sawtooth', 0.08); this.tone(330, 0.3, 'sawtooth', 0.06, 0.08); }
  win() { this.ensure(); [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.12, i * 0.12)); }
  lose() { this.ensure(); [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.3, 'sawtooth', 0.07, i * 0.14)); }
  click() { this.ensure(); this.tone(660, 0.06, 'square', 0.05); }
}
