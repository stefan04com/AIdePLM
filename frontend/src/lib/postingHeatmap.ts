// "When we post" heatmap: turns GET /posting-windows into a Mon–Sun × 06:00–23:00 grid.
// Pure functions, tested in tests/postingHeatmap.test.ts.

import type { PostingWindows, Weekday } from '../api/types'

export const WEEK: readonly Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]
export const FIRST_HOUR = 6
export const LAST_HOUR = 23 // the last column is 23:00-24:00
export const HOURS: readonly number[] = Array.from(
  { length: LAST_HOUR - FIRST_HOUR + 1 },
  (_, i) => FIRST_HOUR + i,
)

/** Platforms on the heatmap's switch: data key → label. */
export const HEATMAP_PLATFORMS = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'x', label: 'X' },
  { key: 'linkedin', label: 'LinkedIn' },
] as const

export const dayShort = (day: Weekday) => day[0].toUpperCase() + day.slice(1, 3)
export const hourLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`

/** "HH:MM" → minutes after midnight. */
const minutes = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/** Glow for a window day: the strongest best day is brightest, other window days are dimmer. */
const RANK_GLOW = [1, 0.8, 0.65]
const OTHER_GLOW = 0.45

export function dayGlow(data: PostingWindows, day: Weekday): number {
  const rank = data.best_days.indexOf(day)
  return rank >= 0 ? (RANK_GLOW[rank] ?? RANK_GLOW[RANK_GLOW.length - 1]) : OTHER_GLOW
}

/** True if the hour slot [hour, hour+1) overlaps a window on that day. */
export function inWindow(data: PostingWindows, day: Weekday, hour: number): boolean {
  const from = hour * 60
  const to = from + 60
  return data.windows.some(
    (w) => w.days.includes(day) && minutes(w.start) < to && minutes(w.end) > from,
  )
}

/** Intensity 0..1 for every cell, rows Mon–Sun, columns FIRST_HOUR..LAST_HOUR. */
export function heatGrid(data: PostingWindows): number[][] {
  return WEEK.map((day) =>
    HOURS.map((hour) => (inWindow(data, day, hour) ? dayGlow(data, day) : 0)),
  )
}

export interface Slot {
  day: Weekday
  hour: number
}

/** The single best slot: the strongest best day, at the start of its first window. */
export function bestSlot(data: PostingWindows): Slot | null {
  const days = [...data.best_days, ...WEEK]
  for (const day of days) {
    const window = data.windows.find((w) => w.days.includes(day))
    if (!window) continue
    const hour = Math.min(Math.max(Math.floor(minutes(window.start) / 60), FIRST_HOUR), LAST_HOUR)
    return { day, hour }
  }
  return null
}

export const slotLabel = (slot: Slot) => `${dayShort(slot.day)} ${hourLabel(slot.hour)}`

/** "Sprout Social, Best times to post…" → "Sprout Social". */
export const sourceShort = (name: string) => name.split(',')[0].trim()
