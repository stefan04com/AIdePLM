// Trend radar: where each collected trend sits on the scope, when the sweep reaches it, and the
// honest snapshot label. Pure, so the placement is the same on every laptop and in tests.

/** One full turn of the sweep; blips light up as the beam passes them. */
export const SWEEP_MS = 1000
/** The current trend's blip locks on after the sweep, then the trend card zooms out of it. */
export const LOCK_MS = 260
export const ZOOM_MS = 320

const MIN_RADIUS = 0.4
const MAX_RADIUS = 0.85

export interface Blip {
  id: string
  /** Degrees clockwise from 12 o'clock, 0 ≤ angle < 360. */
  angle: number
  /** Share of the scope's radius, MIN_RADIUS..MAX_RADIUS. */
  radius: number
  /** Position on a unit circle, y pointing down (SVG). */
  x: number
  y: number
  /** When the sweep beam passes this blip. */
  delayMs: number
}

/** FNV-1a, 32-bit: a small stable hash so a trend id always lands on the same spot. */
export function hashId(id: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** Spreads the trends around the scope: one angle slot each (with a little jitter), stable radius. */
export function placeBlips(ids: string[]): Blip[] {
  const unique = [...new Set(ids)].sort((a, b) => hashId(a) - hashId(b) || a.localeCompare(b))
  const slot = 360 / Math.max(unique.length, 1)
  return unique.map((id, i) => {
    const hash = hashId(id)
    const jitter = ((hash % 1000) / 1000 - 0.5) * 0.5 // ±0.25 of a slot
    const angle = (((i + 0.5 + jitter) * slot) % 360 + 360) % 360
    const radius = MIN_RADIUS + (((hash >>> 10) % 1000) / 1000) * (MAX_RADIUS - MIN_RADIUS)
    const rad = (angle * Math.PI) / 180
    return {
      id,
      angle,
      radius,
      x: Math.sin(rad) * radius,
      y: -Math.cos(rad) * radius,
      delayMs: Math.round((angle / 360) * SWEEP_MS),
    }
  })
}

/** The short label shown on hover: the quoted name or the part before a colon, max ~32 chars. */
export function shortTitle(title: string, max = 32): string {
  const quoted = title.match(/^["“]([^"”]+)["”]/)
  const base = (quoted ? quoted[1] : title.split(':')[0]).trim()
  if (base.length <= max) return base
  const cut = base.slice(0, max)
  const space = cut.lastIndexOf(' ')
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,.;-]+$/, '')}…`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "saved snapshot, collected 7 Nov 2026" — never claims to be live when it is not. */
export function snapshotLabel(source: 'saved' | 'live' | null, collectedAt: string | null): string {
  const kind = source === 'live' ? 'live scan' : 'saved snapshot'
  const match = collectedAt?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return kind
  const [, year, month, day] = match
  return `${kind}, collected ${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`
}
