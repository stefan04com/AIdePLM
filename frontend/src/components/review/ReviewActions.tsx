import type { Run } from '../../api/types'
import { canReferee, canRequestReactions, isReviewable } from '../../lib/runStatus'

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

  return (
    <div className="actions">
      <button disabled={disabledUnless(canRequestReactions)} onClick={on.onRequestReactions}>
        Persona reactions
      </button>
      <button disabled={disabledUnless(isReviewable)} onClick={on.onFillScripted}>
        Fill scripted comments
      </button>
      <button disabled={disabledUnless(canReferee)} onClick={on.onReferee}>
        Run referee
      </button>
    </div>
  )
}
