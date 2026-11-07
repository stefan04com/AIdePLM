// What the scoring and the recommendations are based on, shown on the Rules page.
// Sources: docs/comment-weighting.md, docs/trending-research.md, docs/what-makes-a-post-popular.md.
// Confidence tags: official = the platform said it; consistent = many sources agree; single = one source.

export type Confidence = 'official' | 'consistent' | 'single' | 'ours'

export interface Rule {
  name: string
  what: string
  source: string
  confidence: Confidence
}

/** The factors in the Analysis panel (lib/factors.ts). */
export const SCORING_FACTORS: readonly Rule[] = [
  { name: 'Brand fit', what: 'AI check of the trend against data/brand.md, 0-100; below the bar the trend is rejected', source: 'LLM call #1 (fit)', confidence: 'ours' },
  { name: 'Audience', what: 'Average sentiment of the 3 synthetic customers and how many would engage', source: 'Personas built from 65 real reviews', confidence: 'ours' },
  { name: 'Expert voices', what: 'Share of the comment weight that comes from verified industry experts', source: 'data/industry_experts.json', confidence: 'ours' },
  { name: 'Conflicts', what: 'Where reviewers and customers disagree, and how many comments the Referee applied', source: 'LLM call #5 (referee)', confidence: 'ours' },
  { name: 'Time to approval', what: 'From the trend being spotted to the post being approved', source: 'Run clock', confidence: 'ours' },
  { name: 'Cost per post', what: 'AI cost of the 4 per-post calls; measured, not estimated', source: 'qa/live_eval.py, logs/usage.jsonl', confidence: 'ours' },
]

/** How comment weight is computed (docs/comment-weighting.md). */
export const WEIGHT_RULES: readonly Rule[] = [
  { name: 'Verified in the brand\'s industry', what: 'Counts 3x; anyone else counts 1x', source: 'docs/comment-weighting.md', confidence: 'ours' },
  { name: 'Recency', what: 'Halves every 24 h for comments (365 days for reviews); never below 0.1', source: 'docs/comment-weighting.md', confidence: 'ours' },
  { name: 'Limit', what: 'Weight never overrides the legal no-gos in the brand guide', source: 'docs/comment-weighting.md', confidence: 'ours' },
]

/** Platform rules behind hashtag and timing suggestions (docs/what-makes-a-post-popular.md). */
export const PLATFORM_RULES: readonly (Rule & { platform: string })[] = [
  { platform: 'Instagram', name: 'Hashtags', what: 'At most 5 per post or Reel; watch time and sends are top signals', source: 'Instagram, Dec 2025 / Mosseri', confidence: 'official' },
  { platform: 'TikTok', name: 'Timing and format', what: 'Evenings (about 18:00-23:00) and weekends; completion and rewatches matter most', source: 'Buffer 2026', confidence: 'consistent' },
  { platform: 'X', name: 'Hashtags and timing', what: '1-2 hashtags; weekday mornings 08:00-11:00; reposts and real replies rank', source: 'X open-source ranker; Buffer 2026', confidence: 'official' },
  { platform: 'LinkedIn', name: 'Timing and links', what: 'Weekdays 15:00-18:00; link in the first comment; dwell time and early comments', source: 'LinkedIn Engineering; Buffer 2026', confidence: 'consistent' },
  { platform: 'YouTube Shorts', name: 'Hook', what: 'Viewed vs. swiped away in the first 1-3 seconds decides reach', source: 'YouTube Studio metric', confidence: 'consistent' },
]
