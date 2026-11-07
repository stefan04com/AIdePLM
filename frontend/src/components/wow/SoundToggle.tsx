import { useState } from 'react'
import { isMuted, setMuted } from '../../lib/sound'

/** Header switch for the sound effects; remembered between visits. */
export function SoundToggle() {
  const [muted, setState] = useState(isMuted)
  const toggle = () => {
    setMuted(!muted)
    setState(!muted)
  }
  return (
    <button
      type="button"
      className="sound-toggle"
      aria-pressed={!muted}
      title={muted ? 'Sound off' : 'Sound on'}
      onClick={toggle}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}
