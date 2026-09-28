import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ICONS } from '../../assets'
import { FancyIcon } from '../../components/ui/Controls'
import { Icon } from '../../components/ui/Icon'
import { cn } from '../../lib/cn'
import { money, moneyCents } from '../../lib/format'
import { CHARGER_IDS, CHARGERS, capacityFor, capitalStructure, type ChargerId, type SimInputs } from '../model'
import styles from './ChargerCarousel.module.css'

/** Conteúdo de apresentação de cada eletroposto (textos da referência) */
const INFO: Record<ChargerId, { icon: string; power: string; connectors: string }> = {
  lento: { icon: ICONS.energyCircle, power: '7', connectors: '1 conector de 7 kW' },
  duo: { icon: ICONS.eletric, power: '7 + 40', connectors: '2 conectores · 7 kW e 40 kW' },
  ultra: { icon: ICONS.energyLink, power: '80', connectors: 'Potência total do equipamento' },
}

/**
 * Carrossel horizontal dos 3 eletropostos (scroll-snap). Setas no desktop, arrastar no touch,
 * pontos indicando a posição. Cada card é um radio: escolher troca o modelo da simulação.
 */
export function ChargerCarousel({ inputs, onSelect }: { inputs: SimInputs; onSelect: (id: ChargerId) => void }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const selected = inputs.charger

  // Pontos acompanham os cards visíveis no trilho
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const observer = new IntersectionObserver(
      (entries) => {
        setVisible((prev) => {
          const next = { ...prev }
          for (const e of entries) next[(e.target as HTMLElement).dataset.id!] = e.intersectionRatio > 0.6
          return next
        })
      },
      { root: track, threshold: [0, 0.6, 1] },
    )
    Object.values(cardRefs.current).forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [])

  // O card escolhido entra na área visível (sem rolar a página)
  useEffect(() => {
    const track = trackRef.current
    const card = cardRefs.current[selected]
    if (!track || !card) return
    const left = card.offsetLeft - track.offsetLeft
    if (left < track.scrollLeft || left + card.offsetWidth > track.scrollLeft + track.clientWidth) {
      track.scrollTo({ left: left - 4, behavior: 'smooth' })
    }
  }, [selected])

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
    const i = CHARGER_IDS.indexOf(selected)
    const next = CHARGER_IDS[(i + (e.key === 'ArrowRight' ? 1 : CHARGER_IDS.length - 1)) % CHARGER_IDS.length]
    onSelect(next)
    cardRefs.current[next]?.focus()
  }

  return (
    <div className={styles.carousel}>
      <div className={styles.controls}>
        <div className={styles.dots} aria-hidden>
          {CHARGER_IDS.map((id) => (
            <span key={id} className={cn(styles.dot, visible[id] && styles.dotVisible, id === selected && styles.dotSelected)} />
          ))}
        </div>
        <div className={styles.arrows}>
          <button type="button" className={styles.arrow} onClick={() => scrollBy(-1)} aria-label="Ver eletroposto anterior">
            <Icon src={ICONS.chevronDown} size={18} className={styles.arrowIconLeft} />
          </button>
          <button type="button" className={styles.arrow} onClick={() => scrollBy(1)} aria-label="Ver próximo eletroposto">
            <Icon src={ICONS.chevronDown} size={18} className={styles.arrowIconRight} />
          </button>
        </div>
      </div>

      <div ref={trackRef} className={styles.track} role="radiogroup" aria-label="Modelo de eletroposto" onKeyDown={onKeyDown}>
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
              tabIndex={active ? 0 : -1}
              className={cn(styles.card, active && styles.cardActive)}
              onClick={() => onSelect(id)}
            >
              <span className={styles.cardTop}>
                <FancyIcon src={info.icon} bg="var(--bg-primary)" size={40} iconSize={20} />
                <span className={cn(styles.radio, active && styles.radioOn)} aria-hidden>
                  {active ? <Icon src={ICONS.checkBold} size={10} color="#fff" /> : null}
                </span>
              </span>

              <span className={styles.name}>{c.name}</span>
              <span className={styles.power}>
                {info.power}
                <small>kW</small>
              </span>
              <span className={styles.connectors}>{info.connectors}</span>
              <span className={styles.capacity} title="Limite estimado nas premissas atuais (24 h/dia)">
                Até {maxCars} carros/dia
              </span>

              <span className={styles.divider} aria-hidden />

              <span className={styles.investLabel}>Seu investimento</span>
              <span className={styles.investValue}>{money(capital.investor)}</span>

              {solo ? (
                <span className={styles.soloNote}>100% do resultado para você</span>
              ) : (
                <span className={styles.split}>
                  <span className={styles.splitBar} aria-hidden>
                    <span className={styles.splitYou} style={{ flexGrow: c.investorShare }} />
                    <span className={styles.splitIgreen} style={{ flexGrow: c.igreenShare }} />
                  </span>
                  <span className={styles.splitLegend}>
                    <span>
                      <i className={styles.keyYou} /> Você {c.investorShare * 100}%
                    </span>
                    <span>
                      <i className={styles.keyIgreen} /> iGreen {c.igreenShare * 100}%
                    </span>
                  </span>
                  <span className={styles.total}>Valor total {moneyCents(capital.total)}</span>
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
