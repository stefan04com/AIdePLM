import { useEffect, useRef } from 'react'
import { DENOISE_STEPS, denoiseAt, denoiseFilter, FIREFLY_IMAGE } from '../../lib/firefly'
import '../../styles/firefly-denoise.css'

const NOISE_W = 96
const NOISE_H = 72

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Colourful "latent" noise, tinted toward Firefly's red → violet. Small canvas, scaled by CSS. */
function paintNoise(ctx: CanvasRenderingContext2D, image: ImageData) {
  const px = new Uint32Array(image.data.buffer)
  for (let i = 0; i < px.length; i++) {
    const r = (Math.random() * 255) | 0
    const g = (Math.random() * 170) | 0
    const b = (Math.random() * 255) | 0
    px[i] = 0xff000000 | (b << 16) | (g << 8) | r // little-endian RGBA
  }
  ctx.putImageData(image, 0, 0)
}

interface Props {
  startedAt: number
  /** The current step label ("Firefly is generating the image…"). */
  label: string | null
}

/**
 * The simulated Firefly call as a diffusion model would look: the generated photo starts buried
 * in colourful noise and heavy blur/saturation, and resolves step by step (1 → 30) into the clean
 * photo. Driven by requestAnimationFrame writing straight to the DOM (opacity + filter only), so
 * React does not re-render each frame. With reduced motion the clean photo shows at once.
 */
export function FireflyDenoise({ startedAt, label }: Props) {
  const img = useRef<HTMLImageElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const step = useRef<HTMLSpanElement>(null)
  const bar = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const still = reducedMotion()
    const ctx = canvas.current?.getContext('2d') ?? null
    const noise = ctx ? ctx.createImageData(NOISE_W, NOISE_H) : null
    let frame = 0
    let tick = 0
    const draw = () => {
      const f = denoiseAt(Date.now() - startedAt)
      if (step.current) step.current.textContent = `${f.step}/${DENOISE_STEPS}`
      if (bar.current) bar.current.style.transform = `scaleX(${f.progress})`
      if (still) return // reduced motion: the step count moves, the photo stays clean
      if (img.current) {
        img.current.style.filter = denoiseFilter(f)
        img.current.style.transform = `scale(${(1 + f.blurPx * 0.003).toFixed(4)})`
      }
      if (canvas.current) canvas.current.style.opacity = f.noise.toFixed(3)
      // new noise every other frame (~30 fps) is enough to look alive
      if (ctx && noise && f.noise > 0 && tick++ % 2 === 0) paintNoise(ctx, noise)
      frame = requestAnimationFrame(draw)
    }
    draw()
    const steps = still ? setInterval(draw, 150) : undefined
    return () => {
      cancelAnimationFrame(frame)
      clearInterval(steps)
    }
  }, [startedAt])

  return (
    <div className="firefly-denoise">
      <img ref={img} src={FIREFLY_IMAGE.url} alt="" aria-hidden className="denoise-photo" />
      <canvas ref={canvas} width={NOISE_W} height={NOISE_H} className="denoise-noise" aria-hidden />
      <div className="denoise-label" role="status">
        <span className="denoise-step">
          ✦ Firefly · step <span ref={step}>1/{DENOISE_STEPS}</span>
          <span className="denoise-sim"> · simulated</span>
        </span>
        {label && <span className="denoise-text">{label}</span>}
        <span className="denoise-bar" aria-hidden>
          <span ref={bar} />
        </span>
      </div>
    </div>
  )
}
