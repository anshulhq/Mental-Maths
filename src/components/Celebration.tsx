'use client'

import { useEffect, useMemo, useState } from 'react'

const PHRASES = [
  "LET'S GOOOO!",
  "AIN'T NO WAY!",
  'STRAIGHT UP FILTHY!',
  "YOU'RE HIM.",
  'NO CAP, FASTEST ALIVE!',
  'THE STREETS ARE TALKING!',
  'BIG DOG ENERGY!',
  'COLD. ICE COLD.',
  'SPEED DEMON!',
  'ABSOLUTE CINEMA!',
  'GAME RECOGNIZE GAME!',
  'UNHINGED SPEED!',
  'COOKED THE CLOCK!',
  'LEAVE NO DOUBT!',
  'STRAIGHT SAVAGE!',
]

export default function Celebration({ label }: { label: string }) {
  const [gone, setGone] = useState(false)
  const [tick, setTick] = useState(0)

  const start = useMemo(() => [...label].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % PHRASES.length, [label])

  useEffect(() => {
    const cycle = setInterval(() => setTick((t) => t + 1), 900)
    const end = setTimeout(() => setGone(true), 3000)
    return () => {
      clearInterval(cycle)
      clearTimeout(end)
    }
  }, [])

  if (gone) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[90] overflow-hidden" aria-hidden>
      <div className="flash-cycle absolute inset-0" />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div key={tick} className="hype-pop text-center">
          <p className="rounded-xl bg-black/55 px-5 py-3 text-3xl font-black uppercase italic tracking-tight text-white drop-shadow-lg sm:text-5xl">
            {PHRASES[(start + tick) % PHRASES.length]}
          </p>
          <p className="mt-3 inline-block rounded-full bg-white/90 px-4 py-1 text-sm font-bold text-gray-900 sm:text-base">
            NEW #1 · {label}
          </p>
        </div>
      </div>
    </div>
  )
}
