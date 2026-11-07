/** Shown instead of a draft when the fit check rejects a trend: the brand-safety beat. */
export function BrandShield({ reason }: { reason: string | null }) {
  return (
    <div className="shield" role="status">
      <svg className="shield-icon" viewBox="0 0 64 72" aria-hidden>
        <path d="M32 2 L60 12 V34 C60 52 47 64 32 70 C17 64 4 52 4 34 V12 Z" />
        <path className="shield-x" d="M22 26 L42 46 M42 26 L22 46" />
      </svg>
      <p className="shield-title">Blocked by brand safety</p>
      <p className="shield-reason">{reason ?? 'This trend does not fit the brand.'}</p>
      <p className="shield-note">No draft made, no reviewer hours spent.</p>
    </div>
  )
}
