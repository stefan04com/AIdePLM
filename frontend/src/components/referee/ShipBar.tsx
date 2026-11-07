import { useState } from 'react'

interface Props {
  acceptedCount: number
  totalConflicts: number
  canShip: boolean
  onShip: (acceptAllEdits: boolean) => void
}

function summary(accepted: number, total: number): string {
  if (total === 0) return 'No conflicts to settle'
  if (accepted === total) return `All ${total} compromises accepted`
  return `Accepts all ${total} compromises (${accepted} reviewed one by one)`
}

/** One click ships (demo script). The post preview and Slack message (both simulated) only update after this human click. */
export function ShipBar({ acceptedCount, totalConflicts, canShip, onShip }: Props) {
  const [acceptAllEdits, setAcceptAllEdits] = useState(true)

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
      <span className="muted">{summary(acceptedCount, totalConflicts)}</span>
      <button className="primary" disabled={!canShip} onClick={() => onShip(acceptAllEdits)}>
        Apply compromise
      </button>
    </div>
  )
}
