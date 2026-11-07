// Adobee must react to every step of a run with the right mood.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Run } from '../src/api/types.ts'
import { adobeeState } from '../src/lib/adobee.ts'

const run = (fields: Partial<Run>): Run =>
  ({ id: 'run_1', status: 'DRAFTED', step: null, comments: [], referee: null, fit: null, ...fields }) as Run

test('idle before a run, working while busy or while a step runs', () => {
  assert.equal(adobeeState(null, false).mood, 'idle')
  assert.equal(adobeeState(null, true).mood, 'working')
  assert.equal(adobeeState(run({ step: 'Writing the draft' }), false).message, 'Bzzz… Writing the draft')
})

test('curious while drafting and reviewing, counting comments', () => {
  assert.equal(adobeeState(run({ status: 'DRAFTED' }), false).mood, 'curious')
  const reviewed = run({ status: 'IN_REVIEW', comments: [{}, {}] as Run['comments'] })
  assert.match(adobeeState(reviewed, false).message, /^2 comments in/)
})

test('alert when the referee finds conflicts, happy when there are none', () => {
  const withConflict = run({ status: 'REFEREED', referee: { conflicts: [{}] } as Run['referee'] })
  assert.deepEqual(adobeeState(withConflict, false), {
    mood: 'alert',
    message: 'I found 1 conflict. Check the compromise, then apply.',
  })
  const clean = run({ status: 'REFEREED', referee: { conflicts: [] } as unknown as Run['referee'] })
  assert.equal(adobeeState(clean, false).mood, 'happy')
})

test('happy when shipped, sad with the fit reason when rejected', () => {
  assert.equal(adobeeState(run({ status: 'SHIPPED' }), false).mood, 'happy')
  const rejected = run({ status: 'REJECTED', fit: { fits: false, score: 9, reason: 'Health-risk dare.' } })
  assert.deepEqual(adobeeState(rejected, false), { mood: 'sad', message: 'Not our hive: Health-risk dare.' })
})
