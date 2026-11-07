// What the Slack message looks like after "Apply compromise". Mirrors build_blocks() in
// backend/app/slack.py (Slack is simulated: nothing is posted, so the UI shows the message).
// No value imports, so `npm test` can run it in Node.

import type { Run, Task } from '../api/types'

export interface SlackPreview {
  header: string
  caption: string
  /** null when Slack would drop the image: it only accepts public http(s) URLs. */
  imageUrl: string | null
  taskLines: string[]
  elapsed: string
}

/** Same rule as slack._is_web_url: data: URLs (the local placeholder SVG) are skipped. */
export function isWebUrl(url: string | null | undefined): url is string {
  if (!url || /\s/.test(url)) return false
  try {
    const parsed = new URL(url)
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.host !== ''
  } catch {
    return false
  }
}

/** Same as slack.format_elapsed: "1h 50m" or "45m", rounded down to the minute. */
export function formatMinutes(ms: number): string {
  const totalMinutes = Math.floor(Math.max(0, ms) / 60_000)
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
    header: 'Moment: post approved',
    caption: run.draft.caption,
    imageUrl: isWebUrl(run.draft.image_url) ? run.draft.image_url : null,
    taskLines: (run.referee?.tasks ?? []).map(taskLine),
    elapsed: formatMinutes(Date.parse(run.shipped_at) - Date.parse(run.started_at)),
  }
}
