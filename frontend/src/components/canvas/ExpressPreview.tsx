import type { Draft } from '../../api/types'
import type { Firefly } from '../../hooks/useFirefly'
import { BRAND_HANDLE, BRAND_NAME } from '../../lib/brand'
import { Badge } from '../ui'
import { AFTER_SHIP_S } from '../../lib/wow'
import { MorphCaption } from '../wow/MorphCaption'

interface Props {
  draft: Draft
  /** The Firefly mock: its button sits on the image; the image only changes when it is pressed. */
  firefly: Firefly
  canGenerate: boolean
}

/**
 * The draft as a social post (demo script 0:40 and 2:10). A local simulation: the backend
 * makes a placeholder visual and a versioned mock post; nothing is sent to Adobe.
 */
export function ExpressPreview({ draft, firefly, canGenerate }: Props) {
  const updated = draft.version > 1
  const image = firefly.image?.url ?? draft.image_url

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
        <div className={`post-visual ${firefly.generating ? 'is-generating' : ''}`}>
          {image ? (
            // a new key fades the generated image in over the old one
            <img key={image} src={image} alt={draft.visual_prompt} className={firefly.image ? 'is-generated' : ''} />
          ) : (
            <div className="image-placeholder">{draft.visual_prompt}</div>
          )}
          {firefly.generating && (
            <div className="firefly-veil" role="status">
              <span className="firefly-spark" aria-hidden>
                ✦
              </span>
              {firefly.step}
            </div>
          )}
          {firefly.image && !firefly.generating && (
            <span className="firefly-tag">
              ✦ Adobe Firefly <span className="muted">· simulated</span>
            </span>
          )}
          {canGenerate && !firefly.generating && (
            <div className="firefly-actions">
              {firefly.image ? (
                <button type="button" className="firefly-undo" onClick={firefly.undo}>
                  Back to the original
                </button>
              ) : (
                <button type="button" className="firefly-button" onClick={firefly.generate}>
                  ✦ Generate with Firefly
                </button>
              )}
            </div>
          )}
        </div>
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
