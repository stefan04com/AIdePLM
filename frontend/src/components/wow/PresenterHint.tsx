import type { NextStep } from '../../lib/wow'

const LABEL: Record<Exclude<NextStep, null>, string> = {
  start: 'start run',
  reactions: 'persona reactions',
  comments: 'reviewer comments',
  referee: 'run referee',
  apply: 'apply all & ship',
}

/** Header hint for presenter mode: what the next → / clicker press will do. */
export function PresenterHint({ step }: { step: NextStep }) {
  return (
    <span className="presenter-hint" title="Presenter mode: → or PageDown runs the next step, B tries a risky trend">
      <kbd>→</kbd>
      {step ? LABEL[step] : 'working…'}
    </span>
  )
}
