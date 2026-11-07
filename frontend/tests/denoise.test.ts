// The Firefly "denoise reveal": starts as pure noise, steps 1 → 30, ends on the clean photo.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DENOISE_STEPS, denoiseAt, denoiseFilter, FIREFLY_TOTAL_MS } from '../src/lib/firefly.ts'

test('starts as heavy noise at step 1', () => {
  const f = denoiseAt(0)
  assert.equal(f.step, 1)
  assert.equal(f.noise, 1)
  assert.ok(f.blurPx > 20 && f.saturate > 2 && f.brightness > 1.3)
})

test('ends on the clean photo at the last step', () => {
  for (const ms of [FIREFLY_TOTAL_MS, FIREFLY_TOTAL_MS + 500]) {
    const f = denoiseAt(ms)
    assert.equal(f.step, DENOISE_STEPS)
    assert.deepEqual([f.noise, f.blurPx, f.saturate, f.brightness, f.progress], [0, 0, 1, 1, 1])
  }
  assert.equal(denoiseFilter(denoiseAt(FIREFLY_TOTAL_MS)), 'blur(0.00px) saturate(1.000) brightness(1.000)')
})

test('noise, blur and step move monotonically', () => {
  let prev = denoiseAt(0)
  for (let ms = 50; ms <= FIREFLY_TOTAL_MS; ms += 50) {
    const f = denoiseAt(ms)
    assert.ok(f.step >= prev.step && f.noise <= prev.noise && f.blurPx <= prev.blurPx)
    prev = f
  }
  assert.equal(denoiseAt(FIREFLY_TOTAL_MS * 0.4).step, 12)
})
