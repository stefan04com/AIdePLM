// The radar must place the real trends the same way every time, and label the data honestly.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { placeBlips, shortTitle, snapshotLabel, SWEEP_MS } from '../src/lib/radar.ts'

const IDS = [
  'live_small_luxuries',
  'live_winter_arc',
  'live_christmas_countdown',
  'live_thought_this_morning',
  'live_105_dollar_coffee',
  'live_fibermaxxing',
]

test('blip placement is deterministic and ignores input order', () => {
  const a = placeBlips(IDS)
  const b = placeBlips([...IDS].reverse())
  assert.deepEqual(a, b)
  assert.equal(a.length, 6)
  assert.deepEqual(placeBlips([...IDS, IDS[0]]).length, 6) // duplicates collapse
  assert.deepEqual(placeBlips([]), [])
})

test('blips stay inside the scope, apart, and light up during the sweep', () => {
  const blips = placeBlips(IDS)
  for (const blip of blips) {
    assert.ok(blip.radius >= 0.4 && blip.radius <= 0.85)
    assert.ok(Math.hypot(blip.x, blip.y) <= 0.85 + 1e-9)
    assert.ok(blip.angle >= 0 && blip.angle < 360)
    assert.ok(blip.delayMs >= 0 && blip.delayMs <= SWEEP_MS)
  }
  const angles = blips.map((blip) => blip.angle).sort((x, y) => x - y)
  for (let i = 1; i < angles.length; i++) assert.ok(angles[i] - angles[i - 1] >= 30)
})

test('short titles keep the trend name', () => {
  assert.equal(shortTitle('"Winter Arc": young Romanians start now'), 'Winter Arc')
  assert.equal(shortTitle('"Fibermaxxing": people track fibre'), 'Fibermaxxing')
  assert.equal(shortTitle('Early Christmas countdowns with cosy clips'), 'Early Christmas countdowns with…')
  assert.ok(shortTitle('A $105 cup of coffee in San Francisco loses a blind test').length <= 33)
})

test('snapshot label says saved and when', () => {
  assert.equal(snapshotLabel('saved', '2026-11-07'), 'saved snapshot, collected 7 Nov 2026')
  assert.equal(snapshotLabel('live', '2026-11-07T10:00:00Z'), 'live scan, collected 7 Nov 2026')
  assert.equal(snapshotLabel(null, null), 'saved snapshot')
})
