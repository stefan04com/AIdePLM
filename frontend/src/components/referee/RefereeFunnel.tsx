import type { CSSProperties } from 'react'
import type { Comment, PersonaReaction } from '../../api/types'
import { funnelCaption, funnelChips } from '../../lib/funnel'
import { BeeSvg } from '../adobee/BeeSvg'
import '../../styles/funnel.css'

const STILL = { x: 0, y: 0 }

/** The bee in its hexagon: spins while weighing, pops when the answer is in. */
export function FunnelHive({ resolved = false }: { resolved?: boolean }) {
  return (
    <span className={`funnel-hive${resolved ? ' is-resolved' : ''}`} aria-hidden>
      <span className="funnel-hex" />
      <span className="funnel-ring" />
      <span className="funnel-bee">
        <BeeSvg mood={resolved ? 'happy' : 'working'} look={STILL} />
      </span>
    </span>
  )
}

interface Props {
  comments: Comment[]
  reactions: PersonaReaction[]
  /** True once the Referee answered: chips stop, the hive pops, then the funnel goes away. */
  resolved: boolean
  conflicts: number
}

/**
 * While the Referee call runs (~10-22 s live), every review voice flies into one hive: human
 * comments from the left, synthetic customers from the right, in a gentle loop. The point at a
 * glance: one AI call weighs everyone together.
 */
export function RefereeFunnel({ comments, reactions, resolved, conflicts }: Props) {
  const chips = funnelChips(comments, reactions)
  const caption = resolved
    ? `${conflicts} conflict${conflicts === 1 ? '' : 's'} found: see the Referee below`
    : funnelCaption(comments.length, reactions.length)

  return (
    <div className={`funnel${resolved ? ' is-resolved' : ''}`} role="status" aria-live="polite">
      <div className="funnel-stage">
        <span className="funnel-side-label funnel-left-label">Humans</span>
        <span className="funnel-side-label funnel-right-label">Customers</span>
        {!resolved &&
          chips.map((chip) => (
            <span
              key={chip.key}
              className={`funnel-chip funnel-${chip.kind}`}
              style={{ '--delay': `${chip.delayMs}ms` } as CSSProperties}
            >
              {chip.label}
            </span>
          ))}
        <FunnelHive resolved={resolved} />
      </div>
      <p className="funnel-caption">{caption}</p>
    </div>
  )
}
