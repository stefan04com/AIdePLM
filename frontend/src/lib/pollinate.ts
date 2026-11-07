// The bee that "pollinates" hashtag suggestions: a smooth curved flight through chip centres.
// Pure, so it is tested in Node (tests/pollinate.test.ts).

export interface Point {
  x: number
  y: number
}

/** One sample of the flight: where the bee is, how it is tilted (deg) and when (0 … 1). */
export interface FlightFrame extends Point {
  angle: number
  offset: number
}

/** Catmull-Rom point between p1 and p2 at t (0 … 1). */
function catmullRom(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const t2 = t * t
  const t3 = t2 * t
  const f = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
  return { x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) }
}

/**
 * A curved path through `stops` (start → each chip → exit), with a little up/down bob between
 * stops so it reads as flying. `perLeg` samples per leg. Offsets are evenly spaced per leg, so the
 * bee reaches stop i at offset i / (stops.length - 1).
 */
export function flightPath(stops: readonly Point[], perLeg = 8, bob = 14): FlightFrame[] {
  if (stops.length === 0) return []
  if (stops.length === 1) return [{ ...stops[0], angle: 0, offset: 0 }]
  const legs = stops.length - 1
  const at = (i: number) => stops[Math.min(Math.max(i, 0), legs)]
  const points: (Point & { offset: number })[] = []
  for (let leg = 0; leg < legs; leg++) {
    for (let s = 0; s < perLeg; s++) {
      const t = s / perLeg
      const p = catmullRom(at(leg - 1), at(leg), at(leg + 1), at(leg + 2), t)
      // arc upward mid-leg (sin is 0 at the stops, so the bee still touches every chip)
      points.push({ x: p.x, y: p.y - bob * Math.sin(Math.PI * t), offset: (leg + t) / legs })
    }
  }
  points.push({ ...at(legs), offset: 1 })
  return points.map((p, i) => {
    const next = points[Math.min(i + 1, points.length - 1)]
    const prev = points[Math.max(i - 1, 0)]
    const dx = next.x - prev.x
    // lean into the direction of travel, at most ±18°
    const angle = Math.max(-18, Math.min(18, dx * 0.6))
    return { x: p.x, y: p.y, angle: Number.isFinite(angle) ? angle : 0, offset: p.offset }
  })
}

/** The offset (0 … 1) at which the bee reaches stop `index` of `count` stops. */
export const stopOffset = (index: number, count: number) => (count <= 1 ? 0 : index / (count - 1))

/** Pollen dot directions for a burst: `n` evenly spread unit vectors scaled to `radius` px. */
export function pollenBurst(n: number, radius: number): Point[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2
    return { x: Math.round(Math.cos(a) * radius), y: Math.round(Math.sin(a) * radius) }
  })
}
