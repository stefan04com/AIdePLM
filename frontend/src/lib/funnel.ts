// Referee funnel: which review voices fly into the Referee while it thinks, and when each conflict
// card emerges once it answers. Pure logic, so `npm test` can run it in Node.

import type { Comment, PersonaReaction } from '../api/types'
import { ROLE_LABEL } from './labels'

export interface FunnelChip {
  key: string
  label: string
  /** Humans fly in from the left, synthetic customers from the right. */
  kind: 'human' | 'persona'
  /** Start delay in ms inside one loop, so the chips arrive as a steady stream. */
  delayMs: number
}

/** One loop of every chip flying into the hive (the call itself takes ~10-22 s live). */
export const FUNNEL_LOOP_MS = 1400
/** Most chips per side, so the stream stays readable. */
export const FUNNEL_MAX_PER_SIDE = 4
/** Gap between two conflict cards emerging from the hive. */
export const EMERGE_STAGGER_MS = 180
/** The last card starts emerging no later than this. */
export const EMERGE_MAX_DELAY_MS = 900
/** How long the funnel stays to show "resolved" before it hands over to the conflict cards. */
export const FUNNEL_RESOLVE_MS = 900

/** "coffee_purist" → "Coffee purist". */
export function personaLabel(personaId: string): string {
  const words = personaId.replace(/[_-]+/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** One chip per human role (Brand, Legal, Product) and per persona reaction, interleaved in time. */
export function funnelChips(comments: Comment[], reactions: PersonaReaction[]): FunnelChip[] {
  const roles = [...new Set(comments.map((c) => c.role))].slice(0, FUNNEL_MAX_PER_SIDE)
  const humans = roles.map((role) => ({ key: `h-${role}`, label: ROLE_LABEL[role], kind: 'human' as const }))
  const personas = [...new Set(reactions.map((r) => r.persona_id))]
    .slice(0, FUNNEL_MAX_PER_SIDE)
    .map((id) => ({ key: `p-${id}`, label: personaLabel(id), kind: 'persona' as const }))

  const mixed: Omit<FunnelChip, 'delayMs'>[] = []
  for (let i = 0; i < Math.max(humans.length, personas.length); i++) {
    if (humans[i]) mixed.push(humans[i])
    if (personas[i]) mixed.push(personas[i])
  }
  const step = mixed.length > 0 ? FUNNEL_LOOP_MS / mixed.length : 0
  return mixed.map((chip, i) => ({ ...chip, delayMs: Math.round(i * step) }))
}

/** "Weighing 3 human comments + 3 customer reactions together". */
export function funnelCaption(comments: number, reactions: number): string {
  const humans = `${comments} human comment${comments === 1 ? '' : 's'}`
  const personas = `${reactions} customer reaction${reactions === 1 ? '' : 's'}`
  return `Weighing ${humans} + ${personas} together`
}

/** When the n-th conflict card starts emerging from the hive, in ms. */
export function emergeDelay(index: number): number {
  return Math.min(Math.max(0, index) * EMERGE_STAGGER_MS, EMERGE_MAX_DELAY_MS)
}
