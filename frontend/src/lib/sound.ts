// Tiny sound design, synthesized with Web Audio: no files, works offline. Muted state persists.

const MUTE_KEY = 'moment-muted'
let ctx: AudioContext | null = null

export const isMuted = () => localStorage.getItem(MUTE_KEY) === '1'
export const setMuted = (muted: boolean) => localStorage.setItem(MUTE_KEY, muted ? '1' : '0')

function audio(): AudioContext | null {
  if (isMuted() || typeof AudioContext === 'undefined') return null
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

interface Tone {
  freq: number
  to?: number // glide target
  at?: number // seconds from now
  dur: number
  type?: OscillatorType
  gain?: number
}

function play(tones: Tone[]) {
  const ac = audio()
  if (!ac) return
  const now = ac.currentTime
  for (const { freq, to, at = 0, dur, type = 'sine', gain = 0.06 } of tones) {
    const osc = ac.createOscillator()
    const amp = ac.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, now + at)
    if (to) osc.frequency.exponentialRampToValueAtTime(to, now + at + dur)
    amp.gain.setValueAtTime(0.0001, now + at)
    amp.gain.exponentialRampToValueAtTime(gain, now + at + 0.02)
    amp.gain.exponentialRampToValueAtTime(0.0001, now + at + dur)
    osc.connect(amp).connect(ac.destination)
    osc.start(now + at)
    osc.stop(now + at + dur + 0.05)
  }
}

export const sound = {
  /** Adobee takes off. */
  buzz: () =>
    play([
      { freq: 190, to: 240, dur: 0.35, type: 'sawtooth', gain: 0.018 },
      { freq: 380, to: 470, dur: 0.35, type: 'triangle', gain: 0.012 },
    ]),
  /** The referee found a conflict. */
  ding: () =>
    play([
      { freq: 880, dur: 0.25, gain: 0.05 },
      { freq: 1320, at: 0.12, dur: 0.35, gain: 0.045 },
    ]),
  /** The post shipped: a bright major arpeggio. */
  chord: () =>
    play([
      { freq: 523.25, dur: 0.5, type: 'triangle', gain: 0.05 },
      { freq: 659.25, at: 0.09, dur: 0.5, type: 'triangle', gain: 0.05 },
      { freq: 783.99, at: 0.18, dur: 0.6, type: 'triangle', gain: 0.05 },
      { freq: 1046.5, at: 0.3, dur: 0.8, gain: 0.04 },
    ]),
  /** Brand safety said no. */
  bonk: () =>
    play([
      { freq: 220, to: 110, dur: 0.35, type: 'square', gain: 0.03 },
      { freq: 165, to: 82, at: 0.15, dur: 0.4, type: 'square', gain: 0.025 },
    ]),
}
