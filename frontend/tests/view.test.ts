// The two menus: unknown values open Post, the arrow keys wrap around, and the page follows the run.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseView, stepView, viewForStatus, viewForStep, VIEWS } from '../src/lib/view.ts'

test('only "rules" opens the Rules page', () => {
  assert.equal(parseView('rules'), 'rules')
  for (const value of ['post', 'x', '', null]) assert.equal(parseView(value), 'post')
})

test('arrow keys wrap between the tabs', () => {
  assert.equal(VIEWS.length, 2)
  assert.equal(stepView('post', 1), 'rules')
  assert.equal(stepView('rules', 1), 'post')
  assert.equal(stepView('post', -1), 'rules')
})

test('review and referee happen on Rules; the trend, the draft and the shipped post on Post', () => {
  for (const status of ['IN_REVIEW', 'REFEREED'] as const) assert.equal(viewForStatus(status), 'rules')
  for (const status of ['SPOTTED', 'REJECTED', 'DRAFTED', 'SHIPPED'] as const) assert.equal(viewForStatus(status), 'post')
})

test('presenter steps open the page where they happen', () => {
  assert.equal(viewForStep('start'), 'post')
  for (const step of ['reactions', 'comments', 'referee', 'apply'] as const) assert.equal(viewForStep(step), 'rules')
})
