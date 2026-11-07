import { useEffect, useRef, useState } from 'react'
import type { Run } from '../api/types'
import { ADOBEE_TIPS, adobeeState, type AdobeeMood } from '../lib/adobee'

const MAX_LOOK = 3 // px the eyes move toward the cursor
const TIP_MS = 5000

/** Eyes inside the visor; the shape shows the mood. */
function Eyes({ mood }: { mood: AdobeeMood }) {
  if (mood === 'happy') {
    return (
      <g className="adobee-eye-shape" fill="none" strokeWidth="3" strokeLinecap="round">
        <path d="M44 56 q5 -7 10 0" />
        <path d="M66 56 q5 -7 10 0" />
      </g>
    )
  }
  if (mood === 'sad') {
    return (
      <g className="adobee-eye-shape" fill="none" strokeWidth="3" strokeLinecap="round">
        <path d="M44 52 q5 6 10 3" />
        <path d="M66 55 q5 3 10 -3" />
      </g>
    )
  }
  const ry = mood === 'working' ? 3 : mood === 'alert' ? 7 : 5.5
  return (
    <g className="adobee-eyes">
      <ellipse cx="49" cy="54" rx={mood === 'alert' ? 6 : 5} ry={ry} />
      <ellipse cx="71" cy="54" rx={mood === 'alert' ? 6 : 5} ry={ry} />
    </g>
  )
}

/** Adobee, the red robot bee: floats in the corner, reacts to the run and follows the cursor. */
export function Adobee({ run, busy }: { run: Run | null; busy: boolean }) {
  const { mood, message } = adobeeState(run, busy)
  const [look, setLook] = useState({ x: 0, y: 0 })
  const [tip, setTip] = useState<string | null>(null)
  const [spins, setSpins] = useState(0)
  const [hidden, setHidden] = useState<string | null>(null) // message the user closed
  const beeRef = useRef<HTMLButtonElement>(null)
  const tipIndex = useRef(0)

  useEffect(() => {
    let frame = 0
    const onMove = (event: MouseEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const box = beeRef.current?.getBoundingClientRect()
        if (!box) return
        const dx = event.clientX - (box.left + box.width / 2)
        const dy = event.clientY - (box.top + box.height / 3)
        const length = Math.hypot(dx, dy) || 1
        setLook({ x: (dx / length) * MAX_LOOK, y: (dy / length) * MAX_LOOK })
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    if (!tip) return
    const timer = setTimeout(() => setTip(null), TIP_MS)
    return () => clearTimeout(timer)
  }, [tip])

  const onClick = () => {
    setSpins((n) => n + 1)
    setHidden(null)
    setTip(ADOBEE_TIPS[tipIndex.current % ADOBEE_TIPS.length])
    tipIndex.current += 1
  }

  const open = tip !== null || hidden !== message // a new message always shows

  return (
    <div className={`adobee adobee-${mood}`}>
      {open && (
        <div className="adobee-bubble" role="status" aria-live="polite">
          <button type="button" className="adobee-close" aria-label="Hide" onClick={() => {
              setHidden(message)
              setTip(null)
            }}>
            ×
          </button>
          <strong>Adobee</strong>
          <span>{tip ?? message}</span>
        </div>
      )}
      <button
        ref={beeRef}
        type="button"
        className="adobee-bee"
        aria-label="Adobee, the busy bee. Click for a tip."
        onClick={onClick}
      >
        <svg key={spins} className={spins > 0 ? 'adobee-svg adobee-spin' : 'adobee-svg'} viewBox="0 0 120 150">
          <g className="adobee-wings">
            <ellipse className="adobee-wing adobee-wing-left" cx="24" cy="46" rx="20" ry="11" />
            <ellipse className="adobee-wing adobee-wing-right" cx="96" cy="46" rx="20" ry="11" />
          </g>
          <g className="adobee-antennae" strokeWidth="2.5" strokeLinecap="round">
            <path d="M48 22 L40 6" />
            <path d="M72 22 L80 6" />
            <circle cx="40" cy="6" r="4.5" />
            <circle cx="80" cy="6" r="4.5" />
          </g>
          <ellipse className="adobee-flame" cx="60" cy="136" rx="7" ry="11" />
          <g className="adobee-body">
            <path d="M40 92 Q60 80 80 92 L76 118 Q60 130 44 118 Z" />
            <rect className="adobee-stripe" x="41" y="99" width="38" height="6" rx="3" />
            <rect className="adobee-stripe" x="44" y="110" width="32" height="5" rx="2.5" />
            <circle className="adobee-light" cx="52" cy="95" r="2.2" />
            <circle className="adobee-light" cx="68" cy="95" r="2.2" />
          </g>
          <g className="adobee-arms" strokeWidth="5" strokeLinecap="round">
            <path d="M40 98 L30 106" />
            <path d="M80 98 L90 106" />
          </g>
          <circle className="adobee-head" cx="60" cy="54" r="34" />
          <path className="adobee-band" d="M28 44 Q60 30 92 44" fill="none" strokeWidth="4" />
          <circle className="adobee-ear" cx="26" cy="56" r="7" />
          <circle className="adobee-ear" cx="94" cy="56" r="7" />
          <rect className="adobee-visor" x="34" y="40" width="52" height="30" rx="15" />
          <g transform={`translate(${look.x} ${look.y})`}>
            <Eyes mood={mood} />
          </g>
          <ellipse className="adobee-shine" cx="72" cy="45" rx="7" ry="3" />
        </svg>
      </button>
    </div>
  )
}
