// Synthesised sounds: no audio files to load. The context starts on the
// first tap or click (browsers block audio until then).
let ctx = null, master = null, noise = null;
export function startAudio() {
  if (ctx) { ctx.resume?.(); return; }
  const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Ctx) return;
  ctx = new Ctx(); master = ctx.createGain(); master.gain.value = .7; master.connect(ctx.destination);
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
}
export function muteAudio(muted) { if (master) master.gain.value = muted ? 0 : .7; }

function out(volume = 1, pan = 0) {
  const gain = ctx.createGain(); gain.gain.value = volume;
  if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); gain.connect(p); p.connect(master); }
  else gain.connect(master);
  return gain;
}
function burst({ at = 0, length = .1, freq = 1000, q = 1, type = 'bandpass', volume = .5, pan = 0, decay = length }) {
  const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), env = out(0, pan), t = ctx.currentTime + at;
  src.buffer = noise; filter.type = type; filter.frequency.value = freq; filter.Q.value = q;
  env.gain.setValueAtTime(volume, t); env.gain.exponentialRampToValueAtTime(.001, t + decay);
  src.connect(filter); filter.connect(env); src.start(t, Math.random() * .5, length + .05);
}
function tone({ at = 0, from = 200, to = from, length = .1, type = 'sine', volume = .4, pan = 0 }) {
  const osc = ctx.createOscillator(), env = out(0, pan), t = ctx.currentTime + at;
  osc.type = type; osc.frequency.setValueAtTime(from, t); osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + length);
  env.gain.setValueAtTime(volume, t); env.gain.exponentialRampToValueAtTime(.001, t + length);
  osc.connect(env); osc.start(t); osc.stop(t + length + .02);
}

export const sfx = {
  // Suppressed shotgun: a dull thump and a short hiss, not a bang.
  shot() { if (!ctx) return; tone({ from: 110, to: 45, length: .18, volume: .9 }); burst({ length: .16, freq: 700, q: .7, type: 'lowpass', volume: .8 }); burst({ at: .01, length: .08, freq: 2400, q: 1.5, volume: .15 }); },
  pump() { if (!ctx) return; burst({ at: .05, length: .04, freq: 1800, q: 4, volume: .5 }); burst({ at: .26, length: .05, freq: 1300, q: 4, volume: .6 }); },
  shell() { if (!ctx) return; burst({ length: .03, freq: 2600, q: 6, volume: .35 }); },
  empty() { if (!ctx) return; burst({ length: .02, freq: 3200, q: 8, volume: .4 }); },
  hit() { if (!ctx) return; burst({ length: .12, freq: 500, q: 1, volume: .35 }); },
  // Caw: a nasal sawtooth through a vowel-like band, falling in pitch.
  caw(volume = .4, pan = 0, times = 2) {
    if (!ctx || volume < .02) return;
    const pitch = 480 + Math.random() * 140;
    for (let i = 0; i < times; i++) {
      const t = ctx.currentTime + i * .32, osc = ctx.createOscillator(), band = ctx.createBiquadFilter(), env = out(0, pan);
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(pitch * 1.08, t); osc.frequency.exponentialRampToValueAtTime(pitch * .7, t + .24);
      band.type = 'bandpass'; band.frequency.value = 1300; band.Q.value = 3;
      env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(volume, t + .03); env.gain.exponentialRampToValueAtTime(.001, t + .26);
      osc.connect(band); band.connect(env); osc.start(t); osc.stop(t + .3);
    }
  },
  flap(volume = .3, pan = 0) { if (!ctx || volume < .02) return; for (let i = 0; i < 4; i++) burst({ at: i * .09, length: .06, freq: 600, q: .8, volume, pan }); },
  win() { if (!ctx) return; [523, 659, 784, 1046].forEach((f, i) => tone({ at: i * .12, from: f, length: .25, type: 'triangle', volume: .3 })); },
  lose() { if (!ctx) return; [392, 330, 262].forEach((f, i) => tone({ at: i * .18, from: f, length: .3, type: 'triangle', volume: .3 })); }
};
