import { useEffect, useState } from 'react'
import { api, USE_MOCKS } from './api/client'
import { errorMessage } from './api/errors'
import type { ApplyRequest, CommentRole, Persona, Trend } from './api/types'
import { CanvasColumn } from './components/CanvasColumn'
import { ReviewColumn } from './components/ReviewColumn'
import { TrendColumn } from './components/TrendColumn'
import { Badge, Banner } from './components/ui'
import { useRun } from './hooks/useRun'
import { isFinished, isRunBusy } from './lib/runStatus'
import { scriptedComments } from './mocks/scriptedComments'

export default function App() {
  const [trend, setTrend] = useState<Trend | null>(null)
  const [personas, setPersonas] = useState<Persona[]>([])
  const [runId, setRunId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const { run, error: pollError, refresh, setRun } = useRun(runId)

  const showError = (err: unknown) => setActionError(errorMessage(err))

  useEffect(() => {
    api.getTrend().then(setTrend, showError)
    api.getPersonas().then(setPersonas, showError)
  }, [])

  /** Runs one user action with a shared busy flag and error banner, then re-fetches the run. */
  async function act(action: () => Promise<unknown>) {
    setBusy(true)
    setActionError(null)
    try {
      await action()
      await refresh()
    } catch (err) {
      showError(err)
    } finally {
      setBusy(false)
    }
  }

  /** Wraps an API call that needs the current run id into a click handler. */
  const onRun = (call: (id: string) => Promise<unknown>) => () => {
    if (run) void act(() => call(run.id))
  }

  const startRun = () =>
    act(async () => {
      if (!trend) return
      const created = await api.createRun(trend.id)
      setRun(created)
      setRunId(created.id)
    })

  const fillScripted = async (id: string) => {
    for (const comment of scriptedComments) await api.addComment(id, comment)
  }

  const error = actionError ?? pollError
  const uiBusy = busy || isRunBusy(run)

  return (
    <div className="app">
      <header className="topbar">
        <h1>Moment</h1>
        {run && <Badge>{`${run.id} · ${run.status}`}</Badge>}
        {USE_MOCKS && <Badge tone="warn">mock API</Badge>}
      </header>

      {error && <Banner tone="bad">{error}</Banner>}

      <main className="columns">
        <TrendColumn
          trend={trend}
          fit={run?.fit ?? null}
          canStart={!uiBusy && (run === null || isFinished(run))}
          onStart={startRun}
        />
        <CanvasColumn run={run} />
        <ReviewColumn
          run={run}
          personas={personas}
          busy={uiBusy}
          onComment={(role: CommentRole, text: string, author: string | null) =>
            onRun((id) => api.addComment(id, { role, text, author }))()
          }
          onRequestReactions={onRun(api.requestReactions)}
          onFillScripted={onRun(fillScripted)}
          onReferee={onRun(api.referee)}
          onApply={(body: ApplyRequest) => onRun((id) => api.apply(id, body))()}
        />
      </main>
    </div>
  )
}
