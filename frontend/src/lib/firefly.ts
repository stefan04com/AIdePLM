// Adobe Firefly mock: pressing "Generate with Firefly" on the post's image looks like a Firefly call,
// then the post's visual changes to the "generated" photo. Nothing is sent to Adobe; the photos are
// files we ship (see public/visuals/CREDITS.md). A real integration would replace `generate()` in
// hooks/useFirefly.ts and keep the same shapes. No value imports, so `npm test` can run it in Node.

/** The image Firefly "generates" for the Boabe post. */
export const FIREFLY_IMAGE = { url: '/visuals/boabe-pumpkin-latte-revised.jpg', label: 'Generated with Adobe Firefly' }

/** The post a rejected trend would have made: shown behind the brand-safety shield, never posted. */
export const REJECTED_VISUAL = { url: '/visuals/boabe-latte.jpg', label: 'The post Boabe will not make' }

/** What the "call" says while it runs, with the time each step takes (ms). */
export const FIREFLY_STEPS: readonly { label: string; ms: number }[] = [
  { label: 'Sending the visual prompt to Adobe Firefly…', ms: 900 },
  { label: 'Firefly is generating the image…', ms: 1600 },
  { label: 'Applying the Boabe look…', ms: 700 },
]

export const FIREFLY_TOTAL_MS = FIREFLY_STEPS.reduce((sum, step) => sum + step.ms, 0)

/** The step label to show `elapsedMs` after the click, or null once the call is done. */
export function fireflyStepAt(elapsedMs: number): string | null {
  let end = 0
  for (const step of FIREFLY_STEPS) {
    end += step.ms
    if (elapsedMs < end) return step.label
  }
  return null
}

/** Denoising steps shown in the progress label ("Firefly · step 12/30"). */
export const DENOISE_STEPS = 30

/** How the "diffusion" looks at one moment: noise layer opacity and the photo's CSS filter values. */
export interface DenoiseFrame {
  /** 1-based step, 1 … DENOISE_STEPS. */
  step: number
  /** 0 … 1 over the whole call. */
  progress: number
  /** Opacity of the colourful noise layer, 1 → 0. */
  noise: number
  blurPx: number
  saturate: number
  brightness: number
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

/**
 * The look `elapsedMs` into the call: pure noise while the prompt is "sent", the photo emerging
 * from the noise while Firefly "generates", and the last blur and colour cast settling while the
 * Boabe look is "applied". Ends exactly at the clean photo (no noise, no filter).
 */
export function denoiseAt(elapsedMs: number, totalMs = FIREFLY_TOTAL_MS): DenoiseFrame {
  const progress = totalMs > 0 ? clamp01(elapsedMs / totalMs) : 1
  const left = 1 - progress
  return {
    step: Math.max(1, Math.min(DENOISE_STEPS, Math.ceil(progress * DENOISE_STEPS))),
    progress,
    noise: 1 - smoothstep(0.2, 0.85, progress),
    blurPx: 26 * left * left,
    saturate: 1 + 1.4 * left ** 1.5,
    brightness: 1 + 0.35 * left * left,
  }
}

/** The CSS filter for a frame. */
export const denoiseFilter = (f: DenoiseFrame) =>
  `blur(${f.blurPx.toFixed(2)}px) saturate(${f.saturate.toFixed(3)}) brightness(${f.brightness.toFixed(3)})`
