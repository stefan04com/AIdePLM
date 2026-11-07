// The Analysis panel must only show real data: "—" until each factor has it.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Run } from '../src/api/types.ts'
import { computeFactors } from '../src/lib/factors.ts'

const NOW = Date.parse('2026-11-07T09:04:00Z')
const byLabel = (run: Run | null, cost: number | null = null) =>
  Object.fromEntries(computeFactors(run, cost, NOW).map((f) => [f.label, f]))

test('before a run every factor is empty', () => {
  for (const factor of computeFactors(null, null, NOW)) {
    assert.equal(factor.value, '—')
    assert.equal(factor.level, null)
  }
})

const run = {
  started_at: '2026-11-07T09:00:00Z',
  shipped_at: null,
  fit: { fits: true, score: 88, reason: 'x' },
  reactions: [
    { persona_id: 'a', reaction: '', sentiment: 0.8, would_engage: true },
    { persona_id: 'b', reaction: '', sentiment: -0.1, would_engage: false },
    { persona_id: 'c', reaction: '', sentiment: 0.8, would_engage: true },
  ],
  comments: [
    { id: 'c1', role: 'product', industry_verified: true, weight: 3 },
    { id: 'c2', role: 'legal', industry_verified: false, weight: 1 },
  ],
  referee: {
    conflicts: [{ id: 'conf_1' }, { id: 'conf_2' }],
    comment_status: [
      { comment_id: 'c1', status: 'in_conflict' },
      { comment_id: 'c2', status: 'applied' },
    ],
  },
} as unknown as Run

test('factors come from the run data', () => {
  const f = byLabel(run, 0.0566)
  assert.equal(f['Brand fit'].value, '88/100')
  assert.equal(f['Brand fit'].level, 0.88)
  assert.equal(f['Audience'].value, '+0.5')
  assert.equal(f['Audience'].detail, '2/3 would engage')
  assert.equal(f['Expert voices'].value, '1/2 verified')
  assert.equal(f['Expert voices'].detail, '75% of the comment weight')
  assert.equal(f['Conflicts'].value, '2')
  assert.equal(f['Conflicts'].detail, '1 applied · 1 in conflict · 0 rejected')
  assert.equal(f['Time to approval'].value, '4m 0s')
  assert.equal(f['Cost per post'].value, '$0.0566')
})

test('cost falls back to the live-eval measurement in demo mode', () => {
  const f = byLabel(run)['Cost per post']
  assert.equal(f.value, '$0.0602')
  assert.equal(f.detail, 'measured in live eval')
})
