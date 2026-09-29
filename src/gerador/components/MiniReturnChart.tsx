import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { moneyCents } from '../../lib/format'
import { paybackLabel, signedMoney } from '../format'
import styles from './ResultPanel.module.css'

/**
 * Mini gráfico do painel: saldo acumulado nos 36 meses do cenário escolhido (índice 0 = investimento),
 * linha do zero e o ponto do retorno. Passar o mouse, tocar ou usar as setas mostra o saldo de cada mês.
 */
/** `kind="recebido"` (v2): os valores são o recebido acumulado, sem investimento nem retorno; o tooltip começa no mês 1 */
export function MiniReturnChart({ values, payback, kind = 'saldo' }: { values: number[]; payback: number | null; kind?: 'saldo' | 'recebido' }) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(320)
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(160, Math.round(entry.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const last = values.length - 1
  const recebido = kind === 'recebido'
  const first = recebido ? 1 : 0
  const height = 84
  const pad = { top: 10, right: 6, bottom: 10, left: 6 }
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 0)
  const x = (i: number) => pad.left + (i / last) * (width - pad.left - pad.right)
  const y = (v: number) => pad.top + (1 - (v - min) / (max - min || 1)) * (height - pad.top - pad.bottom)
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const area = `${line}L${x(last).toFixed(1)},${y(0).toFixed(1)}L${x(0).toFixed(1)},${y(0).toFixed(1)}Z`

  const pick = (e: PointerEvent) => {
    const rect = ref.current!.getBoundingClientRect()
    const i = Math.round(((e.clientX - rect.left - pad.left) / (width - pad.left - pad.right)) * last)
    setHover(Math.min(last, Math.max(first, i)))
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    setHover((cur) => Math.min(last, Math.max(first, (cur ?? first) + (e.key === 'ArrowRight' ? 1 : -1))))
  }

  const tipLeft = hover == null ? 0 : Math.min(width - 150, Math.max(0, x(hover) - 75))

  return (
    <div
      ref={ref}
      className={styles.mini}
      tabIndex={0}
      role="img"
      aria-label={
        recebido
          ? `Recebido acumulado em ${last} meses: ${moneyCents(values[last])}.`
          : `Saldo acumulado em ${last} meses: retorno em ${paybackLabel(payback)}, saldo final ${signedMoney(values[last])}.`
      }
      onPointerMove={pick}
      onPointerDown={pick}
      onPointerLeave={() => setHover(null)}
      onKeyDown={onKey}
      onBlur={() => setHover(null)}
    >
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
        <line className={styles.miniZero} x1={pad.left} x2={width - pad.right} y1={y(0)} y2={y(0)} />
        <path className={styles.miniArea} d={area} />
        <path className={styles.miniLine} d={line} />
        <circle className={styles.miniDot} cx={x(last)} cy={y(values[last])} r={3.5} />
        {payback != null ? <circle className={styles.miniPayback} cx={x(payback)} cy={y(0)} r={4.5} /> : null}
        {hover != null ? (
          <g>
            <line className={styles.miniCross} x1={x(hover)} x2={x(hover)} y1={pad.top} y2={height - pad.bottom} />
            <circle className={styles.miniDot} cx={x(hover)} cy={y(values[hover])} r={4} />
          </g>
        ) : null}
      </svg>
      {hover != null ? (
        <span className={styles.miniTip} style={{ left: tipLeft }} role="status">
          <small>{hover === 0 ? 'Investimento' : `Mês ${hover}`}</small>
          <b>{signedMoney(values[hover])}</b>
        </span>
      ) : null}
    </div>
  )
}
