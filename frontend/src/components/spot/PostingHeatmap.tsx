import { type CSSProperties, type PointerEvent, useEffect, useRef, useState } from 'react'
import { api } from '../../api/client'
import type { PostingWindows } from '../../api/types'
import {
  HEATMAP_PLATFORMS,
  HOURS,
  type Slot,
  WEEK,
  bestSlot,
  dayShort,
  heatGrid,
  hourLabel,
  slotLabel,
  sourceShort,
} from '../../lib/postingHeatmap'
import type { Tone } from '../../lib/tones'
import { BeeSvg } from '../adobee/BeeSvg'
import { Pill } from '../ui'
import '../../styles/posting-heatmap.css'

const FLIGHT_MS = 1100 // keep in sync with .ph-bee in posting-heatmap.css
const CONFIDENCE_TONE: Record<PostingWindows['confidence'], Tone> = { high: 'ok', medium: 'warn', low: 'neutral' }
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

interface Flight {
  platform: string
  stuck: boolean
  vars: CSSProperties // --fx/--fy start, --tx/--ty target, --peak arc top (px, inside .ph)
}

/** "When we post": week × hour heatmap of the saved report windows, with a bee that schedules. */
export function PostingHeatmap() {
  const [platform, setPlatform] = useState<string>(HEATMAP_PLATFORMS[0].key)
  const [data, setData] = useState<Record<string, PostingWindows | 'error'>>({})
  const [hover, setHover] = useState<Slot | null>(null)
  const [flight, setFlight] = useState<Flight | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (platform in data) return
    let alive = true
    api
      .getPostingWindows(platform)
      .then((windows) => alive && setData((d) => ({ ...d, [platform]: windows })))
      .catch(() => alive && setData((d) => ({ ...d, [platform]: 'error' })))
    return () => {
      alive = false
    }
  }, [platform, data])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const current = data[platform]
  const windows = current && current !== 'error' ? current : null
  const best = windows ? bestSlot(windows) : null
  const grid = windows ? heatGrid(windows) : null
  const scheduled = flight?.platform === platform ? flight : null

  const pick = (key: string) => {
    window.clearTimeout(timer.current)
    setFlight(null)
    setHover(null)
    setPlatform(key)
  }

  const schedule = () => {
    const wrap = wrapRef.current?.getBoundingClientRect()
    const from = buttonRef.current?.getBoundingClientRect()
    const to = wrapRef.current?.querySelector('.ph-cell.is-best')?.getBoundingClientRect()
    if (!wrap || !from || !to) return
    const fx = from.left + from.width / 2 - wrap.left
    const fy = from.top + from.height / 2 - wrap.top
    const tx = to.left + to.width / 2 - wrap.left
    const ty = to.top + to.height / 2 - wrap.top
    const vars = { '--fx': `${fx}px`, '--fy': `${fy}px`, '--tx': `${tx}px`, '--ty': `${ty}px`, '--peak': `${Math.min(fy, ty) - 46}px` } as CSSProperties
    window.clearTimeout(timer.current)
    const instant = reducedMotion()
    setFlight({ platform, stuck: instant, vars })
    if (!instant) timer.current = window.setTimeout(() => setFlight((f) => (f ? { ...f, stuck: true } : f)), FLIGHT_MS)
  }

  const onOver = (event: PointerEvent<HTMLDivElement>) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>('.ph-cell')
    if (!cell) return
    setHover({ day: WEEK[Number(cell.dataset.row)], hour: HOURS[Number(cell.dataset.col)] })
  }

  const hoverLevel = hover && grid ? grid[WEEK.indexOf(hover.day)][HOURS.indexOf(hover.hour)] : 0

  return (
    <div className="card ph" ref={wrapRef}>
      <div className="ph-head">
        <h4>When we post</h4>
        <div className="ph-tabs" role="tablist" aria-label="Platform">
          {HEATMAP_PLATFORMS.map((p) => (
            <button key={p.key} role="tab" aria-selected={p.key === platform} className={p.key === platform ? 'is-on' : ''} onClick={() => pick(p.key)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {current === 'error' && <p className="muted">No posting data for this platform.</p>}
      {!current && <p className="muted">Loading the report windows…</p>}

      {windows && grid && (
        <>
          <div className="ph-grid" key={platform} onPointerOver={onOver} onPointerLeave={() => setHover(null)} role="img" aria-label={`Best windows on ${platform}; best slot ${best ? slotLabel(best) : 'none'}`}>
            <span />
            {HOURS.map((hour) => (
              <span key={hour} className="ph-hour" aria-hidden>
                {hour % 3 === 0 ? String(hour).padStart(2, '0') : ''}
              </span>
            ))}
            {WEEK.map((day, row) => (
              <Row key={day} row={row} levels={grid[row]} best={best?.day === day ? HOURS.indexOf(best.hour) : -1} card={scheduled?.stuck && best ? slotLabel(best) : null} />
            ))}
          </div>

          <div className="ph-readout" aria-live="polite">
            {hover
              ? `${dayShort(hover.day)} ${hourLabel(hover.hour)} · ${hoverLevel >= 1 ? 'best day, in window' : hoverLevel > 0 ? 'in a recommended window' : 'outside the windows'}`
              : best
                ? `Best slot: ${slotLabel(best)} · audience's local time, industry averages`
                : 'No window in this range'}
          </div>

          <div className="ph-foot">
            <span title={windows.reason}>
              <Pill tone={CONFIDENCE_TONE[windows.confidence]}>{windows.confidence} confidence</Pill>
            </span>
            <button ref={buttonRef} className="primary ph-schedule" onClick={schedule} disabled={!best || (scheduled !== null && !scheduled.stuck)}>
              {scheduled?.stuck ? 'Scheduled ✓' : 'Schedule'}
            </button>
          </div>
          <div className="ph-sources">
            Sources:{' '}
            {windows.sources.map((s, i) => (
              <span key={s.url + i}>
                {i > 0 && ' · '}
                <a href={s.url} target="_blank" rel="noreferrer" title={s.name}>
                  {sourceShort(s.name)}
                </a>
              </span>
            ))}
          </div>
        </>
      )}

      {scheduled && !scheduled.stuck && (
        <div className="ph-bee" style={scheduled.vars} aria-hidden>
          <div className="ph-bee-y">
            <BeeSvg mood="happy" look={{ x: 1, y: 0 }} />
          </div>
        </div>
      )}
    </div>
  )
}

/** One day of cells. `best` is the column of the pulsing slot (-1 if not this day). */
function Row({ row, levels, best, card }: { row: number; levels: number[]; best: number; card: string | null }) {
  return (
    <>
      <span className="ph-day">{dayShort(WEEK[row])}</span>
      {levels.map((level, col) => {
        const isBest = col === best
        const style = { '--i': level, '--d': `${col * 22 + row * 14}ms` } as CSSProperties
        const side = col > HOURS.length * 0.6 ? 'right' : col < HOURS.length * 0.3 ? 'left' : 'center'
        return (
          <span key={col} className={`ph-cell${level > 0 ? ' is-on' : ''}${isBest ? ' is-best' : ''}`} style={style} data-row={row} data-col={col}>
            {isBest && card && (
              <span className={`ph-card ph-card--${side}${row < 2 ? ' ph-card--below' : ''}`} role="status">
                <span className="ph-card-bee" aria-hidden>
                  <BeeSvg mood="happy" look={{ x: 0, y: 1 }} />
                </span>
                Scheduled: <strong>{card}</strong>
              </span>
            )}
          </span>
        )
      })}
    </>
  )
}
