import { useEffect, useState, type CSSProperties } from 'react'
import { diffWords } from '../../lib/diff'

/** After a ship: wait until the celebration fades and the page has scrolled to the caption. */
export const AFTER_SHIP_S = 4.6
const MELT_S = 0.9 // cut words melt, then their gap closes
const WORD_S = 0.09 // honey reaches the next new word this much later
const POUR_S = 0.7 // one word filling with honey
const SETTLE_S = 3.2 // from the first drop of honey until the word is plain ink again

interface Word {
  text: string
  delay: number // seconds
  drip: boolean
}

interface Part {
  kind: 'same' | 'removed' | 'added'
  words: Word[]
  delay: number
  duration: number // added phrases: how long the honey stream takes to run under the words
}

/** Splits into words that keep their trailing space, so the morph lays out like the plain text. */
const splitWords = (text: string) => text.match(/\S+\s*|\s+/g) ?? [text]

/** Timing for every word: cut words melt first, then honey pours into the new ones, word by word. */
function plan(from: string, to: string, start: number): { parts: Part[]; endMs: number } {
  const parts = diffWords(from, to)
  const removedAny = parts.some((p) => p.kind === 'removed')
  const pourStart = start + (removedAny ? MELT_S * 0.6 : 0)
  let poured = 0
  const planned = parts.map((part): Part => {
    if (part.kind === 'same') return { kind: 'same', words: [{ text: part.text, delay: 0, drip: false }], delay: 0, duration: 0 }
    if (part.kind === 'removed') {
      const words = splitWords(part.text).map((text) => ({ text, delay: start, drip: false }))
      return { kind: 'removed', words, delay: start, duration: MELT_S }
    }
    const delay = pourStart + poured * WORD_S
    const words = splitWords(part.text).map((text, i, all) => {
      const word = { text, delay: pourStart + poured * WORD_S, drip: false }
      poured += 1
      // a drop hangs from the end of each phrase and from some longer words, never two side by side
      word.drip = i === all.length - 1 || (text.trim().length >= 6 && i % 3 === 1)
      return word
    })
    return { kind: 'added', words, delay, duration: words.length * WORD_S + POUR_S }
  })
  const endMs = (pourStart + poured * WORD_S + SETTLE_S + 0.3) * 1000
  return { parts: planned, endMs }
}

const at = (seconds: number) => ({ '--d': `${seconds.toFixed(2)}s` }) as CSSProperties

/**
 * The caption rewrites itself when the Referee changes it: cut words melt and their gap closes, then
 * honey runs under the new words and fills them one by one, a few drops fall, and the honey dries
 * into plain ink. The layout matches the plain caption throughout, so nothing jumps at the end.
 * `start` is the pause in seconds before it begins.
 */
export function MorphCaption({ caption, start = AFTER_SHIP_S }: { caption: string; start?: number }) {
  const [shown, setShown] = useState(caption)
  const [from, setFrom] = useState<string | null>(null)
  if (caption !== shown) {
    setFrom(shown)
    setShown(caption)
  }

  const morph = from === null ? null : plan(from, caption, start)
  const endMs = morph?.endMs ?? 0
  useEffect(() => {
    if (from === null) return
    const timer = setTimeout(() => setFrom(null), endMs)
    return () => clearTimeout(timer)
  }, [from, endMs])

  if (!morph) return <p className="caption">{caption}</p>

  return (
    <p className="caption is-morphing" aria-label={caption}>
      {morph.parts.map((part, i) => {
        if (part.kind === 'same') return <span key={i}>{part.words[0].text}</span>
        if (part.kind === 'removed') {
          return part.words.map((word, j) => (
            <span key={`${i}-${j}`} className="morph-removed" style={at(word.delay)} aria-hidden>
              {word.text}
            </span>
          ))
        }
        return (
          <span
            key={i}
            className="honey-phrase"
            style={{ ...at(part.delay), '--run': `${part.duration.toFixed(2)}s` } as CSSProperties}
            aria-hidden
          >
            <span className="honey-pour" />
            {part.words.map((word, j) => (
              <span key={j} className="honey-word" style={at(word.delay)}>
                {word.text}
                {word.drip && <span className="honey-drop" />}
              </span>
            ))}
          </span>
        )
      })}
    </p>
  )
}
