import type { Run } from '../api/types'
import { formatElapsed } from '../lib/time'

interface Props {
  run: Run | null
}

export function CanvasColumn({ run }: Props) {
  const draft = run?.draft ?? null

  return (
    <section className="column">
      <h2>Draft</h2>

      {run?.step && (
        <p className="step" role="status">
          <span className="spinner" aria-hidden /> {run.step}
        </p>
      )}

      {run?.status === 'REJECTED' && <p className="muted">Trend rejected, so no draft was made.</p>}

      {!run && <p className="muted">Start a run to generate a draft.</p>}

      {draft && (
        <article className="card canvas">
          {draft.image_url ? (
            <img src={draft.image_url} alt={draft.visual_prompt} />
          ) : (
            <div className="image-placeholder">{draft.visual_prompt}</div>
          )}
          <p className="caption">{draft.caption}</p>
          <p className="hashtags">{draft.hashtags.join(' ')}</p>
          <footer className="muted">
            v{draft.version}
            {draft.express_doc_id && <> · Express doc {draft.express_doc_id}</>}
          </footer>
        </article>
      )}

      {run?.status === 'SHIPPED' && run.shipped_at && (
        <p className="shipped">
          Shipped · trend → approved in {formatElapsed(run.started_at, run.shipped_at)}
        </p>
      )}
    </section>
  )
}
