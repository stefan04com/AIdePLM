// Which run statuses allow what. Mirrors backend/app/orchestrator.py; single source for the UI.

import type { Run, RunStatus } from '../api/types'

const inStatus = (run: Run | null, statuses: RunStatus[]): boolean =>
  run !== null && statuses.includes(run.status)

/** True when the run can no longer change (polling stops, a new run can start). */
export const isFinished = (run: Run | null) => inStatus(run, ['SHIPPED', 'REJECTED'])

/** True when reviewers can add comments (a comment after REFEREED re-opens the review). */
export const isReviewable = (run: Run | null) => inStatus(run, ['DRAFTED', 'IN_REVIEW', 'REFEREED'])

/** True when personas can react. The backend allows this only before the referee. */
export const canRequestReactions = (run: Run | null) => inStatus(run, ['DRAFTED', 'IN_REVIEW'])

export const canReferee = (run: Run | null) => inStatus(run, ['IN_REVIEW'])

export const canApply = (run: Run | null) => inStatus(run, ['REFEREED'])

/** True while the backend is running a step for this run (it answers 409 to new actions). */
export const isRunBusy = (run: Run | null) => run?.step != null
