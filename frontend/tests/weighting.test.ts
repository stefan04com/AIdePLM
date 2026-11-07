// The reference table from docs/comment-weighting.md, checked against the mock's formula.
// Run with `npm test` (Node's built-in test runner, TypeScript types stripped by Node).

import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  COMMENT_HALF_LIFE_MS,
  type ExpertsFile,
  findVerifiedExpert,
  REVIEW_HALF_LIFE_MS,
  weight,
} from '../src/lib/weighting.ts'

const NOW = new Date('2026-11-07T12:00:00Z')
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const ago = (ms: number) => new Date(NOW.getTime() - ms)

const REFERENCE: [boolean, Date | null, number, number][] = [
  [true, NOW, COMMENT_HALF_LIFE_MS, 3.0],
  [false, NOW, COMMENT_HALF_LIFE_MS, 1.0],
  [true, ago(24 * HOUR), COMMENT_HALF_LIFE_MS, 1.5],
  [false, ago(48 * HOUR), COMMENT_HALF_LIFE_MS, 0.25],
  [false, ago(30 * DAY), COMMENT_HALF_LIFE_MS, 0.1],
  [true, ago(-HOUR), COMMENT_HALF_LIFE_MS, 3.0],
  [false, null, COMMENT_HALF_LIFE_MS, 0.5],
  [true, ago(730 * DAY), REVIEW_HALF_LIFE_MS, 0.75],
]

test('weights match the reference table', () => {
  for (const [verified, createdAt, halfLife, expected] of REFERENCE) {
    assert.equal(weight(verified, createdAt, NOW, halfLife), expected)
  }
})

const EXPERTS: ExpertsFile = {
  brand_industry: 'coffee',
  experts: [
    { name: 'Ioana Marin', title: 'Head barista', industry: 'coffee' },
    { name: 'Andrei Stan', title: 'Wine sommelier', industry: 'wine' },
  ],
}

test('only experts from the brand industry are verified', () => {
  assert.equal(findVerifiedExpert('Ioana Marin', EXPERTS)?.title, 'Head barista')
  assert.equal(findVerifiedExpert('  ioana   MARIN ', EXPERTS)?.title, 'Head barista')
  assert.equal(findVerifiedExpert('Andrei Stan', EXPERTS), null)
  assert.equal(findVerifiedExpert('Random Person', EXPERTS), null)
  assert.equal(findVerifiedExpert('', EXPERTS), null)
  assert.equal(findVerifiedExpert(null, EXPERTS), null)
})
