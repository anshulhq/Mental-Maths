'use client'

import { useEffect } from 'react'

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  w: number
  h: number
  rot: number
  vr: number
  color: string
  life: number
  ttl: number
}

const COLORS = ['#fbbf24', '#f59e0b', '#fde68a', '#34d399', '#ffffff', '#f87171']

export default function Confetti() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const canvas = document.createElement('canvas')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const W = window.innerWidth
    const H = window.innerHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.cssText = `position:fixed;inset:0;width:${W}px;height:${H}px;pointer-events:none;z-index:100`
    document.body.appendChild(canvas)
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      canvas.remove()
      return
    }
    ctx.scale(dpr, dpr)

    const parts: Particle[] = []
    const spawn = (x: number, y: number, angle: number, spread: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const a = angle + (Math.random() - 0.5) * spread
        const v = 8 + Math.random() * 8
        parts.push({
          x,
          y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v,
          w: 5 + Math.random() * 6,
          h: 3 + Math.random() * 5,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.35,
          color: COLORS[(Math.random() * COLORS.length) | 0],
          life: 0,
          ttl: 130 + Math.random() * 70,
        })
      }
    }

    spawn(W * 0.5, H * 0.32, -Math.PI / 2, Math.PI * 1.1, 100)
    const t1 = setTimeout(() => spawn(10, H, -Math.PI / 3, 0.5, 45), 180)
    const t2 = setTimeout(() => spawn(W - 10, H, (-Math.PI * 2) / 3, 0.5, 45), 180)

    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      ctx.clearRect(0, 0, W, H)
      let alive = false
      for (const p of parts) {
        p.life++
        p.vy += 0.18
        p.vx *= 0.99
        p.vy *= 0.99
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vr
        if (p.life < p.ttl && p.y < H + 30) {
          alive = true
          ctx.save()
          ctx.globalAlpha = Math.max(0, 1 - p.life / p.ttl)
          ctx.translate(p.x, p.y)
          ctx.rotate(p.rot)
          ctx.fillStyle = p.color
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
          ctx.restore()
        }
      }
      if (alive && now - start < 6000) raf = requestAnimationFrame(tick)
      else canvas.remove()
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t1)
      clearTimeout(t2)
      canvas.remove()
    }
  }, [])

  return null
}
