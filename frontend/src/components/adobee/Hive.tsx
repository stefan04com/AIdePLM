import type { Ref } from 'react'
import { HIVE_STEPS, type HiveCell } from '../../lib/adobee'

const HEX = 'M12 1 L22 6.75 L22 18.25 L12 24 L2 18.25 L2 6.75 Z'

interface Props {
  cells: HiveCell[]
  caption: string
  nestRef: Ref<HTMLSpanElement>
}

/** Header honeycomb: Adobee's nest, one cell per step filling with honey, and a one-line status. */
export function Hive({ cells, caption, nestRef }: Props) {
  return (
    <div className="hive">
      <span ref={nestRef} className="hive-nest" aria-hidden />
      <ol className="hive-cells" aria-label="Run progress">
        {HIVE_STEPS.map((step, i) => (
          <li key={step} className={`hive-cell hive-${cells[i]}`} title={step}>
            <svg viewBox="0 0 24 25" aria-hidden>
              <path className="hive-hex" d={HEX} />
              <path className="hive-honey" d={HEX} />
            </svg>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <p className="hive-caption" role="status" aria-live="polite">
        {caption}
      </p>
    </div>
  )
}
