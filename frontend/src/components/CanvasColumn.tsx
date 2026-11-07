import type { Run } from '../api/types'
import { useFirefly } from '../hooks/useFirefly'
import { buildSlackPreview } from '../lib/slackPreview'
import { ExpressPreview } from './canvas/ExpressPreview'
import { EditPanel } from './canvas/EditPanel'
import { FireflyPanel } from './canvas/FireflyPanel'
import { BrandShield } from './wow/BrandShield'
import { SlackPreview } from './canvas/SlackPreview'
import { Muted, Pill, SectionHead } from './ui'

interface Props {
  run: Run | null
  /** True while a request is in flight or the backend runs a step. */
  busy: boolean
  onRegenerate: (caption: string, instruction: string) => Promise<void>
}

export function CanvasColumn({ run, busy, onRegenerate }: Props) {
  const firefly = useFirefly(run?.id ?? null)
  // The variation picked from the Firefly mock replaces the post's visual everywhere on screen.
  const shown: Run | null =
    run?.draft && firefly.picked
      ? { ...run, draft: { ...run.draft, image_url: firefly.picked.url } }
      : run
  const slack = shown ? buildSlackPreview(shown) : null

  return (
    <section className="column">
      <SectionHead id="03" title="Company post" aside={<Pill>simulated</Pill>} />
      {run?.step && <StepIndicator label={run.step} />}
      {!run && <Muted>Start a run to generate a draft.</Muted>}
      {run?.status === 'REJECTED' && <BrandShield reason={run.fit?.reason ?? null} />}
      {shown?.draft && <ExpressPreview draft={shown.draft} />}
      {run?.draft && (
        <EditPanel
          key={run.id}
          draft={run.draft}
          enabled={!busy && run.status !== 'SHIPPED'}
          onRegenerate={onRegenerate}
        />
      )}
      {run?.draft && <FireflyPanel firefly={firefly} disabled={run.status === 'SHIPPED'} />}
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
