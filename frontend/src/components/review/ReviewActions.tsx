import { useEffect, useState } from 'react'
import type { Run } from '../../api/types'
import { FUNNEL_RESOLVE_MS } from '../../lib/funnel'
import { canReferee, canRequestReactions, isReviewable } from '../../lib/runStatus'
import { RefereeFunnel } from '../referee/RefereeFunnel'

export interface ReviewHandlers {
  onRequestReactions: () => void
  onFillScripted: () => void
  onReferee: () => void
}

interface Props extends ReviewHandlers {
  run: Run | null
  busy: boolean
}

export function ReviewActions({ run, busy, ...on }: Props) {
  const disabledUnless = (allowed: (run: Run | null) => boolean) => busy || !allowed(run)
  // The run whose "Run referee" was just pressed: its funnel shows until the answer lands.
  const [funnelFor, setFunnelFor] = useState<string | null>(null)
  const ownRun = run !== null && funnelFor === run.id
  const resolved = ownRun && run.referee !== null
  // Hidden again if the call fails (busy ends without an answer) or the run changes.
  const showFunnel = ownRun && (busy || resolved)

  useEffect(() => {
    if (!resolved) return
    const timer = window.setTimeout(() => setFunnelFor(null), FUNNEL_RESOLVE_MS)
    return () => window.clearTimeout(timer)
  }, [resolved])

  const onReferee = () => {
    if (run) setFunnelFor(run.id)
    on.onReferee()
  }

  return (
    <>
      <div className="actions">
        <button disabled={disabledUnless(canRequestReactions)} onClick={on.onRequestReactions}>
          Persona reactions
        </button>
        <button disabled={disabledUnless(isReviewable)} onClick={on.onFillScripted}>
          Fill scripted comments
        </button>
        <button disabled={disabledUnless(canReferee)} onClick={onReferee}>
          Run referee
        </button>
      </div>
      {showFunnel && run && (
        <RefereeFunnel
          comments={run.comments}
          reactions={run.reactions}
          resolved={resolved}
          conflicts={run.referee?.conflicts.length ?? 0}
        />
      )}
    </>
  )
}
