import type { Run } from '../api/types'
import { buildSlackPreview } from '../lib/slackPreview'
import { ExpressPreview } from './canvas/ExpressPreview'
import { SlackPreview } from './canvas/SlackPreview'
import { Muted } from './ui'

export function CanvasColumn({ run }: { run: Run | null }) {
  const slack = run ? buildSlackPreview(run) : null

  return (
    <section className="column">
      <h2>Draft</h2>
      {run?.step && <StepIndicator label={run.step} />}
      {!run && <Muted>Start a run to generate a draft.</Muted>}
      {run?.status === 'REJECTED' && <Muted>Trend rejected, so no draft was made.</Muted>}
      {run?.draft && <ExpressPreview draft={run.draft} />}
      {slack && (
        <>
          <h2>Slack message preview</h2>
          <SlackPreview preview={slack} />
        </>
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
