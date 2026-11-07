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
