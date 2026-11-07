import type { Run } from '../../api/types'
import type { Usage } from '../../hooks/useUsage'
import { estimatePostCost, formatUsd } from '../../lib/cost'

/** Mono run line: "RUN #3362392B · IN_REVIEW · $0.0566/post" (cost only once it was measured). */
export function RunMeta({ run, usage }: { run: Run; usage: Usage }) {
  const estimate = usage.all ? estimatePostCost(usage.all.calls) : null
  const shortId = run.id.replace(/^run_/, '').toUpperCase()

  return (
    <span className="run-meta">
      RUN #{shortId} · {run.status}
      {estimate && ` · ${formatUsd(estimate.perPostUsd)}/post`}
    </span>
  )
}
