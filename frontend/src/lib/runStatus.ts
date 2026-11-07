// Which run statuses allow what. Single source of truth for the UI.

import type { Run, RunStatus } from '../api/types'

const FINISHED: RunStatus[] = ['SHIPPED', 'REJECTED']
const REVIEWABLE: RunStatus[] = ['DRAFTED', 'IN_REVIEW', 'REFEREED']

/** True when the run can no longer change (polling stops, a new run can start). */
export const isFinished = (run: Run | null): boolean =>
  run !== null && FINISHED.includes(run.status)

/** True when reviewers can comment and personas can react. */
export const isReviewable = (run: Run | null): boolean =>
  run !== null && REVIEWABLE.includes(run.status)
