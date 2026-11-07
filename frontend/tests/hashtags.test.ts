// Hashtag helpers: keywords from the caption, adding and removing without duplicates, and the cap.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addBlocker, addTag, extractKeywords, hasTag, removeTag } from '../src/lib/hashtags.ts'

test('keywords are lower case, unique, without stop words or short words', () => {
  const words = extractKeywords('Grey Tuesday, one corner. The Pumpkin & Cinnamon Latte, the latte! #CozySetup')
  assert.ok(words.includes('pumpkin') && words.includes('cinnamon') && words.includes('latte'))
  assert.equal(words.filter((w) => w === 'latte').length, 1)
  assert.ok(!words.includes('the') && !words.includes('one'))
  assert.equal(extractKeywords('a b c').length, 0)
})

test('add and remove ignore case and never duplicate', () => {
  assert.deepEqual(addTag(['#A'], '#b'), ['#A', '#b'])
  assert.deepEqual(addTag(['#A'], '#a'), ['#A'])
  assert.deepEqual(removeTag(['#A', '#b'], '#a'), ['#b'])
  assert.equal(hasTag(['#Cozy'], '#cozy'), true)
})

test('a suggestion is blocked when already used or when the platform cap is reached', () => {
  assert.equal(addBlocker(['#a'], '#A', 5), 'Already in the post')
  assert.match(addBlocker(['#a', '#b'], '#c', 2), /allows 2/)
  assert.equal(addBlocker(['#a'], '#c', 5), '')
  assert.equal(addBlocker(['#a', '#b', '#c'], '#d', 0), '') // cap 0 = unknown, never block
})
