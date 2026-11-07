import type { CallUsage } from '../api/types'
import type { Usage } from '../hooks/useUsage'
import { estimatePostCost, formatUsd, isLiveCall } from '../lib/cost'
import { formatDuration } from '../lib/format'
import { Card, Muted, Pill, SectionHead } from './ui'

/** AI cost per post (for the cost slide) and the calls of the current run. */
export function CostPanel({ usage }: { usage: Usage }) {
  const estimate = usage.all ? estimatePostCost(usage.all.calls) : null
  const runCalls = usage.run?.calls ?? []

  return (
    <section className="column">
      <SectionHead
        title="Compute cost"
        aside={<Pill tone={estimate ? 'ok' : 'neutral'}>{estimate ? formatUsd(estimate.perPostUsd) : 'n/a'}</Pill>}
      />
      <Card title="Per post (measured)">
        {estimate ? (
          <>
            <p className="cost-big">{formatUsd(estimate.perPostUsd)}</p>
            <Muted>
              Average of {estimate.liveCalls} live calls · about{' '}
              {formatDuration(estimate.perPostLatencyMs)} of model time per post
            </Muted>
          </>
        ) : (
          <Muted>
            No live calls logged yet. Demo mode answers from the cache ($0), so run once
            with demo mode off to measure.
          </Muted>
        )}
      </Card>

      {runCalls.length > 0 && (
        <Card title={`This run · ${runCalls.length} calls`}>
          <table className="cost-table">
            <thead>
              <tr>
                <th>Call</th>
                <th>Tokens in → out</th>
                <th>Time</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {runCalls.map((call, index) => (
                <CallRow key={index} call={call} />
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </section>
  )
}

function CallRow({ call }: { call: CallUsage }) {
  const live = isLiveCall(call)
  return (
    <tr>
      <td>{call.call}</td>
      <td>{live ? `${call.input_tokens} → ${call.output_tokens}` : 'cached'}</td>
      <td>{live ? formatDuration(call.latency_ms) : '—'}</td>
      <td>{formatUsd(call.cost_usd)}</td>
    </tr>
  )
}
