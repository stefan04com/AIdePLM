// The two menus: unknown values open Post, and the arrow keys wrap around.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseView, stepView, VIEWS } from '../src/lib/view.ts'

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
