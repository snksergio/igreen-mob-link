import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ICONS } from '../../assets'
import { FancyIcon } from '../../components/ui/Controls'
import { Icon } from '../../components/ui/Icon'
import { cn } from '../../lib/cn'
import { money } from '../../lib/format'
import { CHARGER_IDS, CHARGERS, capacityFor, capitalStructure, type ChargerId, type SimInputs } from '../model'
import styles from './ChargerCarousel.module.css'

const FIT_MIN = 214

/** Conteúdo de apresentação de cada eletroposto (textos da referência) */
const INFO: Record<ChargerId, { icon: string; power: string; connectors: string }> = {
  lento: { icon: ICONS.energyCircle, power: '7', connectors: '1 conector de 7 kW' },
  duo: { icon: ICONS.eletric, power: '7 + 40', connectors: '2 conectores · 7 kW e 40 kW' },
  ultra: { icon: ICONS.energyLink, power: '80', connectors: 'Potência total do equipamento' },
}

/**
 * Carrossel horizontal dos 3 eletropostos (scroll-snap). Quando nem todos cabem, aparecem abaixo
 * os pontos (cards visíveis) e as setas. Cada card é um radio: escolher troca o modelo da simulação.
 * `selected={null}`: nenhum escolhido ainda (formulário v2); sem a prop, vale o modelo das entradas.
 */
export function ChargerCarousel({
  inputs,
  onSelect,
  selected: selectedProp,
}: {
  inputs: SimInputs
  onSelect: (id: ChargerId) => void
  selected?: ChargerId | null
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const [scrollable, setScrollable] = useState(false)
  const selected = selectedProp === undefined ? inputs.charger : selectedProp

  // Pontos acompanham os cards visíveis; os controles só aparecem se houver card fora da área
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const io = new IntersectionObserver(
      (entries) => {
        setVisible((prev) => {
          const next = { ...prev }
          for (const e of entries) next[(e.target as HTMLElement).dataset.id!] = e.intersectionRatio > 0.9
          return next
        })
      },
      { root: track, threshold: [0, 0.9, 1] },
    )
    Object.values(cardRefs.current).forEach((el) => el && io.observe(el))
    // Cabem lado a lado se cada card tiver ao menos FIT_MIN px; senão vira carrossel
    const ro = new ResizeObserver(() => setScrollable(track.clientWidth - 8 < CHARGER_IDS.length * (FIT_MIN + 12) - 12))
    ro.observe(track)
    return () => {
      io.disconnect()
      ro.disconnect()
    }
  }, [])

  const reveal = (id: ChargerId, behavior: ScrollBehavior = 'smooth') => {
    const track = trackRef.current
    const card = cardRefs.current[id]
    if (!track || !card) return
    const left = card.offsetLeft - track.offsetLeft
    if (left < track.scrollLeft || left + card.offsetWidth > track.scrollLeft + track.clientWidth) {
      track.scrollTo({ left: left - 4, behavior })
    }
  }

  // O card escolhido entra na área visível (sem rolar a página): suave ao escolher, direto quando vira carrossel
  const wasScrollable = useRef(scrollable)
  useEffect(() => {
    const switched = wasScrollable.current !== scrollable
    wasScrollable.current = scrollable
    if (selected) reveal(selected, switched ? 'auto' : 'smooth')
  }, [selected, scrollable])

  const scrollBy = (dir: 1 | -1) => {
    const track = trackRef.current
    if (!track) return
    const card = track.querySelector('button')
    track.scrollBy({ left: dir * ((card?.offsetWidth ?? 260) + 12), behavior: 'smooth' })
  }

  // Setas do teclado trocam de modelo (padrão de radiogroup)
  const onKeyDown = (e: KeyboardEvent) => {
    if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return
    e.preventDefault()
    const i = selected ? CHARGER_IDS.indexOf(selected) : -1
    const next = CHARGER_IDS[(i + (e.key === 'ArrowRight' ? 1 : CHARGER_IDS.length - 1) + CHARGER_IDS.length) % CHARGER_IDS.length]
    onSelect(next)
    cardRefs.current[next]?.focus()
  }

  const first = CHARGER_IDS.find((id) => visible[id])
  const last = [...CHARGER_IDS].reverse().find((id) => visible[id])

  return (
    <div className={styles.carousel}>
      <div ref={trackRef} className={cn(styles.track, !scrollable && styles.trackFit)} role="radiogroup" aria-label="Modelo de eletroposto" onKeyDown={onKeyDown}>
        {CHARGER_IDS.map((id) => {
          const c = CHARGERS[id]
          const info = INFO[id]
          const capital = capitalStructure(id)
          const maxCars = capacityFor({ ...inputs, charger: id }).maxCars
          const active = id === selected
          const solo = c.investorShare === 1
          return (
            <button
              key={id}
              ref={(el) => {
                cardRefs.current[id] = el
              }}
              data-id={id}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active || (!selected && id === CHARGER_IDS[0]) ? 0 : -1}
              className={cn(styles.card, active && styles.cardActive)}
              onClick={() => onSelect(id)}
            >
              <span className={styles.cardTop}>
                <FancyIcon src={info.icon} bg="var(--bg-primary)" size={36} iconSize={18} />
                <span className={cn(styles.radio, active && styles.radioOn)} aria-hidden>
                  {active ? <Icon src={ICONS.checkBold} size={10} color="#fff" /> : null}
                </span>
              </span>

              <span className={styles.name}>{c.name}</span>
              <span className={styles.power}>
                {info.power}
                <small>kW</small>
              </span>
              <span className={styles.meta}>
                {info.connectors}
                <br />
                Até {maxCars} carros por dia
              </span>

              <span className={styles.invest}>
                <span className={styles.investLabel}>Seu investimento</span>
                <span className={styles.investValue}>{money(capital.investor)}</span>
                {solo ? (
                  <span className={cn(styles.society, styles.societySolo)}>100% do resultado para você</span>
                ) : (
                  <>
                    <span className={styles.society}>
                      Você {c.investorShare * 100}% · iGreen {c.igreenShare * 100}%
                    </span>
                    <span className={styles.society}>Valor total {money(capital.total)}</span>
                  </>
                )}
              </span>
            </button>
          )
        })}
      </div>

      {scrollable ? (
        <div className={styles.controls}>
          <button type="button" className={styles.arrow} onClick={() => scrollBy(-1)} disabled={first === CHARGER_IDS[0]} aria-label="Ver eletroposto anterior">
            <Icon src={ICONS.chevronDown} size={18} className={cn(styles.arrowIcon, styles.arrowLeft)} />
          </button>
          <div className={styles.dots}>
            {CHARGER_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className={cn(styles.dot, visible[id] && styles.dotOn)}
                onClick={() => reveal(id)}
                aria-label={`Mostrar ${CHARGERS[id].name}`}
                tabIndex={-1}
              />
            ))}
          </div>
          <button
            type="button"
            className={styles.arrow}
            onClick={() => scrollBy(1)}
            disabled={last === CHARGER_IDS[CHARGER_IDS.length - 1]}
            aria-label="Ver próximo eletroposto"
          >
            <Icon src={ICONS.chevronDown} size={18} className={cn(styles.arrowIcon, styles.arrowRight)} />
          </button>
        </div>
      ) : null}
    </div>
  )
}
