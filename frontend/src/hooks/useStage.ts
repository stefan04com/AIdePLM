import { useEffect, useState } from 'react'

const KEY = 'adobee-stage'

/**
 * Stage mode for the projector (key S, or `?stage` in the URL): bigger text and cards, and only what
 * the audience needs (the post, the review, the conflicts, Adobee). Remembered on this laptop.
 */
export function useStage(): [boolean, () => void] {
  const [on, setOn] = useState(
    () => new URLSearchParams(window.location.search).has('stage') || localStorage.getItem(KEY) === '1',
  )

  useEffect(() => {
    document.documentElement.classList.toggle('stage', on)
    localStorage.setItem(KEY, on ? '1' : '0')
  }, [on])

  return [on, () => setOn((value) => !value)]
}
