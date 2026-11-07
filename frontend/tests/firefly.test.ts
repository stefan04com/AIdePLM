// The Firefly mock must show step labels in order, then finish, and offer exactly two photos.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FIREFLY_STEPS, FIREFLY_TOTAL_MS, FIREFLY_VARIANTS, fireflyStepAt, fireflyVariant } from '../src/lib/firefly.ts'

test('two variations, both with a file path and a label', () => {
  assert.equal(FIREFLY_VARIANTS.length, 2)
  for (const v of FIREFLY_VARIANTS) assert.ok(v.url.startsWith('/visuals/') && v.label)
})

test('step labels follow the steps and end at the total time', () => {
  assert.equal(fireflyStepAt(0), FIREFLY_STEPS[0].label)
  assert.equal(fireflyStepAt(FIREFLY_STEPS[0].ms), FIREFLY_STEPS[1].label)
  assert.equal(fireflyStepAt(FIREFLY_TOTAL_MS - 1), FIREFLY_STEPS[2].label)
  assert.equal(fireflyStepAt(FIREFLY_TOTAL_MS), null)
})

test('unknown variation id gives null', () => {
  assert.equal(fireflyVariant('a')?.id, 'a')
  assert.equal(fireflyVariant('zzz'), null)
  assert.equal(fireflyVariant(null), null)
})
