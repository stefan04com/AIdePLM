// The scripted Brand/Legal/Product comments from the fixture, as request bodies.
// The "Fill scripted comments" button posts these through api.addComment, so it
// works against both the mock and the real backend. Keep in sync with
// data/demo_comments.json once Anda adds it.

import type { CommentCreate } from '../api/types'
import { fixtureRun } from './fixtures'

export const scriptedComments: CommentCreate[] = fixtureRun.comments.map(({ role, text }) => ({
  role,
  text,
}))
