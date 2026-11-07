import type { Run } from '../../api/types'
import type { Usage } from '../../hooks/useUsage'
import { estimatePostCost, formatUsd } from '../../lib/cost'

/**
 * Mono run line: "RUN #3362392B · $0.0602/post" (cost only once it was measured).
 * The status is in the tooltip: the honeycomb next to it already shows the step.
 */
export function RunMeta({ run, usage }: { run: Run; usage: Usage }) {
  const estimate = usage.all ? estimatePostCost(usage.all.calls) : null
  const shortId = run.id.replace(/^run_/, '').toUpperCase()

  return (
    <span className="run-meta" title={`Status: ${run.status}`}>
      RUN #{shortId}
      {estimate && ` · ${formatUsd(estimate.perPostUsd)}/post`}
      {run.fallback_calls && run.fallback_calls.length > 0 && ` · CANNED: ${run.fallback_calls.join(', ')}`}
    </span>
  )
}
