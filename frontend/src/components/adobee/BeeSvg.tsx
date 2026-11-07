import { useId } from 'react'
import type { AdobeeMood } from '../../lib/adobee'

/** Eyes on the visor screen; their shape shows the mood. */
function Eyes({ mood, glow }: { mood: AdobeeMood; glow: string }) {
  if (mood === 'happy' || mood === 'sad') {
    const d = mood === 'happy' ? ['M43 57 q6 -8 12 0', 'M65 57 q6 -8 12 0'] : ['M43 53 q6 7 12 3', 'M65 56 q6 4 12 -3']
    return (
      <g className="bee-eye-lines" fill="none" stroke={`url(#${glow})`} strokeWidth="3.4" strokeLinecap="round">
        <path d={d[0]} />
        <path d={d[1]} />
      </g>
    )
  }
  const h = mood === 'working' ? 4 : mood === 'alert' ? 13 : 10
  const w = mood === 'alert' ? 11 : 9
  return (
    <g className="bee-eyes" fill={`url(#${glow})`}>
      <rect x={49 - w / 2} y={54 - h / 2} width={w} height={h} rx={w / 2.2} />
      <rect x={71 - w / 2} y={54 - h / 2} width={w} height={h} rx={w / 2.2} />
    </g>
  )
}

/** Adobee, drawn as a glossy red robot bee. Original artwork; gradients only on the bee itself. */
export function BeeSvg({ mood, look }: { mood: AdobeeMood; look: { x: number; y: number } }) {
  const uid = useId().replace(/:/g, '')
  const id = (name: string) => `${name}-${uid}`
  return (
    <svg className="bee-svg" viewBox="0 0 120 150" aria-hidden>
      <defs>
        <radialGradient id={id('head')} cx="0.36" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ff8f93" />
          <stop offset="0.45" stopColor="#e5404b" />
          <stop offset="1" stopColor="#8f1f2a" />
        </radialGradient>
        <linearGradient id={id('visor')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3844" />
          <stop offset="1" stopColor="#09080c" />
        </linearGradient>
        <radialGradient id={id('glow')} cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#fff8dc" />
          <stop offset="0.5" stopColor="#ffd25e" />
          <stop offset="1" stopColor="#ff9a1f" />
        </radialGradient>
        <linearGradient id={id('wing')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="0.55" stopColor="#b9e3ff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffc6ea" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id={id('metal')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7f6fa" />
          <stop offset="1" stopColor="#8d8a97" />
        </linearGradient>
        <linearGradient id={id('body')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#14131a" />
          <stop offset="0.45" stopColor="#3b3844" />
          <stop offset="1" stopColor="#14131a" />
        </linearGradient>
        <linearGradient id={id('honey')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd970" />
          <stop offset="1" stopColor="#e68a00" />
        </linearGradient>
      </defs>

      <g className="bee-wings">
        <path className="bee-wing bee-wing-left" d="M42 46 C14 18 -2 40 8 56 C16 68 34 60 42 52 Z" fill={`url(#${id('wing')})`} />
        <path className="bee-wing bee-wing-right" d="M78 46 C106 18 122 40 112 56 C104 68 86 60 78 52 Z" fill={`url(#${id('wing')})`} />
      </g>

      <g className="bee-antennae" stroke="#1b1a21" strokeWidth="2.6" strokeLinecap="round" fill="none">
        <path d="M49 24 Q44 12 38 6" />
        <path d="M71 24 Q76 12 82 6" />
      </g>
      <circle className="bee-tip" cx="38" cy="6" r="4.6" fill={`url(#${id('honey')})`} />
      <circle className="bee-tip" cx="82" cy="6" r="4.6" fill={`url(#${id('honey')})`} />

      <path className="bee-flame" d="M54 124 Q60 146 66 124 Z" fill={`url(#${id('honey')})`} />
      <path d="M40 92 Q60 80 80 92 L76 117 Q60 130 44 117 Z" fill={`url(#${id('body')})`} />
      <path d="M41 100 Q60 94 79 100 L78 106 Q60 100 42 106 Z" fill="#e5404b" />
      <path d="M44 111 Q60 106 76 111 L75 116 Q60 112 45 116 Z" fill="#e5404b" />
      <polygon className="bee-badge" points="60,86 65,89 65,95 60,98 55,95 55,89" fill={`url(#${id('honey')})`} />
      <g stroke="#1b1a21" strokeWidth="5" strokeLinecap="round">
        <path d="M41 97 L31 105" />
        <path d="M79 97 L89 105" />
      </g>

      <circle cx="60" cy="54" r="35" fill={`url(#${id('head')})`} />
      <path d="M27 44 Q60 27 93 44" fill="none" stroke="#7d1a24" strokeWidth="3" opacity="0.6" />
      <circle cx="25" cy="56" r="7.5" fill={`url(#${id('metal')})`} stroke="#5d5a66" strokeWidth="1.5" />
      <circle cx="95" cy="56" r="7.5" fill={`url(#${id('metal')})`} stroke="#5d5a66" strokeWidth="1.5" />
      <rect x="33" y="39" width="54" height="31" rx="15.5" fill={`url(#${id('visor')})`} stroke="#2a0e12" strokeWidth="1.5" />
      <g transform={`translate(${look.x} ${look.y})`}>
        <Eyes mood={mood} glow={id('glow')} />
      </g>
      <path d="M40 44 Q52 38 66 40" fill="none" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="45" cy="32" rx="9" ry="4.5" fill="#ffffff" opacity="0.32" transform="rotate(-24 45 32)" />
    </svg>
  )
}
