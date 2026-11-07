import { useEffect, useState, type CSSProperties } from 'react'
import { diffWords } from '../../lib/diff'

const START_S = 4.4 // after the ship celebration has faded
const MORPH_MS = 8600

/** The caption rewrites itself when the Referee changes it: cut words strike out, new ones pour in. */
export function MorphCaption({ caption }: { caption: string }) {
  const [shown, setShown] = useState(caption)
  const [from, setFrom] = useState<string | null>(null)
  if (caption !== shown) {
    setFrom(shown)
    setShown(caption)
  }

  useEffect(() => {
    if (from === null) return
    const timer = setTimeout(() => setFrom(null), MORPH_MS)
    return () => clearTimeout(timer)
  }, [from])

  if (from === null) return <p className="caption">{caption}</p>
  return (
    <p className="caption is-morphing">
      {diffWords(from, caption).map((part, i) => (
        <span key={i} className={`morph-${part.kind}`} style={{ '--d': `${START_S + i * 0.06}s` } as CSSProperties}>
          {part.text}
        </span>
      ))}
    </p>
  )
}
