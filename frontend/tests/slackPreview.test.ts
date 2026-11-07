// The Slack preview must show what backend/app/slack.py would post.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Run } from '../src/api/types.ts'
import { buildSlackPreview, formatMinutes, isWebUrl, taskLine } from '../src/lib/slackPreview.ts'

test('elapsed is rounded down to the minute, like slack.format_elapsed', () => {
  assert.equal(formatMinutes(0), '0m')
  assert.equal(formatMinutes(59_000), '0m')
  assert.equal(formatMinutes(4 * 60_000 + 59_000), '4m')
  assert.equal(formatMinutes(110 * 60_000), '1h 50m')
  assert.equal(formatMinutes(-5_000), '0m')
})

test('only public http(s) images reach Slack', () => {
  assert.equal(isWebUrl('https://example.com/a.png'), true)
  assert.equal(isWebUrl('http://example.com/a.png'), true)
  assert.equal(isWebUrl('data:image/svg+xml;base64,AAAA'), false)
  assert.equal(isWebUrl('https://exa mple.com/a.png'), false)
  assert.equal(isWebUrl(null), false)
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
    header: 'Moment: post approved',
    caption: 'Grey week, warm corner.',
    imageUrl: null,
    taskLines: ['Product: Send the sugar docs (due: this week)'],
    elapsed: '4m',
  })
  assert.equal(buildSlackPreview({ ...shippedRun, shipped_at: null }), null)
})
