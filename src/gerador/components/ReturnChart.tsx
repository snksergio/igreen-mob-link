import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { cn } from '../../lib/cn'
import { compactMoney, paybackLabel, pct, signedMoney } from '../format'
import type { IncomeMode, SimResult } from '../model'
import styles from './Report.module.css'

type Series = { key: 'combined' | 'charging'; label: string; values: number[]; className: string }

/** Passo "bonito" para o eixo: 1, 2, 2,5 ou 5 × 10^n */
function niceStep(range: number, target = 4) {
  const raw = range / target
  const pow = 10 ** Math.floor(Math.log10(raw || 1))
  const n = raw / pow
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow
}

/**
 * Retorno do capital em 36 meses: saldo acumulado (recebimentos − investimento) com carteira × só recargas.
 * Linha do zero = investimento recuperado; o marcador indica o mês do retorno do cenário escolhido.
 * Crosshair com tooltip por mês (mouse, toque e setas do teclado).
 */
export function ReturnChart({ result, mode }: { result: SimResult; mode: IncomeMode }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(640)
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const series = useMemo<Series[]>(() => {
    const start = -result.investment
    const combined = [start, ...result.months.map((m) => m.netAccumulated)]
    const charging = [start, ...result.months.map((m) => m.chargingNetAccumulated)]
    const same = combined.every((v, i) => Math.abs(v - charging[i]) < 0.5)
    const list: Series[] = [{ key: 'combined', label: 'Recargas + carteira iGreen', values: combined, className: styles.seriesA }]
    if (!same) list.push({ key: 'charging', label: 'Somente recargas', values: charging, className: styles.seriesB })
    return same ? [{ ...list[0], label: 'Recargas' }] : list
  }, [result])

  const narrow = width < 520
  const height = narrow ? 230 : 280
  const m = { top: 16, right: narrow ? 12 : 20, bottom: 30, left: narrow ? 54 : 66 }
  const w = width - m.left - m.right
  const h = height - m.top - m.bottom

  const all = series.flatMap((s) => s.values)
  const step = niceStep(Math.max(...all, 0) - Math.min(...all, 0))
  const yMin = Math.floor(Math.min(...all, 0) / step) * step
  const yMax = Math.ceil(Math.max(...all, 0) / step) * step
  const ticks: number[] = []
  for (let v = yMin; v <= yMax + step / 2; v += step) ticks.push(v)

  const x = (month: number) => m.left + (month / 36) * w
  const y = (value: number) => m.top + (1 - (value - yMin) / (yMax - yMin || 1)) * h
  const path = (values: number[]) => values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const area = (values: number[]) => `${path(values)}L${x(36).toFixed(1)},${y(0).toFixed(1)}L${x(0).toFixed(1)},${y(0).toFixed(1)}Z`

  const payback = mode === 'combined' || series.length === 1 ? result.payback : result.chargingPayback
  const net = mode === 'combined' || series.length === 1 ? result.net36 : result.months[35].chargingNetAccumulated

  const pick = (clientX: number) => {
    const rect = wrapRef.current!.getBoundingClientRect()
    const month = Math.round(((clientX - rect.left - m.left) / w) * 36)
    setHover(Math.min(36, Math.max(0, month)))
  }
  const onPointer = (e: PointerEvent) => pick(e.clientX)
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    setHover((cur) => Math.min(36, Math.max(0, (cur ?? 0) + (e.key === 'ArrowRight' ? 1 : -1))))
  }

  const tipLeft = hover == null ? 0 : Math.min(width - 190, Math.max(0, x(hover) - 95))

  return (
    <section className={styles.card} aria-labelledby="retorno-titulo">
      <header className={styles.cardHead}>
        <div className={styles.cardText}>
          <span className={styles.overline}>Retorno do capital</span>
          <h2 id="retorno-titulo" className={cn('t-section-title', styles.cardTitle)}>
            O impacto da carteira no seu investimento
          </h2>
          <p className={styles.cardSubtitle}>Recebimentos acumulados, descontando o investimento inicial.</p>
        </div>
        <div className={styles.headStat}>
          <span>Saldo em 36 meses</span>
          <b>{signedMoney(net)}</b>
          <small>ROI acumulado: {pct((net / result.investment) * 100, 0)}</small>
        </div>
      </header>

      {series.length > 1 ? (
        <ul className={styles.legend}>
          {series.map((s) => (
            <li key={s.key}>
              <i className={cn(styles.legendKey, s.className)} />
              {s.label}
            </li>
          ))}
        </ul>
      ) : null}

      <div
        ref={wrapRef}
        className={styles.chart}
        tabIndex={0}
        role="img"
        aria-label={`Gráfico do saldo acumulado em 36 meses. Retorno em ${paybackLabel(payback)}. Saldo final ${signedMoney(net)}.`}
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        onPointerLeave={() => setHover(null)}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
      >
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
          {ticks.map((t) => (
            <g key={t}>
              <line className={cn(styles.grid, t === 0 && styles.zero)} x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} />
              <text className={styles.axis} x={m.left - 8} y={y(t)} dy="0.32em" textAnchor="end">
                {compactMoney(t)}
              </text>
            </g>
          ))}
          {[0, 6, 12, 18, 24, 30, 36].map((mo) => (
            <text key={mo} className={styles.axis} x={x(mo)} y={height - 8} textAnchor={mo === 0 ? 'start' : mo === 36 ? 'end' : 'middle'}>
              {mo === 0 ? (narrow ? '0' : 'Início') : narrow ? `${mo}m` : `${mo} meses`}
            </text>
          ))}

          <path className={cn(styles.area, series[0].className)} d={area(series[0].values)} />
          {[...series].reverse().map((s) => (
            <path key={s.key} className={cn(styles.line, s.className)} d={path(s.values)} />
          ))}

          {/* Rótulos diretos no fim de cada linha (se ficarem próximos, o segundo desce) */}
          {series.map((s, i) => {
            const end = s.values[36]
            const other = series[1 - i]?.values[36]
            const close = other != null && Math.abs(y(end) - y(other)) < 18
            const below = close && end < other
            return (
              <g key={`end-${s.key}`}>
                <circle className={cn(styles.hoverDot, s.className)} cx={x(36)} cy={y(end)} r={4} />
                <text className={styles.endLabel} x={x(36) - 8} y={y(end) + (below ? 16 : -10)} textAnchor="end">
                  {compactMoney(end)}
                </text>
              </g>
            )
          })}

          {payback != null ? (
            <g>
              <circle className={styles.paybackDot} cx={x(payback)} cy={y(0)} r={5} />
            </g>
          ) : null}

          {hover != null ? (
            <g>
              <line className={styles.crosshair} x1={x(hover)} x2={x(hover)} y1={m.top} y2={m.top + h} />
              {series.map((s) => (
                <circle key={s.key} className={cn(styles.hoverDot, s.className)} cx={x(hover)} cy={y(s.values[hover])} r={4.5} />
              ))}
            </g>
          ) : null}
        </svg>

        {payback != null ? (
          <span className={styles.paybackPill} style={{ left: Math.min(width - 150, Math.max(0, x(payback) - 12)), top: y(0) - 38 }}>
            Retorno em {paybackLabel(payback)}
          </span>
        ) : null}

        {hover != null ? (
          <div className={styles.tooltip} style={{ left: tipLeft }} role="status">
            <span className={styles.tooltipTitle}>{hover === 0 ? 'Início · investimento' : `Mês ${hover}`}</span>
            {series.map((s) => (
              <span key={s.key} className={styles.tooltipRow}>
                <i className={cn(styles.tooltipKey, s.className)} />
                <b>{signedMoney(s.values[hover])}</b>
                <small>{s.label}</small>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <p className={styles.footnote}>Valores nominais · premissas constantes · antes de IR pessoal. Toque ou passe o mouse no gráfico para ver cada mês.</p>
    </section>
  )
}
