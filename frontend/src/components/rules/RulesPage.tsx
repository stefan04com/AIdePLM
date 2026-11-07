import type { ReactNode } from 'react'
import type { Usage } from '../../hooks/useUsage'
import { PLATFORM_RULES, SCORING_FACTORS, WEIGHT_RULES, type Confidence, type Rule } from '../../lib/rules'
import { CostPanel } from '../CostPanel'
import { HashtagsSection } from './HashtagsSection'
import { Card, Pill, SectionHead } from '../ui'

const TONE: Record<Confidence, 'ok' | 'warn' | 'neutral'> = {
  official: 'ok',
  consistent: 'neutral',
  single: 'warn',
  ours: 'neutral',
}

/** Review workflow (departments, personas, referee, ship) next to what the scoring is based on. */
export function RulesPage({ usage, review }: { usage: Usage; review: ReactNode }) {
  return (
    <main className="rules-page" id="panel-rules" role="tabpanel" aria-labelledby="tab-rules">
      {review}
      <div className="column">
        <SectionHead id="01" title="Scoring factors" />
        <RuleTable rules={SCORING_FACTORS} />
        <SectionHead id="02" title="Comment and review weight" />
        <RuleTable rules={WEIGHT_RULES} />
      </div>
      <div className="column">
        <SectionHead id="03" title="Platform rules" aside={<Pill>from research</Pill>} />
        <RuleTable rules={PLATFORM_RULES} withPlatform />
        <p className="muted">
          Tags: <strong>official</strong> = the platform said it; <strong>consistent</strong> = many
          sources agree; <strong>single</strong> = one source. Industry posting times are averages:
          an account&apos;s own data always wins.
        </p>
      </div>
      <div className="column">
        <SectionHead id="04" title="Trends and hashtags" aside={<Pill>saved data</Pill>} />
        <HashtagsSection />
        <CostPanel usage={usage} />
      </div>
    </main>
  )
}

function RuleTable({ rules, withPlatform = false }: { rules: readonly (Rule & { platform?: string })[]; withPlatform?: boolean }) {
  return (
    <Card>
      <ul className="rule-list">
        {rules.map((rule) => (
          <li key={`${rule.platform ?? ''}${rule.name}`} className="rule">
            <div className="rule-head">
              <strong>{withPlatform ? `${rule.platform}: ${rule.name}` : rule.name}</strong>
              <Pill tone={TONE[rule.confidence]}>{rule.confidence}</Pill>
            </div>
            <p>{rule.what}</p>
            <p className="muted">{rule.source}</p>
          </li>
        ))}
      </ul>
    </Card>
  )
}
