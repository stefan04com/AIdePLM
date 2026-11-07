import { useEffect, useState } from 'react'
import { BeeSvg } from '../adobee/BeeSvg'

const SEEN_KEY = 'moment-intro-seen'
const DURATION_MS = 3400

/** Show once per browser session; `?intro` forces it (for rehearsals), reduced motion skips it. */
function shouldShow(): boolean {
  if (new URLSearchParams(window.location.search).has('intro')) return true
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  return sessionStorage.getItem(SEEN_KEY) === null
}

// A seven-cell honeycomb "flower" (pointy-top hexes, 56 × 64, rows 48 apart).
const HEXES = [
  [28, 0],
  [84, 0],
  [0, 48],
  [56, 48],
  [112, 48],
  [28, 96],
  [84, 96],
]

/** Opening title: Adobee flies in, a honeycomb draws itself, the promise appears. Click skips. */
export function Intro() {
  const [visible, setVisible] = useState(shouldShow)

  useEffect(() => {
    if (!visible) return
    sessionStorage.setItem(SEEN_KEY, '1')
    const timer = setTimeout(() => setVisible(false), DURATION_MS)
    return () => clearTimeout(timer)
  }, [visible])

  if (!visible) return null
  return (
    <div className="intro" role="presentation" onClick={() => setVisible(false)}>
      <div className="intro-stage">
        <svg className="intro-comb" viewBox="-8 -8 184 176" aria-hidden>
          {HEXES.map(([x, y], i) => (
            <path
              key={i}
              d="M28 0 L56 16 L56 48 L28 64 L0 48 L0 16 Z"
              transform={`translate(${x} ${y})`}
              style={{ animationDelay: `${0.3 + i * 0.08}s` }}
            />
          ))}
        </svg>
        <div className="intro-bee">
          <BeeSvg mood="happy" look={{ x: 2, y: 0 }} />
        </div>
      </div>
      <div className="intro-text">
        <h1>AdoBee</h1>
        <p>From trend to approved post, before the trend is over.</p>
        <span>Adobe Hackathon · Marketing Reimagined</span>
      </div>
      <span className="intro-skip">click to skip</span>
    </div>
  )
}
