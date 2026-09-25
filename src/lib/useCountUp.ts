import { useEffect, useState } from 'react'

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3

/**
 * Progresso animado de 0 a 1 (easing out) — usado para "contar" números e encher barras juntos.
 * Com "reduzir movimento" ativo, vai direto para 1.
 */
export function useCountUp(duration = 1400, delay = 0) {
  const [progress, setProgress] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 0,
  )

  useEffect(() => {
    if (progress === 1) return
    let frame = 0
    let start = 0
    const tick = (now: number) => {
      if (!start) start = now + delay
      const t = Math.min(1, Math.max(0, (now - start) / duration))
      setProgress(easeOutCubic(t))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // anima uma única vez ao montar
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return progress
}
