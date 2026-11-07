// Cost per post must come from live calls only; cached demo calls cost nothing.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { CallUsage } from '../src/api/types.ts'
import { estimatePostCost, formatUsd } from '../src/lib/cost.ts'

const call = (name: string, model: string, cost: number, latency = 1000): CallUsage => ({
  call: name,
  model,
  input_tokens: 100,
  output_tokens: 50,
  latency_ms: latency,
  cost_usd: cost,
})

test('no live calls means no estimate (never a fake $0 per post)', () => {
  assert.equal(estimatePostCost([]), null)
  assert.equal(estimatePostCost([call('fit', 'demo-cache', 0), call('draft', 'demo-cache', 0)]), null)
})

test('per post = sum of the average live cost of each call type', () => {
  const estimate = estimatePostCost([
    call('fit', 'claude', 0.002, 1000),
    call('fit', 'claude', 0.004, 3000), // fit average: 0.003, 2000 ms
    call('referee', 'claude', 0.02, 5000),
    call('referee', 'demo-cache', 0, 0), // ignored
  ])
  assert.ok(estimate)
  assert.equal(estimate.liveCalls, 3)
  assert.ok(Math.abs(estimate.perPostUsd - 0.023) < 1e-9)
  assert.equal(estimate.perPostLatencyMs, 7000)
})

test('small amounts keep 4 decimals', () => {
  assert.equal(formatUsd(0), '$0')
  assert.equal(formatUsd(0.0042), '$0.0042')
  assert.equal(formatUsd(0.25), '$0.25')
  assert.equal(formatUsd(1.5), '$1.50')
})
