import type { Ref } from 'react'
import { BEE } from './pollinateFx'

/** A compact honey bee (a cousin of Adobee) for the hashtag card. Hidden until it flies. */
export function PollenBee({ ref }: { ref: Ref<HTMLDivElement> }) {
  return (
    <div ref={ref} className="pollen-bee" aria-hidden>
      <svg viewBox="0 0 28 28" width={BEE} height={BEE}>
        <g className="pollen-bee-wings" fill="#ffffff" fillOpacity="0.85" stroke="#e8c8c0" strokeWidth="0.8">
          <ellipse cx="11" cy="8" rx="5" ry="6.5" transform="rotate(-20 11 8)" />
          <ellipse cx="17" cy="8" rx="4.5" ry="6" transform="rotate(20 17 8)" />
        </g>
        <ellipse cx="14" cy="16" rx="9" ry="7" fill="var(--honey)" />
        <path d="M10 9.6 v12.8 M15 9 v14" stroke="#2b1d1c" strokeWidth="2.4" />
        <circle cx="22" cy="14" r="4.2" fill="var(--accent)" />
        <circle cx="23.3" cy="13" r="1.1" fill="#fff" />
        <path d="M5 16 l-3 1.2 3 1.2z" fill="#2b1d1c" />
      </svg>
    </div>
  )
}
