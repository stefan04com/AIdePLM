import type { Comment } from '../../api/types'
import { useNow } from '../../hooks/useNow'
import { formatElapsed } from '../../lib/format'

interface Props {
  /** When the run started; review time is counted from here. */
  startedAt: string
  /** This reviewer's first comment, if any: the timer stops there. */
  firstComment: Comment | undefined
  /** False once the review is over, so a silent reviewer's timer stops ticking. */
  live: boolean
}

/** Display-only timer on a reviewer card: "waiting 1m 20s" until they reply, then "replied in 45s". */
export function ReviewerTimer({ startedAt, firstComment, live }: Props) {
  const now = useNow(live && !firstComment)

  if (firstComment) {
    return <span className="timer done">replied in {formatElapsed(startedAt, firstComment.created_at)}</span>
  }
  return <span className="timer">waiting {formatElapsed(startedAt, now)}</span>
}
