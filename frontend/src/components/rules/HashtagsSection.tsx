import { useEffect, useRef, useState } from 'react'
import { api } from '../../api/client'
import type { HashtagSuggestions, LiveTrends } from '../../api/types'
import { Card, Muted, Pill } from '../ui'

const PLATFORMS = ['instagram', 'tiktok', 'x', 'linkedin'] as const
const DEFAULT_KEYWORDS = 'pumpkin latte, cozy autumn, Bucharest'

// Steps shown by the mocked "Fetch current trends": what a live fetch would do. The result is the
// saved snapshot from data/live_trends.json, and the UI says so.
const FETCH_STEPS = [
  'Querying Google Trends (RO)…',
  'Reading YouTube most popular (RO)…',
  'Matching trends to the Boabe brand…',
]
const STEP_MS = 650

/** Rules page: current trends (mocked fetch) and sourced hashtag suggestions. */
export function HashtagsSection() {
  const [keywords, setKeywords] = useState(DEFAULT_KEYWORDS)
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>('instagram')
  const [tags, setTags] = useState<HashtagSuggestions | null>(null)
  const [trends, setTrends] = useState<LiveTrends | null>(null)
  const [step, setStep] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach(window.clearTimeout), [])

  async function suggest(text = keywords, on = platform) {
    setError(null)
    const list = text.split(',').map((word) => word.trim()).filter(Boolean)
    try {
      setTags(await api.getHashtags(list, on))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load hashtags')
    }
  }

  function fetchTrends() {
    setError(null)
    setTrends(null)
    FETCH_STEPS.forEach((label, i) => {
      timers.current.push(window.setTimeout(() => setStep(label), i * STEP_MS))
    })
    timers.current.push(
      window.setTimeout(async () => {
        try {
          setTrends(await api.getLiveTrends())
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Could not load trends')
        } finally {
          setStep(null)
        }
      }, FETCH_STEPS.length * STEP_MS),
    )
  }

  function pickTrend(title: string) {
    setKeywords(title)
    void suggest(title)
  }

  return (
    <>
      <Card className="hashtags" title={<>Current trends <Pill tone="warn">simulated fetch</Pill></>}>
        <div className="hashtags-actions">
          <button onClick={fetchTrends} disabled={step !== null}>
            {trends ? 'Fetch again' : 'Fetch current trends'}
          </button>
          {step && (
            <span className="step" role="status">
              <span className="spinner" aria-hidden /> {step}
            </span>
          )}
        </div>
        {trends && (
          <>
            <Muted>
              Saved snapshot collected {trends.collected_at ?? 'earlier'} from the web, not fetched
              live. Pick one to get hashtags for it.
            </Muted>
            <ul className="trend-list">
              {trends.trends.map((trend) => (
                <li key={trend.id}>
                  <button className="trend-pick" onClick={() => pickTrend(trend.title)}>
                    {trend.title}
                  </button>
                  {trend.url && (
                    <a href={trend.url} target="_blank" rel="noreferrer" className="muted">
                      source
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Card className="hashtags" title={<>Hashtag suggestions <Pill>saved</Pill></>}>
        <form
          className="hashtags-form"
          onSubmit={(event) => {
            event.preventDefault()
            void suggest()
          }}
        >
          <label>
            Keywords
            <input value={keywords} onChange={(event) => setKeywords(event.target.value)} />
          </label>
          <label>
            Platform
            <select
              value={platform}
              onChange={(event) => {
                const next = event.target.value as (typeof PLATFORMS)[number]
                setPlatform(next)
                if (tags) void suggest(keywords, next)
              }}
            >
              {PLATFORMS.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <button type="submit">Suggest hashtags</button>
        </form>
        {error && <p className="muted">{error}</p>}
        {tags && (
          <>
            {tags.hashtags.length === 0 ? (
              <Muted>No sourced hashtags match these keywords.</Muted>
            ) : (
              <ul className="tag-list">
                {tags.hashtags.map((tag) => (
                  <li key={tag.tag} title={tag.evidence}>
                    <strong>{tag.tag}</strong> <Pill>{tag.kind}</Pill>{' '}
                    <a href={tag.source_url} target="_blank" rel="noreferrer" className="muted">
                      source
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <Muted>
              Max {tags.cap} (Boabe rule).{tags.platform_note ? ` ${tags.platform_note}` : ''} Saved{' '}
              {tags.collected_at ?? ''}; no scraping, every tag has a public source.
            </Muted>
          </>
        )}
      </Card>
    </>
  )
}
