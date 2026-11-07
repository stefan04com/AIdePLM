import type { Draft, Run } from '../api/types'
import { formatElapsed } from '../lib/format'
import { Card, Muted } from './ui'

export function CanvasColumn({ run }: { run: Run | null }) {
  return (
    <section className="column">
      <h2>Draft</h2>
      {run?.step && <StepIndicator label={run.step} />}
      {!run && <Muted>Start a run to generate a draft.</Muted>}
      {run?.status === 'REJECTED' && <Muted>Trend rejected, so no draft was made.</Muted>}
      {run?.draft && <DraftCard draft={run.draft} />}
      {run?.shipped_at && (
        <p className="shipped">
          Shipped · trend → approved in {formatElapsed(run.started_at, run.shipped_at)}
        </p>
      )}
    </section>
  )
}

function StepIndicator({ label }: { label: string }) {
  return (
    <p className="step" role="status">
      <span className="spinner" aria-hidden /> {label}
    </p>
  )
}

function DraftCard({ draft }: { draft: Draft }) {
  return (
    <Card className="canvas">
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
    </Card>
  )
}
