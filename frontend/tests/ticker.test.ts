// Live cost ticker: real per-call cost on each coin, cached calls cost $0, hours saved is labelled.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { CallUsage } from '../src/api/types.ts'
import {
  ASSUMPTION_TEXT,
  REVIEW_HOURS_PER_POST,
  coinFor,
  countUpValue,
  formatTicker,
  hoursSaved,
} from '../src/lib/ticker.ts'

const call = (name: string, model: string, cost: number): CallUsage => ({
  call: name,
  model,
  input_tokens: 100,
  output_tokens: 50,
  latency_ms: 1000,
  cost_usd: cost,
})

test('a live call shows its real cost and name', () => {
  assert.deepEqual(coinFor(call('fit', 'eu.anthropic.claude-sonnet-4-6', 0.0123)), {
    amount: '+$0.012',
    label: 'fit',
    cached: false,
  })
})

test('a tiny live cost never rounds to zero', () => {
  assert.equal(coinFor(call('fit', 'm', 0.0004)).amount, '+$0.0004')
})

test('a demo-cache call is "+$0.000 · cached"', () => {
  const coin = coinFor(call('referee', 'demo-cache', 0))
  assert.equal(`${coin.amount} · ${coin.label}`, '+$0.000 · cached')
  assert.equal(coin.cached, true)
})

test('hours saved counts refereed posts with the stated assumption', () => {
  const calls = [call('fit', 'm', 0.01), call('referee', 'm', 0.03), call('referee', 'demo-cache', 0)]
  assert.equal(hoursSaved(calls), 2 * REVIEW_HOURS_PER_POST)
  assert.equal(REVIEW_HOURS_PER_POST, 8)
  assert.match(ASSUMPTION_TEXT, /^Assumption:/)
  assert.match(ASSUMPTION_TEXT, /8 days/)
})

test('count-up eases from start to target and clamps', () => {
  assert.equal(countUpValue(0, 10, 0), 0)
  assert.equal(countUpValue(0, 10, 1), 10)
  assert.equal(countUpValue(0, 10, 2), 10)
  const mid = countUpValue(0, 10, 0.5)
  assert.ok(mid > 5 && mid < 10, 'ease-out is past halfway at half time')
})

test('ticker total keeps four decimals under $1', () => {
  assert.equal(formatTicker(0.0602), '$0.0602')
  assert.equal(formatTicker(0), '$0.0000')
  assert.equal(formatTicker(1.5), '$1.50')
})
