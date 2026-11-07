// The heatmap must glow exactly where the saved report windows are, and pick one honest best slot.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import type { PostingWindows } from '../src/api/types.ts'
import {
  HOURS,
  WEEK,
  bestSlot,
  dayGlow,
  heatGrid,
  inWindow,
  slotLabel,
  sourceShort,
} from '../src/lib/postingHeatmap.ts'

const instagram: PostingWindows = {
  platform: 'instagram',
  best_days: ['wednesday', 'tuesday', 'thursday'],
  windows: [
    { days: ['tuesday', 'wednesday'], start: '12:00', end: '19:00' },
    { days: ['thursday'], start: '12:00', end: '14:00' },
  ],
  reason: 'r',
  confidence: 'medium',
  sources: [{ name: 'Sprout Social, Best times 2026', url: 'https://example.com' }],
}

test('cells glow only inside the windows (end is exclusive)', () => {
  assert.equal(inWindow(instagram, 'tuesday', 12), true)
  assert.equal(inWindow(instagram, 'tuesday', 18), true)
  assert.equal(inWindow(instagram, 'tuesday', 19), false)
  assert.equal(inWindow(instagram, 'tuesday', 11), false)
  assert.equal(inWindow(instagram, 'thursday', 14), false)
  assert.equal(inWindow(instagram, 'monday', 12), false)
})

test('half-hour windows still light the overlapping hour', () => {
  const half = { ...instagram, windows: [{ days: ['monday' as const], start: '08:30', end: '09:15' }] }
  assert.equal(inWindow(half, 'monday', 8), true)
  assert.equal(inWindow(half, 'monday', 9), true)
  assert.equal(inWindow(half, 'monday', 10), false)
})

test('the grid is 7 days by 18 hours and the best day glows brightest', () => {
  const grid = heatGrid(instagram)
  assert.equal(grid.length, 7)
  assert.equal(grid[0].length, HOURS.length)
  assert.equal(HOURS.length, 18)
  const at = (day: (typeof WEEK)[number], hour: number) => grid[WEEK.indexOf(day)][HOURS.indexOf(hour)]
  assert.equal(at('wednesday', 13), 1)
  assert.ok(at('tuesday', 13) < at('wednesday', 13))
  assert.ok(at('thursday', 13) < at('tuesday', 13))
  assert.equal(at('saturday', 13), 0)
  assert.equal(dayGlow(instagram, 'friday'), 0.45)
})

test('best slot is the strongest best day at its window start', () => {
  const slot = bestSlot(instagram)
  assert.deepEqual(slot, { day: 'wednesday', hour: 12 })
  assert.equal(slotLabel(slot!), 'Wed 12:00')
  assert.equal(bestSlot({ ...instagram, windows: [] }), null)
})

test('every platform in the saved data has a best slot on the grid', () => {
  const file = JSON.parse(readFileSync(new URL('../../data/posting_windows.json', import.meta.url), 'utf8'))
  for (const platform of file.platforms as PostingWindows[]) {
    const slot = bestSlot(platform)
    assert.ok(slot, platform.platform)
    assert.ok(HOURS.includes(slot.hour), `${platform.platform} ${slot.hour}`)
    const grid = heatGrid(platform)
    assert.ok(grid[WEEK.indexOf(slot.day)][HOURS.indexOf(slot.hour)] > 0, platform.platform)
  }
  assert.equal(sourceShort('Sprout Social, Best times 2026'), 'Sprout Social')
})
