// The hashtag bee flies a smooth curve that touches every chip, in order, from start to exit.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { flightPath, pollenBurst, stopOffset } from '../src/lib/pollinate.ts'

const stops = [
  { x: 0, y: 0 },
  { x: 100, y: 40 },
  { x: 220, y: 40 },
  { x: 300, y: -20 },
]

test('passes through every stop at its offset', () => {
  const path = flightPath(stops, 8)
  assert.equal(path.length, 3 * 8 + 1)
  stops.forEach((stop, i) => {
    const frame = path.find((f) => Math.abs(f.offset - stopOffset(i, stops.length)) < 1e-9)
    assert.ok(frame, `stop ${i} reached`)
    assert.ok(Math.abs(frame.x - stop.x) < 1e-6 && Math.abs(frame.y - stop.y) < 1e-6)
  })
})

test('offsets rise from 0 to 1 and tilt stays small', () => {
  const path = flightPath(stops)
  assert.equal(path[0].offset, 0)
  assert.equal(path.at(-1)?.offset, 1)
  path.slice(1).forEach((f, i) => assert.ok(f.offset > path[i].offset))
  assert.ok(path.every((f) => Math.abs(f.angle) <= 18))
})

test('degenerate inputs and pollen burst', () => {
  assert.deepEqual(flightPath([]), [])
  assert.deepEqual(flightPath([{ x: 5, y: 6 }]), [{ x: 5, y: 6, angle: 0, offset: 0 }])
  const dots = pollenBurst(4, 10)
  assert.deepEqual(dots[0], { x: 0, y: -10 })
  assert.equal(dots.length, 4)
})
