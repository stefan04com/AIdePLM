import { useState } from 'react'
import { api } from '../../api/client'
import { errorMessage } from '../../api/errors'
import type { Draft, TrendScore } from '../../api/types'
import { LEVEL_LABEL, LEVEL_TONE, levelOf, scoredKey, toRequest } from '../../lib/trendScore'
import { toneClass } from '../../lib/tones'
import { Card, Muted, Pill, SectionHead } from '../ui'

interface Checked {
  key: string
  score: TrendScore
}

/** Are the post's words and hashtags in the trend? Scored on demand; says when it is out of date. */
export function TrendScoreCard({ draft }: { draft: Draft | null }) {
  const [checked, setChecked] = useState<Checked | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const check = async () => {
    if (!draft) return
    setLoading(true)
    setError(null)
    try {
      setChecked({ key: scoredKey(draft), score: await api.getTrendScore(toRequest(draft)) })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const stale = draft !== null && checked !== null && checked.key !== scoredKey(draft)
  const level = checked ? levelOf(checked.score.score) : null

  return (
    <section className="column">
      <SectionHead title="Trend score" aside={<Pill>vs saved trends</Pill>} />
      <Card>
        {!draft && <Muted>Appears once the draft is ready.</Muted>}
        {draft && (
          <button disabled={loading} onClick={check}>
            {loading ? 'Checking…' : checked ? 'Check again' : 'Check trend score'}
          </button>
        )}
        {error && <p className="muted">{error}</p>}

        {checked && level && (
          <div className={`trend-score ${toneClass(LEVEL_TONE[level])}`}>
            <div className="factor-head">
              <span className="factor-label">{LEVEL_LABEL[level]}</span>
              <span className="factor-value">{checked.score.score}/100</span>
            </div>
            <div className="factor-bar" aria-hidden>
              <span style={{ width: `${checked.score.score}%` }} />
            </div>
            {stale && <p className="muted">The post changed since this score. Check again.</p>}
            <ul className="trend-suggestions">
              {checked.score.suggestions.map((suggestion) => (
                <li key={suggestion}>{suggestion}</li>
              ))}
            </ul>
          </div>
        )}
        <Muted>Compared with saved trends and the platform rules, not with live Google Trends.</Muted>
      </Card>
    </section>
  )
}
