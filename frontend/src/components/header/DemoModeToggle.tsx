import { useEffect, useState } from 'react'
import { api } from '../../api/client'

/** Shows and switches backend demo mode. The demo script needs it on for the whole run. */
export function DemoModeToggle({ onError }: { onError: (err: unknown) => void }) {
  const [on, setOn] = useState<boolean | null>(null) // null = not known yet

  useEffect(() => {
    api.getDemoMode().then((r) => setOn(r.on), onError)
  }, [onError])

  const toggle = () => api.setDemoMode(!on).then((r) => setOn(r.on), onError)

  return (
    <button
      className={`demo-toggle ${on ? 'tone-ok' : 'tone-warn'}`}
      onClick={toggle}
      disabled={on === null}
      title="Demo mode: cached responses for every external call"
    >
      Demo mode {on === null ? '…' : on ? 'ON' : 'OFF'}
    </button>
  )
}
