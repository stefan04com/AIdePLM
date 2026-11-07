import type { NextStep } from '../../lib/wow'

const LABEL: Record<Exclude<NextStep, null>, string> = {
  start: 'start run',
  reactions: 'persona reactions',
  comments: 'reviewer comments',
  referee: 'run referee',
  apply: 'apply & ship',
}

const KEYS = 'Presenter mode: → or PageDown runs the next step, B tries a risky trend, S stage mode, E closing screen'

/** Header hint for presenter mode: what the next → / clicker press will do, and whether stage mode is on. */
export function PresenterHint({ step, stage }: { step: NextStep; stage: boolean }) {
  return (
    <span className="presenter-hint" title={KEYS}>
      <kbd>→</kbd>
      {step ? LABEL[step] : 'working…'}
      {stage && <kbd className="stage-on">S stage</kbd>}
    </span>
  )
}
