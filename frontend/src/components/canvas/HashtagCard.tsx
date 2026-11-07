import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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
import { stopOffset, type Point } from '../../lib/pollinate'
import { Card, Muted, Pill } from '../ui'
import { PollenBee } from './PollenBee'
import { centreIn, fly, reducedMotion, sparkle } from './pollinateFx'
import '../../styles/pollinate.css'

const FLYOVER_MAX = 4 // chips the bee visits when suggestions appear
const LEG_MS = 260 // per leg of the flight; a full flyover stays under ~1.4 s

const chipFor = (root: HTMLElement | null, selector: string, tag: string) =>
  root?.querySelector<HTMLElement>(`${selector}[data-tag="${CSS.escape(tag)}"]`) ?? null

interface Props {
  draft: Draft
  /** False once shipped, or while the backend runs a step. */
  enabled: boolean
  /** Saves the new hashtag list on the run (no AI call). */
  onChange: (hashtags: string[]) => Promise<void>
}

/**
 * Hashtags in the post (remove with one click) and saved suggestions to add, capped per platform.
 * A small bee "pollinates" the suggestions when they appear (pollen on the chips it could add), and
 * when one is added it flies to that chip ("+1") and the tag slides into the post's list.
 */
export function HashtagCard({ draft, enabled, onChange }: Props) {
  const [platform, setPlatform] = useState('instagram')
  const [found, setFound] = useState<HashtagSuggestions | null>(null)
  const keywordKey = extractKeywords(draft.caption).join(',')
  const stage = useRef<HTMLDivElement>(null)
  const bee = useRef<HTMLDivElement>(null)
  /** The tag just added and where its suggestion chip was, so the new chip can slide from there. */
  const arriving = useRef<{ tag: string; from: DOMRect } | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .getHashtags(keywordKey ? keywordKey.split(',') : [], platform)
      .then((result) => !cancelled && setFound(result))
      .catch(() => !cancelled && setFound(null))
    return () => {
      cancelled = true
    }
  }, [keywordKey, platform])

  const cap = found?.cap ?? 0
  const flyoverKey = found ? `${platform}:${found.hashtags.map((h) => h.tag).join(',')}` : ''

  // Suggestions appeared: the bee flies a curve over the chips it could add and dusts them.
  useEffect(() => {
    const root = stage.current
    if (!root || !flyoverKey || !enabled || reducedMotion()) return
    const picks = [...root.querySelectorAll<HTMLElement>('.hashtag-suggestions .hashtag-chip:not(:disabled)')]
      .slice(0, FLYOVER_MAX)
    if (picks.length === 0) return
    const centres = picks.map((chip) => centreIn(root, chip))
    const width = root.clientWidth
    const stops: Point[] = [{ x: -20, y: centres[0].y - 36 }, ...centres, { x: width + 20, y: centres.at(-1)!.y - 40 }]
    const duration = LEG_MS * (stops.length - 1)
    picks.forEach((chip, i) => sparkle(chip.parentElement, stopOffset(i + 1, stops.length) * duration))
    void fly(bee.current, stops, duration)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per new set of suggestions
  }, [flyoverKey])

  // A tag was just added: slide its new chip in from the suggestion it came from.
  useLayoutEffect(() => {
    const pending = arriving.current
    if (!pending || !draft.hashtags.includes(pending.tag)) return
    arriving.current = null
    const chip = chipFor(stage.current, '.hashtag-chip.current', pending.tag)
    if (!chip || reducedMotion()) return
    const to = chip.getBoundingClientRect()
    const dx = pending.from.left - to.left
    const dy = pending.from.top - to.top
    chip.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(1.08)`, opacity: 0.4 },
        { transform: 'translate(0, 0) scale(1.08)', opacity: 1, offset: 0.8 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 560, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
    )
    sparkle(chip, 380)
  }, [draft.hashtags])

  const add = (tag: string, button: HTMLElement) => {
    const root = stage.current
    if (root && !reducedMotion()) {
      arriving.current = { tag, from: button.getBoundingClientRect() }
      sparkle(button.parentElement, 0, '+1')
      const target = centreIn(root, button)
      const list = root.querySelector('.hashtag-chips')
      const end = list ? centreIn(root, list.lastElementChild ?? list) : { x: target.x, y: 0 }
      void fly(bee.current, [{ x: target.x - 50, y: target.y - 30 }, target, { x: end.x + 40, y: end.y - 10 }], 900)
    }
    void onChange(addTag(draft.hashtags, tag))
  }

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

      <div className="pollinate-stage" ref={stage}>
        <PollenBee ref={bee} />
        <div className="hashtag-chips" aria-label="Hashtags in the post">
          {draft.hashtags.length === 0 && <Muted>No hashtags in the post yet.</Muted>}
          {draft.hashtags.map((tag) => (
            <button
              key={tag}
              className="hashtag-chip current"
              data-tag={tag}
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
                    data-tag={item.tag}
                    disabled={!enabled || blocked !== ''}
                    title={blocked || 'Add to the post'}
                    onClick={(e) => add(item.tag, e.currentTarget)}
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
      </div>
      {found?.platform_note && <Muted>{found.platform_note}</Muted>}
    </Card>
  )
}
