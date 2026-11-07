// Small shared building blocks, so cards and badges look the same everywhere.

import type { ReactNode } from 'react'
import { type Tone, toneClass } from '../lib/tones'

interface CardProps {
  title?: ReactNode
  /** Adds a coloured left border in this tone. */
  accent?: Tone
  className?: string
  children: ReactNode
}

export function Card({ title, accent, className = '', children }: CardProps) {
  const accentClass = accent ? `accent-left ${toneClass(accent)}` : ''
  return (
    <article className={`card ${accentClass} ${className}`.trim()}>
      {title && <h4>{title}</h4>}
      {children}
    </article>
  )
}

interface BadgeProps {
  tone?: Tone
  title?: string
  children: ReactNode
}

export function Badge({ tone = 'neutral', title, children }: BadgeProps) {
  return (
    <span className={`badge ${toneClass(tone)}`} title={title}>
      {children}
    </span>
  )
}

/** Full-width tinted message: errors (bad), warnings (warn), confirmations (ok). */
export function Banner({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <div className={`banner ${toneClass(tone)}`} role={tone === 'bad' ? 'alert' : 'status'}>
      {children}
    </div>
  )
}

interface SectionHeadProps {
  /** Two-digit panel number shown in mono, e.g. "01". */
  id?: string
  title: ReactNode
  /** Small info on the right: a pill, a total, a status. */
  aside?: ReactNode
}

/** Panel title row: "01  SIGNAL INTELLIGENCE ............ [saved]". */
export function SectionHead({ id, title, aside }: SectionHeadProps) {
  return (
    <header className="section-head">
      {id && <span className="section-id">{id}</span>}
      <h2>{title}</h2>
      {aside && <div className="section-aside">{aside}</div>}
    </header>
  )
}

/** Small monospace label for data: ids, sources, versions, totals. */
export function Pill({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`pill ${toneClass(tone)}`}>{children}</span>
}

/** Gray helper text, used for empty and placeholder states. */
export function Muted({ children }: { children: ReactNode }) {
  return <p className="muted">{children}</p>
}
