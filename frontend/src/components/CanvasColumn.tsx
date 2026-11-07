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
      {run?.shipped_at && <ShippedCard run={run} shippedAt={run.shipped_at} />}
      {run?.draft && <DraftCard draft={run.draft} />}
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

function ShippedCard({ run, shippedAt }: { run: Run; shippedAt: string }) {
  const taskCount = run.referee?.tasks.length ?? 0

  return (
    <Card accent="ok" className="shipped">
      <p className="muted">Trend → approved post in</p>
      <p className="shipped-time">{formatElapsed(run.started_at, shippedAt)}</p>
      <p>
        Updated in Express and posted to Slack with {taskCount} follow-up task
        {taskCount === 1 ? '' : 's'}.
      </p>
    </Card>
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
