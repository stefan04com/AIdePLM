// The Regenerate button must follow the backend's limits and the history must not repeat itself.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  checkRegenerate,
  MAX_CAPTION,
  MAX_INSTRUCTION,
  pushHistory,
} from '../src/lib/regenerate.ts'

test('regenerate needs a caption and an instruction within the limits', () => {
  assert.equal(checkRegenerate('A caption', 'shorter').ok, true)
  assert.equal(checkRegenerate('  ', 'shorter').ok, false)
  assert.equal(checkRegenerate('A caption', '  ').ok, false)
  assert.equal(checkRegenerate('x'.repeat(MAX_CAPTION + 1), 'shorter').ok, false)
  assert.equal(checkRegenerate('A caption', 'x'.repeat(MAX_INSTRUCTION + 1)).ok, false)
  assert.ok(checkRegenerate('', 'shorter').reason.length > 0)
})

test('history keeps the newest first and never repeats a version', () => {
  let history = pushHistory([], 'first', 'second')
  assert.deepEqual(history, ['first'])
  history = pushHistory(history, 'second', 'third')
  assert.deepEqual(history, ['second', 'first'])
  assert.deepEqual(pushHistory(history, 'first', 'third'), ['second', 'first'])
  assert.deepEqual(pushHistory(history, 'third', 'third'), ['second', 'first'])
  assert.deepEqual(pushHistory(history, '  ', 'third'), ['second', 'first'])
})
