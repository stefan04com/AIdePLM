import type { Run } from '../api/types'
import { useFirefly } from '../hooks/useFirefly'
import { buildSlackPreview } from '../lib/slackPreview'
import { ExpressPreview } from './canvas/ExpressPreview'
import { EditPanel } from './canvas/EditPanel'
import { HashtagCard } from './canvas/HashtagCard'
import { BrandShield } from './wow/BrandShield'
import { SlackPreview } from './canvas/SlackPreview'
import { Muted, Pill, SectionHead } from './ui'

interface Props {
  run: Run | null
  /** True while a request is in flight or the backend runs a step. */
  busy: boolean
  onRegenerate: (caption: string, instruction: string) => Promise<void>
  onHashtags: (hashtags: string[]) => Promise<void>
}

export function CanvasColumn({ run, busy, onRegenerate, onHashtags }: Props) {
  const firefly = useFirefly(run?.id ?? null)
  // The image generated with the Firefly mock replaces the post's visual everywhere on screen.
  const shown: Run | null =
    run?.draft && firefly.image
      ? { ...run, draft: { ...run.draft, image_url: firefly.image.url } }
      : run
  const slack = shown ? buildSlackPreview(shown) : null

  return (
    <section className="column">
      <SectionHead id="03" title="Company post" aside={<Pill>simulated</Pill>} />
      {run?.step && <StepIndicator label={run.step} />}
      {!run && <Muted>Start a run to generate a draft.</Muted>}
      {run?.status === 'REJECTED' && <BrandShield reason={run.fit?.reason ?? null} />}
      {run?.draft && (
        <ExpressPreview draft={run.draft} firefly={firefly} canGenerate={!busy && run.status !== 'SHIPPED'} />
      )}
      {run?.draft && (
        <EditPanel
          key={run.id}
          draft={run.draft}
          enabled={!busy && run.status !== 'SHIPPED'}
          onRegenerate={onRegenerate}
        />
      )}
      {run?.draft && (
        <HashtagCard
          draft={run.draft}
          enabled={!busy && run.status !== 'SHIPPED'}
          onChange={onHashtags}
        />
      )}
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
