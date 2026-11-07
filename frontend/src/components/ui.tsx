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

/** Gray helper text, used for empty and placeholder states. */
export function Muted({ children }: { children: ReactNode }) {
  return <p className="muted">{children}</p>
}
