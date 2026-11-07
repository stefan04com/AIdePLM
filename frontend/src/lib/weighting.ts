// Same formula as backend/app/weighting.py (spec: docs/comment-weighting.md), used by the
// in-browser mock. Pure functions with no value imports, so `npm test` can run them in Node.

export const VERIFIED_FACTOR = 3.0
export const REGULAR_FACTOR = 1.0
export const MIN_RECENCY = 0.1
export const UNKNOWN_DATE_RECENCY = 0.5
export const COMMENT_HALF_LIFE_MS = 24 * 60 * 60 * 1000
export const REVIEW_HALF_LIFE_MS = 365 * 24 * 60 * 60 * 1000

export interface Expert {
  name: string
  title: string
  industry: string
}

export interface ExpertsFile {
  brand_industry: string
  experts: Expert[]
}

export const expertiseFactor = (industryVerified: boolean) =>
  industryVerified ? VERIFIED_FACTOR : REGULAR_FACTOR

export function recencyFactor(createdAt: Date | null, now: Date, halfLifeMs: number): number {
  if (createdAt === null) return UNKNOWN_DATE_RECENCY
  const ageMs = Math.max(0, now.getTime() - createdAt.getTime()) // future date = brand new
  return Math.max(MIN_RECENCY, 0.5 ** (ageMs / halfLifeMs))
}

const round2 = (value: number) => Math.round(value * 100) / 100

export function weight(
  industryVerified: boolean,
  createdAt: Date | null,
  now: Date,
  halfLifeMs: number,
): number {
  return round2(expertiseFactor(industryVerified) * recencyFactor(createdAt, now, halfLifeMs))
}

const normalize = (text: string) => text.trim().split(/\s+/).join(' ').toLowerCase()

/** The expert behind `author`, only if they work in the brand's industry. */
export function findVerifiedExpert(author: string | null | undefined, file: ExpertsFile) {
  if (!author?.trim()) return null
  const expert = file.experts.find((e) => normalize(e.name) === normalize(author))
  if (!expert || normalize(expert.industry) !== normalize(file.brand_industry)) return null
  return expert
}
