import { ICONS } from '../../assets'
import { FancyIcon } from '../../components/ui/Controls'
import { money } from '../../lib/format'
import { compactMoney, paybackLabel } from '../format'
import type { ChargerId } from '../model'
import { useGerador } from '../state'
import styles from './Summary.module.css'

const ICON: Record<ChargerId, string> = { lento: ICONS.energyCircle, duo: ICONS.eletric, ultra: ICONS.energyLink }
const POWER: Record<ChargerId, string> = { lento: '7 kW', duo: '7 + 40 kW', ultra: '80 kW' }

/** Cartão compacto "Sua simulação" (etapas 2 a 4), com atalho para ajustar */
export function SimulationSummary() {
  const { state, result, go } = useGerador()
  const s = state.simulacao.inputs
  const combined = s.incomeMode === 'combined'
  const m1 = result.months[0]
  const recebimento = combined ? m1.totalInvestor : m1.investorRechargeCash
  const payback = combined ? result.payback : result.chargingPayback

  return (
    <section className={styles.summary} aria-label="Sua simulação">
      <div className={styles.head}>
        <FancyIcon src={ICON[s.charger]} bg="var(--bg-primary)" size={40} iconSize={20} />
        <div className={styles.headText}>
          <span className={styles.overline}>Sua simulação</span>
          <span className={styles.model}>
            {result.charger.name} · {POWER[s.charger]}
          </span>
        </div>
        <button type="button" className={styles.edit} onClick={() => go('simulador')}>
          Editar simulação
        </button>
      </div>
      <dl className={styles.stats}>
        <div>
          <dt>Seu investimento</dt>
          <dd>{money(result.capital.investor)}</dd>
        </div>
        <div>
          <dt>Recebimento no mês 1</dt>
          <dd>{compactMoney(recebimento)}</dd>
        </div>
        <div>
          <dt>Retorno</dt>
          <dd>{paybackLabel(payback)}</dd>
        </div>
      </dl>
    </section>
  )
}
