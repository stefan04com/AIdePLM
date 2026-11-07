import { useState } from 'react'

interface Props {
  totalConflicts: number
  canShip: boolean
  onShip: (acceptAllEdits: boolean) => void
}

/** What the click really does: the backend ships the Referee's final caption, with every compromise in it. */
function summary(total: number): string {
  if (total === 0) return 'Ships the final caption'
  const compromises = total === 1 ? 'the compromise' : `all ${total} compromises`
  return `Ships the final caption with ${compromises} applied`
}

/** One click ships (demo script). The post preview and Slack message only update after this human click. */
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
