// The referee funnel shows every review voice (humans and synthetic customers) flying in together.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Comment, PersonaReaction } from '../src/api/types.ts'
import {
  EMERGE_MAX_DELAY_MS,
  EMERGE_STAGGER_MS,
  FUNNEL_LOOP_MS,
  emergeDelay,
  funnelCaption,
  funnelChips,
  personaLabel,
} from '../src/lib/funnel.ts'

const comment = (id: string, role: Comment['role']): Comment => ({
  id,
  role,
  text: 'x',
  created_at: '2026-11-07T12:00:00Z',
  author: null,
  author_title: null,
  industry_verified: false,
  weight: 1,
})

const reaction = (persona_id: string): PersonaReaction => ({
  persona_id,
  reaction: 'y',
  sentiment: 0,
  would_engage: true,
})

test('one chip per human role and per persona, humans and customers interleaved', () => {
  const chips = funnelChips(
    [comment('1', 'brand'), comment('2', 'legal'), comment('3', 'brand'), comment('4', 'product')],
    [reaction('coffee_purist'), reaction('busy_parent')],
  )
  assert.deepEqual(
    chips.map((c) => c.label),
    ['Brand', 'Coffee purist', 'Legal', 'Busy parent', 'Product'],
  )
  assert.deepEqual(
    chips.map((c) => c.kind),
    ['human', 'persona', 'human', 'persona', 'human'],
  )
})

test('chip delays spread evenly over one loop', () => {
  const chips = funnelChips([comment('1', 'brand')], [reaction('a')])
  assert.deepEqual(
    chips.map((c) => c.delayMs),
    [0, FUNNEL_LOOP_MS / 2],
  )
  assert.deepEqual(funnelChips([], []), [])
})

test('persona ids read as names', () => {
  assert.equal(personaLabel('student_night_owl'), 'Student night owl')
})

test('caption names both sides', () => {
  assert.equal(funnelCaption(3, 1), 'Weighing 3 human comments + 1 customer reaction together')
})

test('conflict cards emerge staggered, capped', () => {
  assert.equal(emergeDelay(0), 0)
  assert.equal(emergeDelay(2), 2 * EMERGE_STAGGER_MS)
  assert.equal(emergeDelay(99), EMERGE_MAX_DELAY_MS)
})
