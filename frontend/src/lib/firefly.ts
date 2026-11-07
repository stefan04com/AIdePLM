// Adobe Firefly mock: pressing "Generate with Firefly" looks like a Firefly call and offers two
// variations. Nothing is sent to Adobe; the two photos are files we ship (see public/visuals/CREDITS.md).
// A real integration would replace `generate()` in hooks/useFirefly.ts and keep the same shapes.
// No value imports, so `npm test` can run it in Node.

export interface FireflyVariant {
  id: string
  url: string
  label: string
}

/** The two "generated" images. */
export const FIREFLY_VARIANTS: readonly FireflyVariant[] = [
  { id: 'a', url: '/visuals/boabe-pumpkin-latte.jpg', label: 'Variation A: pumpkin mug on wood' },
  { id: 'b', url: '/visuals/boabe-pumpkin-latte-revised.jpg', label: 'Variation B: autumn table' },
]

/** What the "call" says while it runs, with the time each step takes (ms). */
export const FIREFLY_STEPS: readonly { label: string; ms: number }[] = [
  { label: 'Sending the visual prompt to Adobe Firefly…', ms: 900 },
  { label: 'Firefly is generating 2 variations…', ms: 1600 },
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

/** Variant by id, or null for an unknown id. */
export const fireflyVariant = (id: string | null): FireflyVariant | null =>
  FIREFLY_VARIANTS.find((variant) => variant.id === id) ?? null
