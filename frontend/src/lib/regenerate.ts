// Rules for the "Edit and regenerate" card. Pure, so they are tested. The backend allows a rewrite
// while the run is DRAFTED, IN_REVIEW or REFEREED (orchestrator.EDITABLE) and limits the lengths.

export const MAX_CAPTION = 2200
export const MAX_INSTRUCTION = 500

export const SUGGESTED_INSTRUCTIONS = [
  'Make it shorter',
  'Warmer and more playful',
  'Softer call to action',
]

export interface RegenerateCheck {
  ok: boolean
  /** Why the button is disabled; empty when ok. */
  reason: string
}

export function checkRegenerate(caption: string, instruction: string): RegenerateCheck {
  if (!caption.trim()) return { ok: false, reason: 'The caption is empty' }
  if (caption.length > MAX_CAPTION) {
    return { ok: false, reason: `The caption is over ${MAX_CAPTION} characters` }
  }
  if (!instruction.trim()) return { ok: false, reason: 'Tell the AI what to change' }
  if (instruction.length > MAX_INSTRUCTION) {
    return { ok: false, reason: `The instruction is over ${MAX_INSTRUCTION} characters` }
  }
  return { ok: true, reason: '' }
}

/** Earlier captions, newest first, without repeating the current one or an earlier entry. */
export function pushHistory(
  history: readonly string[],
  previous: string,
  current: string,
): string[] {
  const text = previous.trim()
  if (!text || text === current.trim() || history.includes(text)) return [...history]
  return [text, ...history]
}
