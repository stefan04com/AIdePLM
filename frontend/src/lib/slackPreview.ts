// What the Slack message looks like after "Apply all & ship". Mirrors build_blocks() in
// backend/app/slack.py, which posts it to a real webhook when SLACK_WEBHOOK_URL is set.
// No value imports, so `npm test` can run it in Node.

import type { Run, SlackDelivery, Task } from '../api/types'

export interface SlackPreview {
  /** What the backend did with the message; null on runs from before this field. */
  delivery: SlackDelivery | null
  header: string
  caption: string
  /** The post's image. The preview shows the local placeholder too; with a real Firefly
   *  integration it would be a public https URL, which Slack accepts. */
  imageUrl: string | null
  taskLines: string[]
  elapsed: string
}

/** Same as slack.format_elapsed: "1h 50m", "45m", or "4s" under a minute (rounded down). */
export function formatMinutes(ms: number): string {
  const safe = Math.max(0, ms)
  if (safe < 60_000) return `${Math.floor(safe / 1000)}s`
  const totalMinutes = Math.floor(safe / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
}

const oneLine = (text: string) => text.split(/\s+/).filter(Boolean).join(' ')

/** Same as slack._task_line, without Slack's *bold* markers (the UI bolds the owner). */
export function taskLine(task: Task): string {
  const owner = oneLine(task.owner) || 'Unassigned'
  const due = oneLine(task.due)
  return `${owner}: ${oneLine(task.task)}${due ? ` (due: ${due})` : ''}`
}

/** The preview for a shipped run, or null if it hasn't shipped. */
export function buildSlackPreview(run: Run): SlackPreview | null {
  if (!run.shipped_at || !run.draft) return null
  return {
    delivery: run.slack ?? null,
    header: 'Moment: post approved',
    caption: run.draft.caption,
    imageUrl: run.draft.image_url || null,
    taskLines: (run.referee?.tasks ?? []).map(taskLine),
    elapsed: formatMinutes(Date.parse(run.shipped_at) - Date.parse(run.started_at)),
  }
}
