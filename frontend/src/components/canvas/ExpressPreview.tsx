import type { Draft } from '../../api/types'
import { BRAND_HANDLE, BRAND_NAME } from '../../lib/brand'
import { Badge } from '../ui'
import { AFTER_SHIP_S, MorphCaption } from '../wow/MorphCaption'

/**
 * The draft as a social post (demo script 0:40 and 2:10). A local simulation: the backend
 * makes a placeholder visual and a versioned mock post; nothing is sent to Adobe.
 */
export function ExpressPreview({ draft }: { draft: Draft }) {
  const updated = draft.version > 1

  return (
    <article className={`express ${updated ? 'is-updated' : ''}`}>
      <header className="express-bar">
        <strong>Post preview</strong>
        <span className="muted">Simulated · Adobe Express-ready</span>
        <Badge tone={updated ? 'ok' : 'neutral'}>
          v{draft.version}
          {updated && ' · updated by Referee'}
        </Badge>
      </header>

      <div className="post">
        <div className="post-author">
          <span className="avatar" aria-hidden>
            {BRAND_NAME[0]}
          </span>
          <div>
            <strong>{BRAND_NAME}</strong>
            <div className="muted">{BRAND_HANDLE}</div>
          </div>
        </div>
        {draft.image_url ? (
          <img src={draft.image_url} alt={draft.visual_prompt} />
        ) : (
          <div className="image-placeholder">{draft.visual_prompt}</div>
        )}
        {/* after a ship the celebration plays first; a regenerated caption pours in right away */}
        <MorphCaption caption={draft.caption} start={updated ? AFTER_SHIP_S : 0.2} />
        <p className="hashtags">{draft.hashtags.join(' ')}</p>
      </div>

      <footer className="express-footer">
        <span className="muted">Can be published through Adobe Express later</span>
      </footer>
    </article>
  )
}
