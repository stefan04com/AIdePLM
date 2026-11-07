import { useState } from 'react'

interface Props {
  acceptedCount: number
  totalConflicts: number
  canShip: boolean
  onShip: (acceptAllEdits: boolean) => void
}

/** Human-in-the-loop gate: nothing reaches Express or Slack until every compromise is accepted. */
export function ShipBar({ acceptedCount, totalConflicts, canShip, onShip }: Props) {
  const [acceptAllEdits, setAcceptAllEdits] = useState(true)
  const missing = totalConflicts - acceptedCount

  return (
    <div className="ship-bar">
      <label>
        <input
          type="checkbox"
          checked={acceptAllEdits}
          onChange={(e) => setAcceptAllEdits(e.target.checked)}
        />
        Also apply hashtag and visual edits
      </label>
      <span className="muted">
        {missing > 0
          ? `Accept ${missing} more compromise${missing === 1 ? '' : 's'} to ship`
          : `${acceptedCount}/${totalConflicts} compromises accepted`}
      </span>
      <button
        className="primary"
        disabled={!canShip || missing > 0}
        onClick={() => onShip(acceptAllEdits)}
      >
        Apply &amp; ship
      </button>
    </div>
  )
}
