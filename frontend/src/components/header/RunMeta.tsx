import type { Run } from '../../api/types'
import type { Usage } from '../../hooks/useUsage'
import { formatUsd, postCost } from '../../lib/cost'

/**
 * Mono run line: "RUN #3362392B · $0.0602/post" (cost measured here, or in the live eval).
 * The status is in the tooltip: the honeycomb next to it already shows the step.
 */
export function RunMeta({ run, usage }: { run: Run; usage: Usage }) {
  const cost = postCost(usage.all?.calls)
  const shortId = run.id.replace(/^run_/, '').toUpperCase()

  return (
    <span className="run-meta" title={`Status: ${run.status}`}>
      RUN #{shortId}
      {` · ${formatUsd(cost.perPostUsd)}/post`}
      {run.fallback_calls && run.fallback_calls.length > 0 && ` · CANNED: ${run.fallback_calls.join(', ')}`}
    </span>
  )
}
