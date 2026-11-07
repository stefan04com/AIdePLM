import type { RunStatus } from '../../api/types'

export interface ReviewHandlers {
  onRequestReactions: () => void
  onFillScripted: () => void
  onReferee: () => void
  onApply: () => void
}

interface Props extends ReviewHandlers {
  status: RunStatus | undefined
  canReview: boolean
  busy: boolean
}

export function ReviewActions({ status, canReview, busy, ...on }: Props) {
  const disabledUnless = (condition: boolean) => !condition || busy

  return (
    <div className="actions">
      <button disabled={disabledUnless(canReview)} onClick={on.onRequestReactions}>
        Persona reactions
      </button>
      <button disabled={disabledUnless(canReview)} onClick={on.onFillScripted}>
        Fill scripted comments
      </button>
      <button disabled={disabledUnless(status === 'IN_REVIEW')} onClick={on.onReferee}>
        Run referee
      </button>
      <button
        className="primary"
        disabled={disabledUnless(status === 'REFEREED')}
        onClick={on.onApply}
      >
        Apply &amp; ship
      </button>
    </div>
  )
}
