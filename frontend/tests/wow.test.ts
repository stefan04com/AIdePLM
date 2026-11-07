// The numbers on screen must be right: speed-up vs an 8-day review, trend life, presenter steps.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Run } from '../src/api/types.ts'
import { formatLife, nextStep, speedup, trendLifeLeft } from '../src/lib/wow.ts'

const run = (fields: Partial<Run>): Run =>
  ({ status: 'DRAFTED', step: null, reactions: [], comments: [], ...fields }) as Run

test('speed-up compares with an eight-day review', () => {
  assert.equal(speedup('2026-11-07T10:00:00Z', '2026-11-07T10:00:22Z'), 31418)
  assert.equal(speedup('2026-11-07T10:00:00Z', '2026-11-07T10:00:00Z'), 691200) // floor of 1 s
})

test('trend life counts down from 11.9 hours', () => {
  const detected = '2026-11-07T08:00:00Z'
  assert.equal(formatLife(trendLifeLeft(detected, Date.parse('2026-11-07T10:00:00Z'))), '9h 54m')
  assert.equal(formatLife(trendLifeLeft(detected, Date.parse('2026-11-08T08:00:00Z'))), 'past its peak')
})

test('the presenter key walks the demo in order', () => {
  assert.equal(nextStep(null), 'start')
  assert.equal(nextStep(run({ status: 'DRAFTED' })), 'reactions')
  assert.equal(nextStep(run({ reactions: [{}] as Run['reactions'] })), 'comments')
  const reviewed = run({ status: 'IN_REVIEW', reactions: [{}] as Run['reactions'], comments: [{}, {}, {}] as Run['comments'] })
  assert.equal(nextStep(reviewed), 'referee')
  assert.equal(nextStep(run({ status: 'REFEREED' })), 'apply')
  assert.equal(nextStep(run({ status: 'SHIPPED' })), 'start')
  assert.equal(nextStep(run({ step: 'Writing the draft' })), null)
})
