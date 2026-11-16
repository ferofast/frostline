// FROSTLINE audio — one job: WebAudio feedback, no assets, no network.
// Freeze crackle, shatter chime, thaw drip, wave horn, victory arpeggio.
// Everything is guarded: no AudioContext until the first user gesture,
// silent in shot/test mode, silent when muted.

let ctx = null;
let muted = false;

function ac(G) {
  if (G && G.shotMode) return null;
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch (e) { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(G, freq, dur, type, vol, slideTo) {
  if (G && G.muted) return;
  const c = ac(G);
  if (!c) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.12, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur + 0.02);
  } catch (e) { /* sound is garnish, never fatal */ }
}

function noise(G, dur, vol, filterFreq) {
  if (G && G.muted) return;
  const c = ac(G);
  if (!c) return;
  try {
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = filterFreq || 3000;
    const g = c.createGain();
    g.gain.value = vol || 0.15;
    src.connect(f); f.connect(g); g.connect(c.destination);
    src.start();
  } catch (e) { /* garnish */ }
}

export function playSfx(G, name) {
  if (!G) return;
  switch (name) {
    case 'freeze': noise(G, 0.12, 0.18, 4200); tone(G, 880, 0.08, 'triangle', 0.08, 1320); break;
    case 'thaw': tone(G, 520, 0.18, 'sine', 0.1, 240); break;
    case 'click': tone(G, 660, 0.06, 'square', 0.06); break;
    case 'shatter': noise(G, 0.18, 0.2, 5200); tone(G, 1240, 0.16, 'triangle', 0.1, 1860); break;
    case 'reach': tone(G, 180, 0.3, 'sawtooth', 0.14, 90); break;
    case 'horn': tone(G, 220, 0.4, 'sawtooth', 0.12, 330); tone(G, 110, 0.4, 'sawtooth', 0.1, 165); break;
    case 'relic': tone(G, 523, 0.12, 'sine', 0.1); setTimeout(() => tone(G, 784, 0.14, 'sine', 0.1), 90); break;
    case 'victory':
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(G, f, 0.22, 'triangle', 0.12), i * 130));
      break;
    case 'defeat': [330, 262, 196].forEach((f, i) => setTimeout(() => tone(G, f, 0.3, 'sawtooth', 0.1), i * 160)); break;
  }
}

export function setMuted(m) { muted = m; }
