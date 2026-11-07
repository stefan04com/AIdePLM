import { useEffect, useState, type CSSProperties } from 'react'
import { diffWords } from '../../lib/diff'

const START_S = 3.8 // starts right as the ship celebration begins fading out
const MORPH_MS = 10000

interface PreparedWord {
  word: string
  idx: number
  hasPour: boolean
  dripType: 'drip-lg' | 'drip-md' | 'drip-sm' | null
  hasFallingDrop: boolean
}

interface PreparedPart {
  kind: 'same' | 'removed' | 'added'
  text: string
  words: PreparedWord[]
}

function prepareParts(parts: ReturnType<typeof diffWords>): PreparedPart[] {
  let counter = 0
  return parts.map((part) => {
    if (part.kind !== 'added') return { ...part, words: [] }
    const rawWords = part.text.match(/\S+\s*|\s+/g) ?? [part.text]
    const words = rawWords.map((word, wIdx) => {
      const idx = counter++
      const isFirst = wIdx === 0
      const isLastInPhrase = wIdx === rawWords.length - 1
      const hasPunctuation = /[,.!?]/.test(word)
      const isLongWord = word.trim().length >= 6

      // Pour stream from above on first word and mid-phrase transition
      const hasPour = isFirst || (wIdx === 3 && rawWords.length > 4)

      let dripType: 'drip-lg' | 'drip-md' | 'drip-sm' | null = null
      let hasFallingDrop = false

      if (isLastInPhrase || hasPunctuation) {
        dripType = 'drip-lg'
        hasFallingDrop = true
      } else if (isLongWord) {
        dripType = 'drip-md'
        hasFallingDrop = true
      } else if (wIdx % 2 === 1) {
        dripType = 'drip-sm'
      }

      return { word, idx, hasPour, dripType, hasFallingDrop }
    })
    return { ...part, words }
  })
}

/**
 * The caption rewrites itself when the Referee changes it: cut words melt away,
 * and new ones pour in with rich, viscous flowing honey, pouring streams from above,
 * hanging strands and falling droplets that slide and drip across the text.
 */
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

  const prepared = prepareParts(diffWords(from, caption))

  return (
    <p className="caption is-morphing">
      {prepared.map((part, i) => {
        if (part.kind === 'added') {
          return (
            <span key={i} className="morph-added-phrase">
              {part.words.map(({ word, idx, hasPour, dripType, hasFallingDrop }, wIdx) => {
                // Honey pours in smoothly word after word, slightly after cut words start melting
                const delay = START_S + 0.2 + idx * 0.11
                return (
                  <span
                    key={wIdx}
                    className={`morph-added honey-word ${dripType ? `has-drip ${dripType}` : ''}`}
                    style={{ '--d': `${delay.toFixed(2)}s` } as CSSProperties}
                  >
                    {hasPour && <span className="honey-pour-stream" aria-hidden />}
                    <span className="honey-text">{word}</span>
                    {dripType && (
                      <span className={`honey-drip-container ${dripType}`} aria-hidden>
                        <span className="honey-strand" />
                        <span className="honey-hanging-drop" />
                        {hasFallingDrop && <span className="honey-falling-drop" />}
                      </span>
                    )}
                    <span className="honey-sheen" aria-hidden />
                  </span>
                )
              })}
            </span>
          )
        }

        const delay = START_S + (part.kind === 'removed' ? 0 : 0.2)
        return (
          <span
            key={i}
            className={`morph-${part.kind}`}
            style={{ '--d': `${delay.toFixed(2)}s` } as CSSProperties}
          >
            {part.text}
          </span>
        )
      })}
    </p>
  )
}
