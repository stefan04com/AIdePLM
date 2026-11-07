import type { useFirefly } from '../../hooks/useFirefly'
import { FIREFLY_VARIANTS } from '../../lib/firefly'
import { Card, Muted, Pill } from '../ui'

type Firefly = ReturnType<typeof useFirefly>

/**
 * "Generate with Firefly": simulated call with step labels, then two variations to choose from.
 * The chosen photo replaces the post's visual (in the preview and the Slack preview).
 */
export function FireflyPanel({ firefly, disabled }: { firefly: Firefly; disabled: boolean }) {
  return (
    <Card className="firefly" title={<>Adobe Firefly <Pill>simulated</Pill></>}>
      <div className="firefly-actions">
        <button disabled={disabled || firefly.generating} onClick={firefly.generate}>
          {firefly.ready ? 'Generate again' : 'Generate with Firefly'}
        </button>
        {firefly.step && (
          <span className="step" role="status">
            <span className="spinner" aria-hidden /> {firefly.step}
          </span>
        )}
      </div>

      {firefly.ready && (
        <>
          <div className="firefly-variants">
            {FIREFLY_VARIANTS.map((variant) => (
              <button
                key={variant.id}
                className={`firefly-variant ${firefly.picked?.id === variant.id ? 'picked' : ''}`}
                aria-pressed={firefly.picked?.id === variant.id}
                onClick={() => firefly.pick(variant.id)}
              >
                <img src={variant.url} alt={variant.label} />
                <span>{variant.label}</span>
              </button>
            ))}
          </div>
          <Muted>Pick a variation to use it in the post.</Muted>
        </>
      )}
    </Card>
  )
}
