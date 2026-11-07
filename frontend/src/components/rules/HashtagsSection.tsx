import { useEffect, useRef, useState } from 'react'
import { api } from '../../api/client'
import type { HashtagKind, HashtagSuggestions, LiveTrends } from '../../api/types'
import { Card, Muted, Pill } from '../ui'

const PLATFORMS = ['instagram', 'tiktok', 'x', 'linkedin'] as const
type HashtagPlatform = (typeof PLATFORMS)[number]
const PLATFORM_LABEL: Record<HashtagPlatform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  x: 'X',
  linkedin: 'LinkedIn',
}
export const DEFAULT_KEYWORDS = 'pumpkin latte, cozy autumn, Bucharest'

const KIND_LABEL: Record<HashtagKind, string> = {
  niche: 'niche',
  local: 'local',
  'branded-generic': 'generic',
  broad: 'broad',
}

// Steps shown by the mocked "Fetch current trends": what a live fetch would do. The result is the
// saved snapshot from data/live_trends.json, and the UI says so.
const FETCH_STEPS = [
  'Querying Google Trends (RO)…',
  'Reading YouTube most popular (RO)…',
  'Matching trends to the Boabe brand…',
]
const STEP_MS = 650

/** A request to suggest hashtags for `text`; `n` changes on every request so repeats re-run. */
export interface HashtagQuery {
  text: string
  n: number
}

/** "Fetch current trends" (simulated fetch, saved snapshot). Picking a trend asks for hashtags. */
export function CurrentTrends({ onPick }: { onPick: (title: string) => void }) {
  const [trends, setTrends] = useState<LiveTrends | null>(null)
  const [step, setStep] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach(window.clearTimeout), [])

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

  return (
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
      {error && <Muted>{error}</Muted>}
      {trends && (
        <>
          <Muted>
            Saved snapshot collected {trends.collected_at ?? 'earlier'} from the web, not fetched
            live. Pick one to get its hashtags under Platform rules.
          </Muted>
          <ul className="trend-list">
            {trends.trends.map((trend) => (
              <li key={trend.id}>
                <button className="trend-pick" onClick={() => onPick(trend.title)}>
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
  )
}

/** Sourced hashtag suggestions per platform, shown under Platform rules. */
export function HashtagSuggestionsCard({ query }: { query: HashtagQuery }) {
  const [keywords, setKeywords] = useState(query.text)
  const [platform, setPlatform] = useState<HashtagPlatform>('instagram')
  const [result, setResult] = useState<HashtagSuggestions | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function getHashtags(text = keywords, on = platform) {
    setError(null)
    setLoading(true)
    const list = text.split(',').map((word) => word.trim()).filter(Boolean)
    try {
      setResult(await api.getHashtags(list, on))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load hashtags')
    } finally {
      setLoading(false)
    }
  }

  // A trend picked in "Current trends" fills the keywords and asks right away.
  useEffect(() => {
    if (query.n === 0) return
    setKeywords(query.text)
    void getHashtags(query.text)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.n])

  return (
    <Card className="hashtags hashtag-card" title={<>Hashtag suggestions <Pill>saved · sourced</Pill></>}>
      <div className="platform-tabs" role="tablist" aria-label="Platform">
        {PLATFORMS.map((name) => (
          <button
            key={name}
            role="tab"
            aria-selected={platform === name}
            className={platform === name ? 'active' : ''}
            onClick={() => {
              setPlatform(name)
              if (result) void getHashtags(keywords, name)
            }}
          >
            {PLATFORM_LABEL[name]}
          </button>
        ))}
      </div>
      <form
        className="hashtags-form"
        onSubmit={(event) => {
          event.preventDefault()
          void getHashtags()
        }}
      >
        <input
          aria-label="Keywords, comma-separated"
          value={keywords}
          placeholder="pumpkin latte, cozy autumn"
          onChange={(event) => setKeywords(event.target.value)}
        />
        <button type="submit" className="primary" disabled={loading}>
          {loading ? 'Getting…' : 'Get hashtags'}
        </button>
      </form>
      {error && <Muted>{error}</Muted>}
      {result && (
        <>
          {result.hashtags.length === 0 ? (
            <Muted>No sourced hashtags match these keywords yet.</Muted>
          ) : (
            <ul className="tag-chips">
              {result.hashtags.map((tag) => (
                <li key={tag.tag} className={`tag-chip kind-${tag.kind}`} title={tag.evidence}>
                  <span className="tag-name">{tag.tag}</span>
                  <span className="tag-kind">{KIND_LABEL[tag.kind]}</span>
                  <a href={tag.source_url} target="_blank" rel="noreferrer" aria-label={`Source for ${tag.tag}`}>
                    ↗
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p className="tag-limit">
            <strong>{PLATFORM_LABEL[platform]}:</strong> max {result.cap} here (Boabe rule).
            {result.platform_note ? ` ${result.platform_note}` : ''}
          </p>
          <Muted>
            Collected {result.collected_at ?? 'earlier'} from public sources (no scraping); hover a tag
            for why, ↗ opens its source.
          </Muted>
        </>
      )}
    </Card>
  )
}
