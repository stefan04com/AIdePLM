import type { SlackPreview as Preview } from '../../lib/slackPreview'

const DELIVERY_LABEL = {
  posted: 'Posted to Slack',
  simulated: 'Preview · not posted (no webhook set)',
  failed: 'Slack unreachable · preview only',
} as const

/**
 * The Slack message Moment posts after "Apply compromise" (demo script 2:30), as built by
 * slack.build_blocks(). The label says whether the backend really posted it.
 */
export function SlackPreview({ preview }: { preview: Preview }) {
  return (
    <article className="slack">
      <header className="slack-bar">
        <span className="slack-hash">#</span>
        <strong>boabe-social</strong>
        <span className="muted">{DELIVERY_LABEL[preview.delivery ?? 'simulated']}</span>
      </header>
      <div className="slack-message">
        <span className="slack-avatar" aria-hidden>
          M
        </span>
        <div className="slack-body">
          <div>
            <strong>Moment</strong> <span className="slack-app">APP</span>
          </div>
          <p className="slack-header">{preview.header}</p>
          <p>{preview.caption}</p>
          {preview.imageUrl ? (
            <img src={preview.imageUrl} alt="Final post image" />
          ) : (
            <p className="muted slack-note">No image for this post.</p>
          )}
          {preview.taskLines.length > 0 && (
            <>
              <p className="slack-header">Tasks</p>
              <ul>
                {preview.taskLines.map((line) => (
                  <TaskLine key={line} line={line} />
                ))}
              </ul>
            </>
          )}
          <p className="slack-clock">Trend → approved: {preview.elapsed}</p>
        </div>
      </div>
    </article>
  )
}

/** "Legal: Sign off … (due: today)" with the owner in bold, like Slack's *Owner*. */
function TaskLine({ line }: { line: string }) {
  const split = line.indexOf(': ')
  return (
    <li>
      <strong>{line.slice(0, split)}</strong>
      {line.slice(split)}
    </li>
  )
}
