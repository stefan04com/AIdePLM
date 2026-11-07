// Display labels for contract enums, shared by every component that shows them.

import type { Comment, CommentRole, Edit } from '../api/types'

export const ROLE_LABEL: Record<CommentRole, string> = {
  brand: 'Brand',
  legal: 'Legal',
  product: 'Product',
}

export const ROLES = Object.keys(ROLE_LABEL) as CommentRole[]

export const EDIT_TARGET_LABEL: Record<Edit['target'], string> = {
  caption: 'Caption',
  visual_prompt: 'Visual',
  hashtags: 'Hashtags',
}

/** "Legal" for the comment that triggered an edit, or null if it isn't in the run. */
export function commentAuthor(comments: Comment[], commentId: string): string | null {
  const comment = comments.find((c) => c.id === commentId)
  return comment ? ROLE_LABEL[comment.role] : null
}
