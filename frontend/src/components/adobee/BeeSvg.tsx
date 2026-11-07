import { useId } from 'react'
import type { AdobeeMood } from '../../lib/adobee'

/** LED eyes on the visor; their shape (and the little LED mouth) shows the mood. */
function Face({ mood, glow }: { mood: AdobeeMood; glow: string }) {
  const stroke = { fill: 'none', stroke: `url(#${glow})`, strokeWidth: 3.4, strokeLinecap: 'round' as const }
  if (mood === 'happy') {
    return (
      <g className="bee-face">
        <path d="M42 56 q6 -8 12 0" {...stroke} />
        <path d="M66 56 q6 -8 12 0" {...stroke} />
        <path d="M55 63 q5 4 10 0" {...stroke} strokeWidth={2.4} />
      </g>
    )
  }
  if (mood === 'sad') {
    return (
      <g className="bee-face">
        <path d="M42 52 q6 6 12 3" {...stroke} />
        <path d="M66 55 q6 3 12 -3" {...stroke} />
        <path d="M55 65 q5 -3 10 0" {...stroke} strokeWidth={2.2} />
        <circle className="bee-tear" cx="47" cy="61" r="1.8" fill="#9fd8ff" />
      </g>
    )
  }
  const h = mood === 'working' ? 3.5 : mood === 'alert' ? 13 : 10.5
  const w = mood === 'alert' ? 11.5 : 9.5
  return (
    <g className="bee-face">
      <g className="bee-eyes" fill={`url(#${glow})`}>
        <rect x={49 - w / 2} y={53 - h / 2} width={w} height={h} rx={w / 2.1} />
        <rect x={71 - w / 2} y={53 - h / 2} width={w} height={h} rx={w / 2.1} />
      </g>
      {mood !== 'working' && (
        <g fill="#fff" opacity="0.9">
          <circle cx={47} cy={50} r={1.6} />
          <circle cx={69} cy={50} r={1.6} />
        </g>
      )}
      {mood === 'idle' || mood === 'curious' ? <path d="M56 63 q4 2.5 8 0" {...stroke} strokeWidth={2} /> : null}
    </g>
  )
}

/**
 * Adobee v3: a glossy red robot bee. Original artwork, layered like a 3D render: rim light,
 * speculars, a glass visor with a honeycomb reflection, veined iridescent wings, metal ear pods,
 * a glowing honey badge, little legs and a jet. Same 120×150 frame as before, so flights land
 * in the same place.
 */
export function BeeSvg({ mood, look }: { mood: AdobeeMood; look: { x: number; y: number } }) {
  const uid = useId().replace(/:/g, '')
  const id = (name: string) => `${name}-${uid}`
  const url = (name: string) => `url(#${id(name)})`
  return (
    <svg className="bee-svg" viewBox="0 0 120 150" aria-hidden>
      <defs>
        <radialGradient id={id('head')} cx="0.34" cy="0.28" r="0.85">
          <stop offset="0" stopColor="#ffb3a8" />
          <stop offset="0.28" stopColor="#ff4a3a" />
          <stop offset="0.7" stopColor="#d4141c" />
          <stop offset="1" stopColor="#6e0a12" />
        </radialGradient>
        <linearGradient id={id('rim')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#ffd2c8" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id={id('visor')} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#3d3a4a" />
          <stop offset="0.6" stopColor="#141220" />
          <stop offset="1" stopColor="#05040a" />
        </linearGradient>
        <radialGradient id={id('glow')} cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#fffbe8" />
          <stop offset="0.45" stopColor="#ffd458" />
          <stop offset="1" stopColor="#ff8a00" />
        </radialGradient>
        <linearGradient id={id('wing')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="0.4" stopColor="#c8ecff" stopOpacity="0.5" />
          <stop offset="0.75" stopColor="#e7c9ff" stopOpacity="0.42" />
          <stop offset="1" stopColor="#ffd0e4" stopOpacity="0.38" />
        </linearGradient>
        <linearGradient id={id('metal')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#c9c6d2" />
          <stop offset="1" stopColor="#6f6c7a" />
        </linearGradient>
        <linearGradient id={id('body')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0f0e14" />
          <stop offset="0.38" stopColor="#4a4656" />
          <stop offset="0.55" stopColor="#2a2733" />
          <stop offset="1" stopColor="#0f0e14" />
        </linearGradient>
        <linearGradient id={id('band')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff6b5c" />
          <stop offset="1" stopColor="#b80f17" />
        </linearGradient>
        <linearGradient id={id('honey')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe28a" />
          <stop offset="1" stopColor="#ef8a00" />
        </linearGradient>
        <radialGradient id={id('flame')} cx="0.5" cy="0.15" r="0.9">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.3" stopColor="#ffe08a" />
          <stop offset="0.7" stopColor="#ff8a1a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ff3d00" stopOpacity="0" />
        </radialGradient>
        <pattern id={id('hex')} width="8" height="13.8" patternUnits="userSpaceOnUse">
          <path d="M4 0 L8 2.3 L8 6.9 L4 9.2 L0 6.9 L0 2.3 Z" fill="none" stroke="#ffffff" strokeOpacity="0.07" strokeWidth="0.8" />
        </pattern>
        <clipPath id={id('visorClip')}>
          <rect x="33" y="38" width="54" height="31" rx="15.5" />
        </clipPath>
      </defs>

      {/* wings: a big and a small pair, veined */}
      <g className="bee-wings">
        <g className="bee-wing bee-wing-left">
          <path d="M44 48 C18 14 -6 30 6 52 C14 66 34 60 44 54 Z" fill={url('wing')} />
          <path d="M42 51 C30 40 18 34 10 40 M42 52 C30 50 18 52 12 56" className="bee-vein" />
          <path d="M44 58 C26 60 14 72 22 80 C30 86 40 72 45 62 Z" fill={url('wing')} opacity="0.85" />
        </g>
        <g className="bee-wing bee-wing-right">
          <path d="M76 48 C102 14 126 30 114 52 C106 66 86 60 76 54 Z" fill={url('wing')} />
          <path d="M78 51 C90 40 102 34 110 40 M78 52 C90 50 102 52 108 56" className="bee-vein" />
          <path d="M76 58 C94 60 106 72 98 80 C90 86 80 72 75 62 Z" fill={url('wing')} opacity="0.85" />
        </g>
      </g>

      {/* antennae with glowing honey bulbs */}
      <g stroke="#1b1a21" strokeWidth="2.6" strokeLinecap="round" fill="none">
        <path d="M49 24 Q44 10 36 5" />
        <path d="M71 24 Q76 10 84 5" />
      </g>
      <circle className="bee-bulb-glow" cx="36" cy="5" r="8" fill="#ffc94a" opacity="0.35" />
      <circle className="bee-bulb-glow" cx="84" cy="5" r="8" fill="#ffc94a" opacity="0.35" />
      <circle cx="36" cy="5" r="4.6" fill={url('honey')} />
      <circle cx="84" cy="5" r="4.6" fill={url('honey')} />
      <circle cx="34.6" cy="3.6" r="1.4" fill="#fff" opacity="0.9" />
      <circle cx="82.6" cy="3.6" r="1.4" fill="#fff" opacity="0.9" />

      {/* jet: nozzle and flame */}
      <path className="bee-flame" d="M52 124 Q60 152 68 124 Z" fill={url('flame')} />
      <rect x="53" y="118" width="14" height="7" rx="2.5" fill={url('metal')} />

      {/* legs */}
      <g stroke="#1b1a21" strokeWidth="2.4" strokeLinecap="round" fill="none" className="bee-legs">
        <path d="M49 116 q-4 6 -2 11" />
        <path d="M60 120 q0 6 0 9" />
        <path d="M71 116 q4 6 2 11" />
      </g>

      {/* body: dark capsule, red bands, honey badge */}
      <path d="M38 90 Q60 78 82 90 L78 116 Q60 128 42 116 Z" fill={url('body')} />
      <path d="M40 98 Q60 91 80 98 L79 105 Q60 98 41 105 Z" fill={url('band')} />
      <path d="M43 110 Q60 104 77 110 L76 115.5 Q60 110.5 44 115.5 Z" fill={url('band')} />
      <path d="M45 92 Q52 88 58 88" stroke="#fff" strokeOpacity="0.25" strokeWidth="2" fill="none" strokeLinecap="round" />
      <polygon className="bee-badge" points="60,84.5 65.5,87.7 65.5,94 60,97.2 54.5,94 54.5,87.7" fill={url('honey')} stroke="#ffe9a8" strokeWidth="0.8" />

      {/* arms with round mitts; the right one waves on hover */}
      <g className="bee-arm-left">
        <path d="M40 96 L30 104" stroke="#1b1a21" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="29" cy="105" r="4.2" fill={url('metal')} />
      </g>
      <g className="bee-arm-right">
        <path d="M80 96 L90 104" stroke="#1b1a21" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="91" cy="105" r="4.2" fill={url('metal')} />
      </g>

      {/* head: glossy sphere, seam, rim light, ear pods */}
      <circle cx="60" cy="54" r="35" fill={url('head')} />
      <circle cx="60" cy="54" r="35" fill="none" stroke={url('rim')} strokeWidth="3" />
      <path d="M26 46 Q60 28 94 46" fill="none" stroke="#5c0910" strokeOpacity="0.45" strokeWidth="2" />
      <g>
        <circle cx="24.5" cy="56" r="8.5" fill={url('metal')} stroke="#4d4a58" strokeWidth="1.2" />
        <circle cx="24.5" cy="56" r="4.6" fill="none" stroke="#8a8796" strokeWidth="1.2" />
        <circle className="bee-led" cx="24.5" cy="56" r="1.8" fill="#ff3b30" />
        <circle cx="95.5" cy="56" r="8.5" fill={url('metal')} stroke="#4d4a58" strokeWidth="1.2" />
        <circle cx="95.5" cy="56" r="4.6" fill="none" stroke="#8a8796" strokeWidth="1.2" />
        <circle className="bee-led" cx="95.5" cy="56" r="1.8" fill="#ff3b30" />
      </g>

      {/* glass visor with a honeycomb reflection, face and glare */}
      <rect x="33" y="38" width="54" height="31" rx="15.5" fill={url('visor')} stroke="#3a0a10" strokeWidth="1.6" />
      <rect x="33" y="38" width="54" height="31" rx="15.5" fill={url('hex')} />
      <g clipPath={url('visorClip')}>
        <g transform={`translate(${look.x} ${look.y})`}>
          <Face mood={mood} glow={id('glow')} />
        </g>
        <path d="M30 46 L52 30 L60 30 L36 52 Z" fill="#ffffff" opacity="0.12" />
      </g>
      <ellipse cx="41" cy="76" rx="5.5" ry="2.8" fill="#ff7c8a" opacity="0.55" className="bee-blush" />
      <ellipse cx="79" cy="76" rx="5.5" ry="2.8" fill="#ff7c8a" opacity="0.55" className="bee-blush" />

      {/* speculars */}
      <ellipse cx="44" cy="31" rx="10" ry="5" fill="#ffffff" opacity="0.42" transform="rotate(-26 44 31)" />
      <circle cx="35" cy="40" r="2.2" fill="#ffffff" opacity="0.55" />
    </svg>
  )
}
