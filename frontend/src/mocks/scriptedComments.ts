// The scripted Brand/Legal/Product comments, same texts as data/demo_comments.json.
// - "Fill scripted comments" posts all three (rehearsals and backup).
// - On stage (docs/demo-script.md) judges type Brand and Legal; only Product is pre-filled.

import type { CommentCreate, CommentRole } from '../api/types'
import { fixtureRun } from './fixtures'

export const scriptedComments: CommentCreate[] = fixtureRun.comments.map(({ role, text }) => ({
  role,
  text,
}))

const PREFILLED_ROLES: CommentRole[] = ['product']

/** Text the comment box starts with for this role ('' for roles the judges type). */
export function prefilledComment(role: CommentRole): string {
  if (!PREFILLED_ROLES.includes(role)) return ''
  return scriptedComments.find((c) => c.role === role)?.text ?? ''
}
