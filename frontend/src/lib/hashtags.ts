// Helpers for the hashtag suggestions card. Pure, so they are tested.

export const HASHTAG_PLATFORMS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'x', label: 'X' },
  { id: 'linkedin', label: 'LinkedIn' },
] as const

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'you', 'your', 'our', 'are', 'was', 'when', 'from',
  'into', 'but', 'not', 'all', 'can', 'its', 'still', 'let', 'one', 'out', 'app', 'order',
])

/** Words of the post that can match a saved topic: lower case, 3+ letters, no stop words, unique. */
export function extractKeywords(text: string, limit = 40): string[] {
  const words = text
    .toLowerCase()
    .replace(/#/g, ' ')
    .match(/[\p{L}]{3,}/gu) ?? []
  return [...new Set(words.filter((w) => !STOP_WORDS.has(w)))].slice(0, limit)
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

export const hasTag = (current: readonly string[], tag: string) => current.some((t) => same(t, tag))

/** The hashtag list after adding `tag`, or the same list if it is already there. */
export function addTag(current: readonly string[], tag: string): string[] {
  return hasTag(current, tag) ? [...current] : [...current, tag]
}

export const removeTag = (current: readonly string[], tag: string): string[] =>
  current.filter((t) => !same(t, tag))

/** Why a suggestion can't be added, or '' if it can. */
export function addBlocker(current: readonly string[], tag: string, cap: number): string {
  if (hasTag(current, tag)) return 'Already in the post'
  if (cap > 0 && current.length >= cap) return `This platform allows ${cap} hashtags`
  return ''
}

export const KIND_LABEL = {
  niche: 'niche',
  local: 'local',
  'branded-generic': 'brand',
  broad: 'broad',
} as const
