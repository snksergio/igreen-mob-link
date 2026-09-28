import { useId, useState } from 'react'
import { ICONS } from '../../assets'
import { FancyIcon } from '../../components/ui/Controls'
import { Icon } from '../../components/ui/Icon'
import { cn } from '../../lib/cn'
import { compactMoney } from '../format'
import type { ChargerId } from '../model'
import { useGerador } from '../state'
import { ResultPanel } from './ResultPanel'
import styles from './Summary.module.css'

const ICON: Record<ChargerId, string> = { lento: ICONS.energyCircle, duo: ICONS.eletric, ultra: ICONS.energyLink }

/**
 * Resumo da simulação na lateral das etapas de cadastro (como um checkout): o mesmo painel do
 * simulador em versão resumida (mês 1, sem os controles) e "Editar simulação". Só no desktop.
 */
export function SimulationAside() {
  const { go } = useGerador()
  return (
    <>
      <ResultPanel variant="summary" onEdit={() => go('simulador')} />
      <p className={styles.asideNote}>Projeção estimada a partir da sua simulação. Não é rendimento garantido.</p>
    </>
  )
}

/**
 * Celular: uma linha com o modelo e o recebimento do mês 1 que expande ali mesmo (sem modal)
 * para o resumo completo e o botão para voltar à simulação. `mobileOnly`: some no desktop.
 */
export function SimulationSummary({ mobileOnly = false }: { mobileOnly?: boolean }) {
  const { state, result, go } = useGerador()
  const [open, setOpen] = useState(false)
  const bodyId = useId()
  const s = state.simulacao.inputs
  const m1 = result.months[0]
  const recebimento = s.incomeMode === 'combined' ? m1.totalInvestor : m1.investorRechargeCash

  return (
    <section className={cn(styles.summary, open && styles.summaryOpen, mobileOnly && styles.mobileOnly)} aria-label="Sua simulação">
      <button type="button" className={styles.summaryHead} aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen((v) => !v)}>
        <FancyIcon src={ICON[s.charger]} bg="var(--bg-primary)" size={36} iconSize={18} />
        <span className={styles.summaryText}>
          <span className={styles.summaryOverline}>Sua simulação</span>
          <span className={styles.summaryLine}>{result.charger.name}</span>
        </span>
        <span className={styles.summaryValue}>
          {compactMoney(recebimento)}
          <small>/mês</small>
        </span>
        <Icon src={ICONS.chevronDown} size={18} className={styles.summaryChevron} />
      </button>
      {open ? (
        <div id={bodyId} className={styles.summaryBody}>
          <ResultPanel variant="summary" bare onEdit={() => go('simulador')} />
        </div>
      ) : null}
    </section>
  )
}
