import { useEffect, useState } from 'react'
import { api, USE_MOCKS } from './api/client'
import type { CommentRole, Persona, Trend } from './api/types'
import { CanvasColumn } from './components/CanvasColumn'
import { ReviewColumn } from './components/ReviewColumn'
import { TrendColumn } from './components/TrendColumn'
import { useRun } from './hooks/useRun'
import { scriptedComments } from './mocks/scriptedComments'

export default function App() {
  const [trend, setTrend] = useState<Trend | null>(null)
  const [personas, setPersonas] = useState<Persona[]>([])
  const [runId, setRunId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const { run, error: pollError, refresh, setRun } = useRun(runId)

  useEffect(() => {
    api.getTrend().then(setTrend, (err: Error) => setActionError(err.message))
    api.getPersonas().then(setPersonas, (err: Error) => setActionError(err.message))
  }, [])

  /** Runs one user action with a shared busy flag and error banner, then re-fetches the run. */
  async function act(action: () => Promise<unknown>) {
    setBusy(true)
    setActionError(null)
    try {
      await action()
      await refresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const startRun = () =>
    act(async () => {
      if (!trend) return
      const created = await api.createRun(trend.id)
      setRun(created)
      setRunId(created.id)
    })

  const withRun = (fn: (id: string) => Promise<unknown>) => () => {
    if (run) void act(() => fn(run.id))
  }

  const error = actionError ?? pollError
  const canStart = !busy && (!run || run.status === 'SHIPPED' || run.status === 'REJECTED')

  return (
    <div className="app">
      <header className="topbar">
        <h1>Moment</h1>
        {run && (
          <span className="badge">
            {run.id} · {run.status}
          </span>
        )}
        {USE_MOCKS && <span className="badge mock">mock API</span>}
      </header>

      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}

      <main className="columns">
        <TrendColumn trend={trend} fit={run?.fit ?? null} canStart={canStart} onStart={startRun} />
        <CanvasColumn run={run} />
        <ReviewColumn
          run={run}
          personas={personas}
          busy={busy}
          onRequestReactions={withRun((id) => api.requestReactions(id))}
          onComment={(role: CommentRole, text: string) =>
            withRun((id) => api.addComment(id, { role, text }))()
          }
          onFillScripted={withRun(async (id) => {
            for (const comment of scriptedComments) await api.addComment(id, comment)
          })}
          onReferee={withRun((id) => api.referee(id))}
          onApply={withRun((id) => api.apply(id, { accept_all_edits: true }))}
        />
      </main>
    </div>
  )
}
