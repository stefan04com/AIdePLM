import type { SlackPreview as Preview } from '../../lib/slackPreview'

/**
 * The Slack message Moment would post after "Apply compromise" (demo script 2:30).
 * Slack is simulated by the backend: nothing is posted; this shows what slack.build_blocks() builds.
 */
export function SlackPreview({ preview }: { preview: Preview }) {
  return (
    <article className="slack">
      <header className="slack-bar">
        <span className="slack-hash">#</span>
        <strong>boabe-social</strong>
        <span className="muted">Simulated · not posted</span>
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
