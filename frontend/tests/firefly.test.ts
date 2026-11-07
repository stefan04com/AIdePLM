// The Firefly mock must show step labels in order, then finish, with one generated photo; the
// rejected trend has its own photo that never becomes a post.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FIREFLY_IMAGE, FIREFLY_STEPS, FIREFLY_TOTAL_MS, fireflyStepAt, REJECTED_VISUAL } from '../src/lib/firefly.ts'

test('one generated photo, different from the rejected-trend photo', () => {
  for (const image of [FIREFLY_IMAGE, REJECTED_VISUAL]) assert.ok(image.url.startsWith('/visuals/') && image.label)
  assert.notEqual(FIREFLY_IMAGE.url, REJECTED_VISUAL.url)
})

test('step labels follow the steps and end at the total time', () => {
  assert.equal(fireflyStepAt(0), FIREFLY_STEPS[0].label)
  assert.equal(fireflyStepAt(FIREFLY_STEPS[0].ms), FIREFLY_STEPS[1].label)
  assert.equal(fireflyStepAt(FIREFLY_TOTAL_MS - 1), FIREFLY_STEPS[2].label)
  assert.equal(fireflyStepAt(FIREFLY_TOTAL_MS), null)
})
