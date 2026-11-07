import { useCallback, useEffect, useState } from 'react'
import { api, USE_MOCKS } from './api/client'
import { errorMessage } from './api/errors'
import type { ApplyRequest, CommentRole, Persona, Trend } from './api/types'
import { Adobee } from './components/Adobee'
import { Intro } from './components/wow/Intro'
import { PresenterHint } from './components/wow/PresenterHint'
import { ShipCelebration } from './components/wow/ShipCelebration'
import { SoundToggle } from './components/wow/SoundToggle'
import { TrendLife } from './components/wow/TrendLife'
import { CanvasColumn } from './components/CanvasColumn'
import { AnalysisPanel } from './components/spot/AnalysisPanel'
import { TrendScoreCard } from './components/spot/TrendScoreCard'
import { ViewTabs } from './components/nav/ViewTabs'
import { RulesPage } from './components/rules/RulesPage'
import { Brand } from './components/header/Brand'
import { DemoModeToggle } from './components/header/DemoModeToggle'
import { RunClock } from './components/header/RunClock'
import { RunMeta } from './components/header/RunMeta'
import { ReviewColumn } from './components/ReviewColumn'
import { TrendColumn } from './components/TrendColumn'
import { Badge, Banner } from './components/ui'
import { useRun } from './hooks/useRun'
import { usePresenter } from './hooks/usePresenter'
import { useSpotlight } from './hooks/useSpotlight'
import { useUsage } from './hooks/useUsage'
import { isFinished, isRunBusy } from './lib/runStatus'
import { readRunIdFromUrl, writeRunIdToUrl } from './lib/runUrl'
import { readViewFromUrl, type View, writeViewToUrl } from './lib/view'
import { nextStep } from './lib/wow'
import { scriptedComments } from './mocks/scriptedComments'

export default function App() {
  const [trend, setTrend] = useState<Trend | null>(null)
  const [personas, setPersonas] = useState<Persona[]>([])
  const [runId, setRunId] = useState<string | null>(readRunIdFromUrl) // refresh reopens the run
  const [view, setView] = useState<View>(readViewFromUrl)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const { run, error: pollError, refresh, setRun } = useRun(runId)
  useSpotlight()
  const usage = useUsage(run)

  const showError = useCallback((err: unknown) => setActionError(errorMessage(err)), [])

  useEffect(() => {
    api.getTrend().then(setTrend, showError)
    api.getPersonas().then(setPersonas, showError)
  }, [showError])

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

  /** Starts a run on the saved trend, or on the risky one the fit check should reject. */
  const startRunOn = (pick: () => Promise<Trend | null>) =>
    act(async () => {
      const chosen = await pick()
      if (!chosen) return
      const created = await api.createRun(chosen.id)
      setRun(created)
      setRunId(created.id)
      writeRunIdToUrl(created.id)
    })
  const startRun = () => startRunOn(async () => trend)
  const startRisky = () => startRunOn(() => api.getTrend('rejected'))

  const fillScripted = async (id: string) => {
    for (const comment of scriptedComments) await api.addComment(id, comment)
  }

  const error = actionError ?? pollError
  const uiBusy = busy || isRunBusy(run)
  const canStart = !uiBusy && (run === null || isFinished(run))
  const step = uiBusy ? null : nextStep(run)

  // Presenter mode: one key per demo step, so the stage never depends on finding a button.
  usePresenter(
    () => {
      if (step === 'start') void startRun()
      else if (step === 'reactions') onRun(api.requestReactions)()
      else if (step === 'comments') onRun(fillScripted)()
      else if (step === 'referee') onRun(api.referee)()
      else if (step === 'apply') onRun((id) => api.apply(id, { accept_all_edits: true }))()
    },
    () => {
      if (canStart) void startRisky()
    },
  )

  const changeView = (next: View) => {
    setView(next)
    writeViewToUrl(next)
  }

  const reviewColumn = (
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
  )

  return (
    <div className="app">
      <header className="topbar">
        <Brand />
        <ViewTabs
          view={view}
          onChange={changeView}
        />
        <Adobee run={run} busy={uiBusy} />
        <div className="topbar-status">
          <TrendLife trend={run?.trend ?? trend} run={run} />
          {run && <RunClock run={run} />}
          {run && <RunMeta run={run} usage={usage} />}
          {USE_MOCKS && <Badge tone="warn">mock API</Badge>}
          <DemoModeToggle onError={showError} />
          <PresenterHint step={step} />
          <SoundToggle />
        </div>
      </header>

      {error && <Banner tone="bad">{error}</Banner>}

      {view === 'post' && run && !isFinished(run) && run.status !== 'SPOTTED' && (
        <Banner tone="warn">
          Review, referee and ship happen in the Rules page.{' '}
          <button onClick={() => changeView('rules')}>Open Rules</button>
        </Banner>
      )}

      {view === 'rules' ? (
        <RulesPage usage={usage} review={reviewColumn} />
      ) : (
        <main className="columns post-page" id="panel-post" role="tabpanel" aria-labelledby="tab-post">
          <div className="column">
            <TrendColumn
              trend={run?.trend ?? trend}
              fit={run?.fit ?? null}
              canStart={canStart}
              onStart={startRun}
              onTryRisky={USE_MOCKS ? undefined : startRisky}
            />
            <AnalysisPanel run={run} usage={usage} />
            <TrendScoreCard key={run?.id ?? 'none'} draft={run?.draft ?? null} />
          </div>
          <CanvasColumn
            run={run}
            busy={uiBusy}
            onRegenerate={(caption, instruction) =>
              act(() => (run ? api.regenerate(run.id, { caption, instruction }) : Promise.resolve()))
            }
          />
        </main>
      )}

      <ShipCelebration run={run} />
      <Intro />
    </div>
  )
}
