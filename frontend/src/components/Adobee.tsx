import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Run } from '../api/types'
import { ADOBEE_TIPS, adobeeSpot, adobeeState, hiveCells, type AdobeeSpot } from '../lib/adobee'
import { sound } from '../lib/sound'
import { BeeSvg } from './adobee/BeeSvg'
import { Hive } from './adobee/Hive'

const BEE_W = 64
const BEE_H = 80
const MAX_LOOK = 3 // px the eyes move toward the cursor
const TIP_MS = 5000
const TRAIL = 9 // pollen hexes dropped per flight
const BURST = 18 // honey hexes when the post ships
const CARRY_MAX = 9 // pollen hexes carried from reviewers to the referee

/** Where Adobee lands for each spot; the first selector found on the page wins. */
const TARGETS: Record<Exclude<AdobeeSpot, 'home'>, string[]> = {
  spot: ['.gauge', '.trend'],
  draft: ['.express', '.post'],
  review: ['.comment', '.persona'],
  referee: ['.referee-panel'],
  ship: ['.slack', '.ship-bar', '.referee-panel'],
}

interface Point {
  x: number
  y: number
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

function findTarget(spot: AdobeeSpot, nest: HTMLElement | null): HTMLElement | null {
  if (spot === 'home') return nest
  for (const selector of TARGETS[spot]) {
    const el = document.querySelector<HTMLElement>(selector)
    if (el) return el
  }
  return nest
}

/** Perch on the target's top-right corner, kept on screen; at home, sit in the nest. */
function perchFor(el: HTMLElement | null, home: boolean): Point {
  if (!el) return { x: 16, y: 8 }
  const box = el.getBoundingClientRect()
  if (home) return { x: box.left + box.width / 2 - BEE_W / 2, y: box.top + box.height / 2 - BEE_H / 2 }
  // Never cover the sticky header or the ship bar docked at the bottom.
  const ceiling = (document.querySelector('.topbar')?.getBoundingClientRect().bottom ?? 0) + 4
  const dock = document.querySelector('.ship-bar')?.getBoundingClientRect().top ?? window.innerHeight
  const floor = Math.min(window.innerHeight, dock) - BEE_H - 12
  return {
    x: clamp(box.right - BEE_W * 0.75, 8, window.innerWidth - BEE_W - 8),
    y: clamp(box.top - BEE_H * 0.55, ceiling, Math.max(ceiling, floor)),
  }
}

/** A point on the quadratic curve from a over c to b. */
const bezier = (a: Point, c: Point, b: Point, t: number): Point => ({
  x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t ** 2 * b.x,
  y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t ** 2 * b.y,
})

/** Scrolls so `el` starts just below the sticky header. */
function scrollBelowHeader(el: Element) {
  const header = document.querySelector('.topbar')?.getBoundingClientRect().bottom ?? 0
  const top = el.getBoundingClientRect().top + window.scrollY - header - 16
  window.scrollTo({ top, behavior: reducedMotion() ? 'auto' : 'smooth' })
}

/** Adds a short-lived decoration (pollen, ring, honey) to the sky layer; it removes itself. */
function spawn(sky: HTMLElement, className: string, style: Record<string, string>) {
  const el = document.createElement('span')
  el.className = className
  for (const [key, value] of Object.entries(style)) el.style.setProperty(key, value)
  el.addEventListener('animationend', () => el.remove(), { once: true })
  sky.appendChild(el)
}

/**
 * Every review voice (comments, persona reactions) flies as a pollen hex into the referee panel:
 * the referee reads them all at once. Returns the time the last one lands.
 */
function pollinate(sky: HTMLElement, target: HTMLElement): number {
  const sources = [...document.querySelectorAll<HTMLElement>('.comment, .persona')].slice(0, CARRY_MAX)
  const box = target.getBoundingClientRect()
  const end = { x: box.left + box.width / 2, y: Math.max(box.top + 24, 90) }
  sources.forEach((source, i) => {
    const from = source.getBoundingClientRect()
    const start = { x: from.left + from.width / 2, y: from.top + from.height / 2 }
    const control = { x: (start.x + end.x) / 2 + (i % 2 ? 60 : -60), y: Math.min(start.y, end.y) - 80 }
    const el = document.createElement('span')
    el.className = 'adobee-carry'
    sky.appendChild(el)
    const frames = Array.from({ length: 12 }, (_, k) => {
      const p = bezier(start, control, end, k / 11)
      return { transform: `translate(${p.x}px, ${p.y}px) rotate(${k * 30}deg) scale(${1 - k * 0.04})` }
    })
    const flight = el.animate(frames, { duration: 900, delay: i * 90, easing: 'ease-in-out', fill: 'both' })
    flight.onfinish = () => el.remove()
  })
  return sources.length * 90 + 900
}

/**
 * Adobee, the busy robot bee. It lives in the header hive and flies, on an arc and leaving a pollen
 * trail, to the part of the screen where the run is happening: the fit gauge, the post, the
 * personas, the referee's conflicts, the Slack message. It is a guide, not a chatbot: no input.
 */
export function Adobee({ run, busy }: { run: Run | null; busy: boolean }) {
  const { mood, message } = adobeeState(run, busy)
  const spot = adobeeSpot(run)
  const [look, setLook] = useState<Point>({ x: 0, y: 0 })
  const [tip, setTip] = useState<string | null>(null)
  const [spins, setSpins] = useState(0)
  const nestRef = useRef<HTMLSpanElement>(null)
  const flyerRef = useRef<HTMLDivElement>(null)
  const skyRef = useRef<HTMLDivElement>(null)
  const pos = useRef<Point | null>(null)
  const lastSpot = useRef<AdobeeSpot>(spot)
  const flying = useRef(false)
  const tipIndex = useRef(0)

  // Fly to the current spot whenever it changes.
  useEffect(() => {
    const flyer = flyerRef.current
    const sky = skyRef.current
    if (!flyer || !sky) return
    const target = findTarget(spot, nestRef.current)
    const to = perchFor(target, spot === 'home')
    const place = (p: Point) => {
      flyer.style.transform = `translate(${p.x}px, ${p.y}px)`
      pos.current = p
    }
    const from = pos.current
    const cameFrom = lastSpot.current
    lastSpot.current = spot
    if (!from || reducedMotion()) {
      place(to)
      return
    }
    const later: number[] = []
    if (cameFrom === 'review' && spot === 'referee' && target) {
      // bring the referee into view, then let every review voice fly into it
      scrollBelowHeader(target)
      later.push(window.setTimeout(() => pollinate(sky, target), 450))
    }
    if (spot === 'ship') {
      // after the celebration, show the post with its caption rewriting itself
      later.push(
        window.setTimeout(() => {
          const caption = document.querySelector('.express .caption')
          if (!caption) return
          const box = caption.getBoundingClientRect()
          const top = box.top + window.scrollY - window.innerHeight / 2 + box.height / 2
          window.scrollTo({ top, behavior: reducedMotion() ? 'auto' : 'smooth' })
        }, 4100),
      )
    }

    const distance = Math.hypot(to.x - from.x, to.y - from.y)
    if (distance < 4) return
    const control = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 60 - distance * 0.18 }
    const duration = clamp(650 + distance * 0.7, 800, 1700)
    const tilt = to.x < from.x ? -14 : 14
    flyer.dataset.facing = to.x < from.x ? 'left' : 'right'
    const frames = Array.from({ length: 16 }, (_, i) => {
      const p = bezier(from, control, to, i / 15)
      const lean = Math.sin((i / 15) * Math.PI) * tilt
      return { transform: `translate(${p.x}px, ${p.y}px) rotate(${lean}deg)` }
    })

    flying.current = true
    flyer.classList.add('is-flying')
    sound.buzz()
    const animation = flyer.animate(frames, { duration, easing: 'cubic-bezier(.45,.05,.3,1)' })
    const timers = Array.from({ length: TRAIL }, (_, i) => {
      const t = (i + 1) / (TRAIL + 1)
      return window.setTimeout(() => {
        const p = bezier(from, control, to, t)
        spawn(sky, 'adobee-pollen', { left: `${p.x + BEE_W / 2}px`, top: `${p.y + BEE_H * 0.8}px` })
      }, t * duration)
    })

    const land = () => {
      flying.current = false
      flyer.classList.remove('is-flying')
      place(to)
      if (target && spot !== 'home') {
        const box = target.getBoundingClientRect()
        spawn(sky, 'adobee-ring', {
          left: `${box.left - 4}px`,
          top: `${box.top - 4}px`,
          width: `${box.width + 8}px`,
          height: `${box.height + 8}px`,
        })
      }
      if (flyer.classList.contains('adobee-alert')) sound.ding()
      if (flyer.classList.contains('adobee-sad')) sound.bonk()
      if (spot === 'ship' && !reducedMotion()) {
        for (let i = 0; i < BURST; i++) {
          const angle = (i / BURST) * Math.PI * 2
          const reach = 70 + (i % 3) * 30
          spawn(sky, 'adobee-honey', {
            left: `${to.x + BEE_W / 2}px`,
            top: `${to.y + BEE_H / 2}px`,
            '--dx': `${Math.cos(angle) * reach}px`,
            '--dy': `${Math.sin(angle) * reach}px`,
          })
        }
      }
    }
    animation.onfinish = land
    return () => {
      timers.forEach(clearTimeout)
      later.forEach(clearTimeout)
      animation.onfinish = null
      animation.cancel()
      flying.current = false
      flyer.classList.remove('is-flying')
      place(to)
    }
  }, [spot, run?.id])

  // Stay perched while the page scrolls, resizes or the layout moves (images loading, new cards).
  useEffect(() => {
    let frame = 0
    const follow = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const flyer = flyerRef.current
        if (!flyer || flying.current) return
        const p = perchFor(findTarget(spot, nestRef.current), spot === 'home')
        flyer.style.transform = `translate(${p.x}px, ${p.y}px)`
        pos.current = p
      })
    }
    window.addEventListener('scroll', follow, true)
    window.addEventListener('resize', follow)
    const observer = new ResizeObserver(follow)
    observer.observe(document.body)
    return () => {
      window.removeEventListener('scroll', follow, true)
      window.removeEventListener('resize', follow)
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [spot])

  // Eyes follow the cursor.
  useEffect(() => {
    let frame = 0
    const onMove = (event: MouseEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const box = flyerRef.current?.getBoundingClientRect()
        if (!box) return
        const dx = event.clientX - (box.left + box.width / 2)
        const dy = event.clientY - (box.top + box.height / 3)
        const length = Math.hypot(dx, dy) || 1
        setLook({ x: (dx / length) * MAX_LOOK, y: (dy / length) * MAX_LOOK })
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    if (!tip) return
    const timer = setTimeout(() => setTip(null), TIP_MS)
    return () => clearTimeout(timer)
  }, [tip])

  const onClick = () => {
    setSpins((n) => n + 1)
    setTip(ADOBEE_TIPS[tipIndex.current % ADOBEE_TIPS.length])
    tipIndex.current += 1
  }

  return (
    <>
      <Hive cells={hiveCells(run)} caption={tip ?? message} nestRef={nestRef} />
      {createPortal(
        <div ref={skyRef} className="adobee-sky">
          <div ref={flyerRef} className={`adobee-flyer adobee-${mood} at-${spot}`}>
            <button
              type="button"
              className="adobee-bee"
              aria-label="Adobee, the busy bee. Click for a tip."
              onClick={onClick}
            >
              <span key={spins} className={spins > 0 ? 'adobee-pose adobee-spin' : 'adobee-pose'}>
                <BeeSvg mood={mood} look={look} />
              </span>
              <span className="adobee-shadow" aria-hidden />
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
