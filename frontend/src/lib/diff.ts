// Word-level diff, so an edit card shows exactly which words the Referee changed.

export interface DiffPart {
  kind: 'same' | 'removed' | 'added'
  text: string
}

/**
 * Splits into words with their trailing whitespace ("Our ", "Double "), so spaces never match
 * on their own and changed words stay grouped. Joining the tokens gives the text back.
 */
const tokenize = (text: string) => text.match(/\S+\s*|\s+/g) ?? []

/** lcs[i][j] = length of the longest common subsequence of a[i..] and b[j..]. */
function lcsTable(a: string[], b: string[]): number[][] {
  const table = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] =
        a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1])
    }
  }
  return table
}

/** Appends a token, merging it into the previous part when the kind is the same. */
function push(parts: DiffPart[], kind: DiffPart['kind'], text: string) {
  const last = parts.at(-1)
  if (last && last.kind === kind) last.text += text
  else parts.push({ kind, text })
}

export function diffWords(before: string, after: string): DiffPart[] {
  const a = tokenize(before)
  const b = tokenize(after)
  const lcs = lcsTable(a, b)
  const parts: DiffPart[] = []
  let i = 0
  let j = 0

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push(parts, 'same', a[i])
      i++
      j++
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      push(parts, 'removed', a[i++])
    } else {
      push(parts, 'added', b[j++])
    }
  }
  while (i < a.length) push(parts, 'removed', a[i++])
  while (j < b.length) push(parts, 'added', b[j++])
  return parts
}
