import type { Persona, PersonaReaction } from '../../api/types'
import { formatSentiment } from '../../lib/format'
import { Card, Muted, Pill } from '../ui'

interface Props {
  personas: Persona[]
  reactions: PersonaReaction[]
}

export function PersonaCards({ personas, reactions }: Props) {
  return (
    <div className="grid">
      {personas.map((persona) => {
        const reaction = reactions.find((r) => r.persona_id === persona.id)
        const title = (
          <>
            <span className="persona-tag">persona</span>
            {persona.name}
            {reaction && <SentimentPill sentiment={reaction.sentiment} />}
          </>
        )
        return (
          <Card key={persona.id} title={title} className="persona">
            <Muted>{persona.segment}</Muted>
            {persona.sample_quotes[0] && <blockquote>“{persona.sample_quotes[0]}”</blockquote>}
            <ReactionLine reaction={reaction} />
          </Card>
        )
      })}
    </div>
  )
}

/** Score shift chip: "+0.8" green, "-0.1" red. */
function SentimentPill({ sentiment }: { sentiment: number }) {
  return <Pill tone={sentiment >= 0 ? 'ok' : 'bad'}>{formatSentiment(sentiment)}</Pill>
}

function ReactionLine({ reaction }: { reaction?: PersonaReaction }) {
  if (!reaction) return null
  return (
    <div className="comment persona-reaction">
      <p>{reaction.reaction}</p>
      <div className="comment-meta muted">
        {reaction.would_engage ? 'would engage' : 'would scroll past'}
      </div>
    </div>
  )
}
