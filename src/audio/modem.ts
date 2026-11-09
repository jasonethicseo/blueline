// Modem sounds synthesized with the Web Audio API: oscillators and generated noise only,
// no audio files (tech.md). Every call is wrapped so audio failure never blocks the flow
// (Req 1.9, 7.11); functions return false when nothing could be scheduled.
import { DIAL_TEXT, TIMING } from '../core/config';

type Ctx = AudioContext;
interface Voice { out: GainNode; sources: AudioScheduledSourceNode[] }

let ctx: Ctx | null = null;
let voice: Voice | null = null;

const VOLUME = 0.22;
const EDGE = 0.005; // seconds of fade at tone edges, to avoid clicks

// DTMF: low (row) and high (column) frequency per digit.
const DTMF: Record<string, [number, number]> = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
  '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
  '0': [941, 1336],
};

/** Create or resume the AudioContext. Call only inside a user gesture handler. */
export function unlock(): void {
  try {
    if (!ctx) {
      const w = window as Window & { webkitAudioContext?: typeof AudioContext };
      const C = window.AudioContext ?? w.webkitAudioContext;
      if (!C) return;
      ctx = new C();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  } catch {
    ctx = null;
  }
}

function context(): Ctx | null {
  if (!ctx || ctx.state === 'closed') return null;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function newVoice(c: Ctx): Voice {
  stop();
  const out = c.createGain();
  out.gain.value = VOLUME;
  out.connect(c.destination);
  voice = { out, sources: [] };
  return voice;
}

/** A gain envelope from `start` for `dur` seconds at `level`. */
function envelope(c: Ctx, v: Voice, start: number, dur: number, level: number): GainNode {
  const g = c.createGain();
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(level, start + EDGE);
  g.gain.setValueAtTime(level, start + dur - EDGE);
  g.gain.linearRampToValueAtTime(0, start + dur);
  g.connect(v.out);
  return g;
}

function tone(c: Ctx, v: Voice, freqs: number[], start: number, dur: number, level = 0.5, type: OscillatorType = 'sine'): OscillatorNode[] {
  const g = envelope(c, v, start, dur, level / freqs.length);
  return freqs.map((f) => {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, start);
    o.connect(g);
    o.start(start);
    o.stop(start + dur);
    v.sources.push(o);
    return o;
  });
}

function noise(c: Ctx, v: Voice, start: number, dur: number, level: number): void {
  const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const band = c.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 1800;
  band.Q.value = 0.8;
  src.connect(band);
  band.connect(envelope(c, v, start, dur, level));
  src.start(start);
  src.stop(start + dur);
  v.sources.push(src);
}

/**
 * About TIMING.handshakeMs of sound: DTMF digits of the dial number, a 2100 Hz answer
 * tone, alternating 1200/2400 Hz training tones, then band-passed noise over a wobbling
 * 1800 Hz carrier.
 */
export function handshake(): boolean {
  try {
    const c = context();
    if (!c) return false;
    const v = newVoice(c);
    const t0 = c.currentTime + 0.02;
    const total = TIMING.handshakeMs / 1000;

    let t = t0;
    for (const d of DIAL_TEXT.replace(/\D/g, '')) {
      const pair = DTMF[d];
      if (pair) tone(c, v, pair, t, 0.07, 0.6);
      t += 0.09;
    }
    tone(c, v, [2100], t0 + 1.0, 0.7, 0.35);

    const [train] = tone(c, v, [1200], t0 + 1.7, 0.8, 0.3, 'square');
    for (let k = 0, at = t0 + 1.7; at < t0 + 2.5; k++, at += 0.05) {
      train?.frequency.setValueAtTime(k % 2 ? 2400 : 1200, at);
    }

    const tail = total - 2.5;
    noise(c, v, t0 + 2.5, tail, 0.9);
    const [carrier] = tone(c, v, [1800], t0 + 2.5, tail, 0.25, 'sawtooth');
    if (carrier) {
      const lfo = c.createOscillator();
      const depth = c.createGain();
      lfo.frequency.value = 7;
      depth.gain.value = 120;
      lfo.connect(depth);
      depth.connect(carrier.frequency);
      lfo.start(t0 + 2.5);
      lfo.stop(t0 + total);
      v.sources.push(lfo);
    }
    return true;
  } catch {
    return false;
  }
}

/** Busy signal (480 + 620 Hz), three 250 ms pulses: 1.25 s in total. */
export function noCarrier(): boolean {
  try {
    const c = context();
    if (!c) return false;
    const v = newVoice(c);
    const t0 = c.currentTime + 0.02;
    for (let i = 0; i < 3; i++) tone(c, v, [480, 620], t0 + i * 0.5, 0.25, 0.6);
    return true;
  } catch {
    return false;
  }
}

/** Fade the current sound out over 20 ms and stop its sources. */
export function stop(): void {
  const v = voice;
  voice = null;
  if (!v || !ctx) return;
  try {
    const now = ctx.currentTime;
    v.out.gain.cancelScheduledValues(now);
    v.out.gain.setValueAtTime(v.out.gain.value, now);
    v.out.gain.linearRampToValueAtTime(0, now + 0.02);
    for (const s of v.sources) {
      try {
        s.stop(now + 0.03);
      } catch {
        // Already stopped.
      }
    }
  } catch {
    // Context gone; nothing to stop.
  }
}
