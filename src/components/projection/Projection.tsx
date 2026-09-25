import { useState } from 'react'
import { ICONS, IMAGES } from '../../assets'
import { cn } from '../../lib/cn'
import { decimal, money, moneyParts } from '../../lib/format'
import type { Simulation } from '../../lib/simulation'
import { Flag } from '../ui/Controls'
import { Img } from '../ui/Icon'
import styles from './Projection.module.css'

/** Card verde "VALOR PROJEÇÃO MENSAL" */
export function ProjectionHero({ simulation }: { simulation: Simulation }) {
  // Arredondado para o real inteiro, igual às demais exibições (R$ 2.016)
  const { int, cents } = moneyParts(Math.round(simulation.mensal))
  return (
    <div className={styles.hero} style={{ backgroundImage: `url(${IMAGES.greenCard})` }}>
      <div className={styles.heroValue}>
        <p className={styles.overline}>VALOR PROJEÇÃO MENSAL</p>
        <p className={styles.amount} aria-live="polite">
          R$ {int}
          <span className={styles.cents}>
            <span className={styles.comma}>,</span>
            {cents}
          </span>
        </p>
      </div>
      <div className={styles.chips}>
        <span className={styles.chip}>{decimal(simulation.percentual)}% do resultado</span>
        <span className={styles.chip}>Aporte {money(simulation.aporte)}</span>
      </div>
    </div>
  )
}

export function ProjectionStats({ simulation }: { simulation: Simulation }) {
  return (
    <div className={styles.stats}>
      <Stat icon={ICONS.handMoney} label="NO ANO" value={money(simulation.anual)} />
      <Stat icon={ICONS.moneyBag} label="EM 5 ANOS" value={money(simulation.contrato)} />
    </div>
  )
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statIcon}>
        <Img src={icon} size={24} />
      </span>
      <div className={styles.statText}>
        <p className={styles.statLabel}>{label}</p>
        <p className={styles.statValue}>{value}</p>
      </div>
    </div>
  )
}

export function RevenueBreakdown({ simulation }: { simulation: Simulation }) {
  const [active, setActive] = useState<string | null>(null)
  const segments = simulation.divisao.reduce<{ key: string; start: number; item: Simulation['divisao'][number] }[]>((acc, item) => {
    const prev = acc[acc.length - 1]
    acc.push({ key: item.key, start: prev ? prev.start + prev.item.share : 0, item })
    return acc
  }, [])
  const current = segments.find((s) => s.key === active)

  return (
    <div className={styles.breakdown}>
      <p className={cn('t-label', styles.breakdownTitle)}>DIVISÃO DO FATURAMENTO</p>
      <div className={styles.breakdownBody}>
        <div className={styles.barWrap} onMouseLeave={() => setActive(null)}>
          <div className={cn(styles.bar, active && styles.barFocus)}>
            {segments.map(({ key, item }) => (
              <span
                key={key}
                tabIndex={0}
                role="img"
                aria-label={`${item.label}: ${decimal(item.share * 100)}% (${money(item.value)} por mês)`}
                className={cn(styles.segment, active === key && styles.segmentActive)}
                style={{ width: `${item.share * 100}%`, background: item.color }}
                onMouseEnter={() => setActive(key)}
                onFocus={() => setActive(key)}
                onBlur={() => setActive(null)}
                onClick={() => setActive((a) => (a === key ? null : key))}
              />
            ))}
          </div>
          {current ? (
            <div
              className={styles.tooltip}
              role="tooltip"
              style={{ left: `clamp(70px, ${(current.start + current.item.share / 2) * 100}%, calc(100% - 70px))` }}
            >
              <span className={styles.tooltipLabel}>
                <span className={styles.swatch} style={{ background: current.item.color }} />
                {current.item.label}
              </span>
              <span className={styles.tooltipValue}>
                <b>{decimal(current.item.share * 100)}%</b> · {money(current.item.value)}/mês
              </span>
            </div>
          ) : null}
        </div>
        <ul className={styles.legend}>
          {simulation.divisao.map((d) => (
            <li
              key={d.key}
              className={cn(styles.legendItem, active && active !== d.key && styles.legendDim)}
              onMouseEnter={() => setActive(d.key)}
              onMouseLeave={() => setActive(null)}
            >
              <span className={styles.swatch} style={{ background: d.color }} />
              {d.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function DistributionRows({ simulation }: { simulation: Simulation }) {
  return (
    <div className={styles.rows}>
      <div className={styles.row}>
        <Img src={ICONS.fuel} size={20} />
        <p className={cn('t-body-md-semibold', styles.rowLabel)}>Distribuível para o posto</p>
        <p className={styles.rowValue}>{money(simulation.distribuivel)}</p>
      </div>
      <div className={cn(styles.row, styles.rowPrimary)}>
        <Img src={ICONS.userGreen} size={20} />
        <p className={cn('t-body-md-semibold', styles.rowLabel)}>Sua parte mensal</p>
        <p className={styles.rowValue}>{money(simulation.mensal)}</p>
      </div>
    </div>
  )
}

export const ProjectionDisclaimer = () => (
  <Flag icon={ICONS.alert}>Projeção estimada. O retorno varia conforme o faturamento do eletroposto e não é garantido.</Flag>
)
