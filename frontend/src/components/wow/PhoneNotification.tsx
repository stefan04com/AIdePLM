import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Run } from '../../api/types'
import type { SlackPreview } from '../../lib/slackPreview'
import { sound } from '../../lib/sound'
import { PHONE_AT_MS } from '../../lib/wow'

const SHOW_MS = 8000
const EXCERPT = 110

const clock = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const today = () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

/**
 * After a ship, a phone slides in with the Slack notification the team gets: the approved post,
 * its image and the time it took. The message itself is real when a webhook is set; this phone is
 * only a picture of it. Click to dismiss.
 */
export function PhoneNotification({ run, preview }: { run: Run | null; preview: SlackPreview | null }) {
  const [seen, setSeen] = useState(run?.status ?? null)
  const [ships, setShips] = useState(0) // counts live ships; each one shows the phone once
  const [open, setOpen] = useState(false)

  // Only a live REFEREED → SHIPPED change, never a reload of an old shipped run.
  const status = run?.status ?? null
  if (status !== seen) {
    if (status === 'SHIPPED' && seen === 'REFEREED') setShips((n) => n + 1)
    setSeen(status)
  }

  useEffect(() => {
    if (ships === 0) return
    const show = setTimeout(() => {
      setOpen(true)
      sound.notify()
    }, PHONE_AT_MS)
    const hide = setTimeout(() => setOpen(false), PHONE_AT_MS + SHOW_MS)
    return () => {
      clearTimeout(show)
      clearTimeout(hide)
    }
  }, [ships])

  if (!open || !preview) return null
  const caption = preview.caption.length > EXCERPT ? `${preview.caption.slice(0, EXCERPT).trimEnd()}…` : preview.caption

  return createPortal(
    <button type="button" className="phone" onClick={() => setOpen(false)} aria-label="Slack notification on a phone. Click to close.">
      <span className="phone-notch" aria-hidden />
      <span className="phone-time">{clock()}</span>
      <span className="phone-date">{today()}</span>
      <span className="phone-note" role="status">
        <span className="phone-note-head">
          <span className="phone-app" aria-hidden>
            #
          </span>
          <strong>Slack</strong>
          <span className="phone-now">now</span>
        </span>
        <strong className="phone-title">{preview.header}</strong>
        <span className="phone-body">
          {preview.imageUrl && <img src={preview.imageUrl} alt="" />}
          <span>{caption}</span>
        </span>
        <span className="phone-foot">Trend → approved in {preview.elapsed}</span>
      </span>
    </button>,
    document.body,
  )
}
