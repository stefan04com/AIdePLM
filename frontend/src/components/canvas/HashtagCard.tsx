import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { Draft, HashtagSuggestions } from '../../api/types'
import {
  addBlocker,
  addTag,
  extractKeywords,
  HASHTAG_PLATFORMS,
  KIND_LABEL,
  removeTag,
} from '../../lib/hashtags'
import { Card, Muted, Pill } from '../ui'

interface Props {
  draft: Draft
  /** False once shipped, or while the backend runs a step. */
  enabled: boolean
  /** Saves the new hashtag list on the run (no AI call). */
  onChange: (hashtags: string[]) => Promise<void>
}

/** Hashtags in the post (remove with one click) and saved suggestions to add, capped per platform. */
export function HashtagCard({ draft, enabled, onChange }: Props) {
  const [platform, setPlatform] = useState('instagram')
  const [found, setFound] = useState<HashtagSuggestions | null>(null)
  const keywordKey = extractKeywords(draft.caption).join(',')

  useEffect(() => {
    let cancelled = false
    api
      .getHashtagSuggestions(keywordKey ? keywordKey.split(',') : [], platform)
      .then((result) => !cancelled && setFound(result))
      .catch(() => !cancelled && setFound(null))
    return () => {
      cancelled = true
    }
  }, [keywordKey, platform])

  const cap = found?.cap ?? 0

  return (
    <Card title={<>Hashtags <Pill>saved suggestions</Pill></>} className="hashtag-card">
      <div className="hashtag-row">
        <label htmlFor="hashtag-platform">Platform</label>
        <select id="hashtag-platform" value={platform} onChange={(e) => setPlatform(e.target.value)}>
          {HASHTAG_PLATFORMS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        {cap > 0 && (
          <span className="muted">
            {draft.hashtags.length}/{cap} used
          </span>
        )}
      </div>

      <div className="hashtag-chips" aria-label="Hashtags in the post">
        {draft.hashtags.length === 0 && <Muted>No hashtags in the post yet.</Muted>}
        {draft.hashtags.map((tag) => (
          <button
            key={tag}
            className="hashtag-chip current"
            disabled={!enabled}
            title="Remove from the post"
            onClick={() => onChange(removeTag(draft.hashtags, tag))}
          >
            {tag} ×
          </button>
        ))}
      </div>

      {found && found.hashtags.length > 0 ? (
        <ul className="hashtag-suggestions">
          {found.hashtags.map((item) => {
            const blocked = addBlocker(draft.hashtags, item.tag, cap)
            return (
              <li key={item.tag}>
                <button
                  className="hashtag-chip"
                  disabled={!enabled || blocked !== ''}
                  title={blocked || 'Add to the post'}
                  onClick={() => onChange(addTag(draft.hashtags, item.tag))}
                >
                  + {item.tag}
                </button>
                <span className="muted">
                  {KIND_LABEL[item.kind]} · {item.evidence}
                </span>
              </li>
            )
          })}
        </ul>
      ) : (
        <Muted>No saved suggestions match this post yet.</Muted>
      )}
      {found?.platform_note && <Muted>{found.platform_note}</Muted>}
    </Card>
  )
}
