import type { Persona, PersonaReaction } from '../../api/types'
import { formatSentiment } from '../../lib/format'
import { Badge, Card, Muted } from '../ui'

interface Props {
  personas: Persona[]
  reactions: PersonaReaction[]
}

export function PersonaCards({ personas, reactions }: Props) {
  return (
    <div className="grid">
      {personas.map((persona) => (
        <Card key={persona.id} title={persona.name}>
          <Muted>{persona.segment}</Muted>
          {persona.sample_quotes[0] && <blockquote>“{persona.sample_quotes[0]}”</blockquote>}
          <ReactionLine reaction={reactions.find((r) => r.persona_id === persona.id)} />
        </Card>
      ))}
    </div>
  )
}

function ReactionLine({ reaction }: { reaction?: PersonaReaction }) {
  if (!reaction) return null
  const engagement = reaction.would_engage ? 'engages' : 'scrolls past'
  const tone = reaction.sentiment >= 0 ? 'ok' : 'bad'

  return (
    <p className="comment">
      {reaction.reaction}
      <Badge tone={tone}>
        {formatSentiment(reaction.sentiment)} · {engagement}
      </Badge>
    </p>
  )
}
