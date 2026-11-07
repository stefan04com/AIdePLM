import type { Run } from '../api/types'
import { buildSlackPreview } from '../lib/slackPreview'
import { ExpressPreview } from './canvas/ExpressPreview'
import { BrandShield } from './wow/BrandShield'
import { SlackPreview } from './canvas/SlackPreview'
import { Muted, Pill, SectionHead } from './ui'

export function CanvasColumn({ run }: { run: Run | null }) {
  const slack = run ? buildSlackPreview(run) : null

  return (
    <section className="column">
      <SectionHead id="03" title="Company post" aside={<Pill>simulated</Pill>} />
      {run?.step && <StepIndicator label={run.step} />}
      {!run && <Muted>Start a run to generate a draft.</Muted>}
      {run?.status === 'REJECTED' && <BrandShield reason={run.fit?.reason ?? null} />}
      {run?.draft && <ExpressPreview draft={run.draft} />}
      {slack && (
        <>
          <SectionHead title="Slack message preview" aside={<Pill>simulated</Pill>} />
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
