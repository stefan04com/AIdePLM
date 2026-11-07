// The Trend score must read the same everywhere: levels, and "changed since" detection.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { levelOf, scoredKey, toRequest } from '../src/lib/trendScore.ts'

test('levels split at 45 and 70', () => {
  assert.equal(levelOf(0), 'low')
  assert.equal(levelOf(44), 'low')
  assert.equal(levelOf(45), 'medium')
  assert.equal(levelOf(69), 'medium')
  assert.equal(levelOf(70), 'high')
  assert.equal(levelOf(100), 'high')
})

test('the key changes when the caption or the hashtags change', () => {
  const draft = { caption: 'Grey Tuesday.', hashtags: ['#a', '#b'] }
  assert.equal(scoredKey(draft), scoredKey({ ...draft }))
  assert.equal(scoredKey(draft), scoredKey({ ...draft, caption: '  Grey Tuesday.  ' }))
  assert.notEqual(scoredKey(draft), scoredKey({ ...draft, caption: 'Other.' }))
  assert.notEqual(scoredKey(draft), scoredKey({ ...draft, hashtags: ['#a'] }))
})

test('the request sends the caption as words and the hashtags as they are', () => {
  assert.deepEqual(toRequest({ caption: 'Hi', hashtags: ['#a'] }), { words: 'Hi', hashtags: ['#a'] })
})
