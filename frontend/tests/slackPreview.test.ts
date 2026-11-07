// The Slack preview mirrors backend/app/slack.py, and shows the post's image even when local.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Run } from '../src/api/types.ts'
import { buildSlackPreview, formatMinutes, taskLine } from '../src/lib/slackPreview.ts'

test('elapsed is rounded down, in seconds under a minute, like slack.format_elapsed', () => {
  assert.equal(formatMinutes(0), '0s')
  assert.equal(formatMinutes(4_900), '4s')
  assert.equal(formatMinutes(59_000), '59s')
  assert.equal(formatMinutes(4 * 60_000 + 59_000), '4m')
  assert.equal(formatMinutes(110 * 60_000), '1h 50m')
  assert.equal(formatMinutes(-5_000), '0s')
})

test('task lines collapse whitespace and default the owner', () => {
  assert.equal(taskLine({ owner: 'Legal', task: 'Sign off\nthe caption', due: 'today' }),
    'Legal: Sign off the caption (due: today)')
  assert.equal(taskLine({ owner: ' ', task: 'Check', due: '' }), 'Unassigned: Check')
})

const shippedRun = {
  started_at: '2026-11-07T09:00:00Z',
  shipped_at: '2026-11-07T09:04:30Z',
  draft: { caption: 'Grey week, warm corner.', image_url: 'data:image/svg+xml;base64,AA' },
  referee: { tasks: [{ owner: 'Product', task: 'Send the sugar docs', due: 'this week' }] },
} as unknown as Run

test('a shipped run builds the full preview', () => {
  assert.deepEqual(buildSlackPreview(shippedRun), {
    delivery: null, // run has no `slack` field: treated as not posted
    header: 'AdoBee: post approved',
    caption: 'Grey week, warm corner.',
    imageUrl: 'data:image/svg+xml;base64,AA', // the simulated preview shows the local image
    taskLines: ['Product: Send the sugar docs (due: this week)'],
    elapsed: '4m',
  })
  assert.equal(buildSlackPreview({ ...shippedRun, shipped_at: null }), null)
  assert.equal(buildSlackPreview({ ...shippedRun, slack: 'posted' })?.delivery, 'posted')
})
