// Which page is open: "post" (default) or "rules". Kept in the URL (?view=rules) so a refresh or a
// shared link opens the same page; the run id (?run=…) is kept next to it. Type imports only.

import type { RunStatus } from '../api/types'
import type { NextStep } from './wow'

export type View = 'post' | 'rules'

export const VIEWS: readonly { id: View; label: string }[] = [
  { id: 'post', label: 'Post' },
  { id: 'rules', label: 'Rules' },
]

export function parseView(value: string | null): View {
  return value === 'rules' ? 'rules' : 'post'
}

export const readViewFromUrl = (): View =>
  parseView(new URLSearchParams(window.location.search).get('view'))

export function writeViewToUrl(view: View): void {
  const url = new URL(window.location.href)
  if (view === 'post') url.searchParams.delete('view')
  else url.searchParams.set('view', view)
  window.history.replaceState(null, '', url)
}

/** Next or previous tab id for the arrow keys, wrapping around. */
export function stepView(current: View, delta: 1 | -1): View {
  const index = VIEWS.findIndex((v) => v.id === current)
  return VIEWS[(index + delta + VIEWS.length) % VIEWS.length].id
}

/**
 * The page where a run's current status is shown: review and referee live on Rules; the trend,
 * the draft and the shipped post on Post. The app switches there when the status changes.
 */
export function viewForStatus(status: RunStatus): View {
  return status === 'IN_REVIEW' || status === 'REFEREED' ? 'rules' : 'post'
}

/** The page a presenter step happens on: starting a run on Post, every review step on Rules. */
export const viewForStep = (step: NextStep): View => (step === 'start' ? 'post' : 'rules')
