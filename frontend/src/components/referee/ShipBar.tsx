import { useState } from 'react'

interface Props {
  totalConflicts: number
  canShip: boolean
  onShip: (acceptAllEdits: boolean) => void
}

/** The backend always ships the Referee's full final caption, so the button says "all". */
function summary(total: number): string {
  if (total === 0) return 'No conflicts to settle'
  return `Applies all ${total} compromises`
}

/** One click ships (demo script). The post preview and Slack message (both simulated) only update after this human click. */
export function ShipBar({ totalConflicts, canShip, onShip }: Props) {
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
      <span className="muted">{summary(totalConflicts)}</span>
      <button className="primary" disabled={!canShip} onClick={() => onShip(acceptAllEdits)}>
        Apply all &amp; ship
      </button>
    </div>
  )
}
