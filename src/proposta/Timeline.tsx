import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ICONS } from '../assets'
import { Icon } from '../components/ui/Icon'
import { cn } from '../lib/cn'
import type { Etapa, EtapaId } from './data'
import styles from './Timeline.module.css'

/**
 * Trilho do andamento: as seis etapas em sequência. Cada etapa é uma aba; a escolhida abre a folha logo abaixo,
 * ligada a ela por um ponteiro (`onPointer` informa o centro da etapa em px). No celular o trilho rola de lado
 * e acompanha a etapa escolhida.
 */
export function Timeline({
  etapas,
  selected,
  onSelect,
  onPointer,
  idBase,
}: {
  etapas: Etapa[]
  selected: EtapaId
  onSelect: (id: EtapaId) => void
  onPointer: (x: number) => void
  idBase: string
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const refs = useRef<Partial<Record<EtapaId, HTMLButtonElement | null>>>({})
  const [rolavel, setRolavel] = useState(false)

  const medir = useCallback(() => {
    const track = trackRef.current
    const btn = refs.current[selected]
    if (!track || !btn) return
    setRolavel(track.scrollWidth > track.clientWidth + 1)
    onPointer(btn.offsetLeft - track.scrollLeft + btn.offsetWidth / 2)
  }, [selected, onPointer])

  // A etapa escolhida fica visível no trilho (no celular ele rola)
  useLayoutEffect(() => {
    const track = trackRef.current
    const btn = refs.current[selected]
    if (track && btn && track.scrollWidth > track.clientWidth) {
      track.scrollTo({ left: btn.offsetLeft - (track.clientWidth - btn.offsetWidth) / 2, behavior: 'smooth' })
    }
    medir()
  }, [selected, medir])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const ro = new ResizeObserver(medir)
    ro.observe(track)
    track.addEventListener('scroll', medir, { passive: true })
    return () => {
      ro.disconnect()
      track.removeEventListener('scroll', medir)
    }
  }, [medir])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = etapas.findIndex((x) => x.id === selected)
    const alvo = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? etapas.length - 1 : -2
    if (alvo === -2) return
    e.preventDefault()
    const next = etapas[Math.max(0, Math.min(etapas.length - 1, alvo))].id
    onSelect(next)
    refs.current[next]?.focus()
  }

  return (
    <div
      ref={trackRef}
      className={cn(styles.track, rolavel && styles.trackRolavel)}
      role="tablist"
      aria-label="Andamento da proposta"
      onKeyDown={onKeyDown}
    >
      {etapas.map((e, i) => {
        const ativo = e.id === selected
        // a linha até esta etapa fica verde quando a anterior já foi feita ou está andando
        const anterior = etapas[i - 1]
        const linhaFeita = anterior && (anterior.status === 'feito' || anterior.status === 'andamento')
        return (
          <button
            key={e.id}
            ref={(el) => {
              refs.current[e.id] = el
            }}
            type="button"
            role="tab"
            id={`${idBase}-tab-${e.id}`}
            aria-selected={ativo}
            aria-controls={`${idBase}-folha`}
            tabIndex={ativo ? 0 : -1}
            className={cn(styles.item, styles[e.status], e.alerta && styles.alerta, ativo && styles.selected, linhaFeita && styles.lineDone)}
            onClick={() => onSelect(e.id)}
          >
            <span className={styles.node} aria-hidden>
              {(e.status === 'andamento' || e.alerta) && e.progresso != null ? <Anel fracao={e.progresso} /> : null}
              {e.status === 'feito' ? (
                <Icon src={ICONS.checkBold} size={12} color="#fff" />
              ) : e.status === 'recusado' ? (
                <Icon src={ICONS.close} size={12} color="#fff" />
              ) : (
                i + 1
              )}
            </span>
            <span className={styles.label}>{e.titulo}</span>
            <span className={styles.resumo}>{e.resumo}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Anel de progresso da etapa em andamento (ex.: parcelas pagas) */
function Anel({ fracao }: { fracao: number }) {
  const r = 16
  const c = 2 * Math.PI * r
  return (
    <svg className={styles.ring} viewBox="0 0 36 36" aria-hidden>
      <circle cx="18" cy="18" r={r} className={styles.ringTrack} />
      <circle cx="18" cy="18" r={r} className={styles.ringFill} strokeDasharray={`${c * fracao} ${c}`} />
    </svg>
  )
}
