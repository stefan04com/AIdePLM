// Keeps the current run id in the URL (?run=…), so a page refresh on stage reopens the same
// run instead of starting over (demo script: "Reopen the saved run").

const PARAM = 'run'

export function readRunIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get(PARAM)
}

export function writeRunIdToUrl(runId: string | null): void {
  const url = new URL(window.location.href)
  if (runId) url.searchParams.set(PARAM, runId)
  else url.searchParams.delete(PARAM)
  window.history.replaceState(null, '', url)
}
