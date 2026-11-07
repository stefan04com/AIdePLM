import type { Draft } from '../../api/types'
import { BRAND_HANDLE, BRAND_NAME, EXPRESS_HOME_URL } from '../../lib/brand'
import { Badge } from '../ui'

/** The draft as a social post inside an Adobe Express frame (demo script 0:40 and 2:10). */
export function ExpressPreview({ draft }: { draft: Draft }) {
  const updated = draft.version > 1

  return (
    <article className="express">
      <header className="express-bar">
        <span className="express-logo" aria-hidden>
          Ae
        </span>
        <strong>Adobe Express</strong>
        <span className="muted">{draft.express_doc_id ?? 'preview'}</span>
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
        <p className="caption">{draft.caption}</p>
        <p className="hashtags">{draft.hashtags.join(' ')}</p>
      </div>

      <footer className="express-footer">
        <a href={EXPRESS_HOME_URL} target="_blank" rel="noreferrer">
          Open in Express ↗
        </a>
      </footer>
    </article>
  )
}
