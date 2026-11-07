import { type CSSProperties, useState } from 'react'
import type { UsageSummary } from '../api/types'
import { useCountUp } from '../hooks/useCountUp'
import { ASSUMPTION_TEXT, COIN_LIMIT, coinFor, COUNT_UP_MS, formatTicker, hoursSaved } from '../lib/ticker'
import '../styles/ticker.css'

/**
 * Live cost ticker: every logged LLM call drops in as a coin ("+$0.012 · fit", "+$0.000 · cached"),
 * the total spend counts up, and next to it the review hours saved (an assumption, labelled).
 */
export function CostTicker({ all }: { all: UsageSummary | null }) {
  const calls = all?.calls ?? []
  // Calls already logged when the panel first got data don't flip in; only the ones after do.
  const [seen, setSeen] = useState<number | null>(null)
  if (all && seen === null) setSeen(calls.length)
  const firstNew = seen ?? calls.length
  // Several calls can land in one refetch (fit + draft): they flip in one after the other.
  const [count, setCount] = useState(calls.length)
  const [batchStart, setBatchStart] = useState(calls.length)
  if (calls.length !== count) {
    setBatchStart(count)
    setCount(calls.length)
  }

  const total = useCountUp(all?.total_cost_usd ?? 0, COUNT_UP_MS)
  const hours = useCountUp(hoursSaved(calls), COUNT_UP_MS)
  const start = Math.max(0, calls.length - COIN_LIMIT)
  const recent = calls.slice(start).map((call, i) => ({ call, index: start + i }))

  return (
    <div className="ticker">
      <div className="ticker-stats">
        <div className="ticker-stat">
          <span className="ticker-label">AI spend, all runs</span>
          <span className="ticker-value">{formatTicker(total)}</span>
        </div>
        <div className="ticker-stat ticker-hours">
          <span className="ticker-label">Review hours saved*</span>
          <span className="ticker-value">{Math.round(hours)} h</span>
        </div>
      </div>
      {recent.length > 0 && (
        <ol className="ticker-coins" aria-label="Latest AI calls">
          {recent.map(({ call, index }) => {
            const coin = coinFor(call)
            const fresh = index >= firstNew
            return (
              <li
                key={index}
                className={`ticker-coin${coin.cached ? ' is-cached' : ''}${fresh ? ' is-new' : ''}`}
                style={{ '--n': Math.min(Math.max(0, index - batchStart), 4) } as CSSProperties}
              >
                <span className="ticker-face" aria-hidden>
                  $
                </span>
                {coin.amount} · {coin.label}
              </li>
            )
          })}
        </ol>
      )}
      <p className="ticker-note">* {ASSUMPTION_TEXT}</p>
    </div>
  )
}
