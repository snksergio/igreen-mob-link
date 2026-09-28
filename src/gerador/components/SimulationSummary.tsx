import { ICONS, IMAGES } from '../../assets'
import { FancyIcon } from '../../components/ui/Controls'
import { cn } from '../../lib/cn'
import { money, moneyCents, moneyParts } from '../../lib/format'
import { compactMoney, paybackLabel } from '../format'
import type { ChargerId } from '../model'
import { useGerador } from '../state'
import styles from './Summary.module.css'

const ICON: Record<ChargerId, string> = { lento: ICONS.energyCircle, duo: ICONS.eletric, ultra: ICONS.energyLink }
const POWER: Record<ChargerId, string> = { lento: '7 kW', duo: '7 + 40 kW', ultra: '80 kW' }

function useResumo() {
  const { state, result, go } = useGerador()
  const s = state.simulacao.inputs
  const combined = s.incomeMode === 'combined'
  const m1 = result.months[0]
  const solo = result.charger.investorShare === 1
  return {
    charger: s.charger,
    modelo: result.charger.name,
    investimento: result.capital.investor,
    recebimento: combined ? m1.totalInvestor : m1.investorRechargeCash,
    payback: combined ? result.payback : result.chargingPayback,
    sociedade: solo ? '100% seu' : `Você ${result.charger.investorShare * 100}% · iGreen ${result.charger.igreenShare * 100}%`,
    editar: () => go('simulador'),
  }
}

/**
 * Resumo da simulação na lateral das etapas de cadastro (como um checkout): card verde com o
 * recebimento do mês 1 e poucas linhas. Só no desktop; no celular fica o cartão compacto no corpo.
 */
export function SimulationAside() {
  const r = useResumo()
  const { int, cents } = moneyParts(r.recebimento)

  return (
    <>
      <section className={styles.aside} aria-label="Sua simulação">
        <div className={styles.asideTop}>
          <div className={styles.hero} style={{ backgroundImage: `url(${IMAGES.greenCard})` }}>
            <p className={styles.heroOverline}>RECEBIMENTO ESTIMADO NO MÊS 1</p>
            <p className={styles.heroAmount} aria-label={moneyCents(r.recebimento)}>
              R$ {int}
              <span>,{cents}</span>
            </p>
            <span className={styles.heroChip}>
              {r.modelo} · {POWER[r.charger]}
            </span>
          </div>
        </div>
        <dl className={styles.rows}>
          <div>
            <dt>Seu investimento</dt>
            <dd>{money(r.investimento)}</dd>
          </div>
          <div>
            <dt>Sociedade</dt>
            <dd>{r.sociedade}</dd>
          </div>
          <div>
            <dt>Retorno</dt>
            <dd>{paybackLabel(r.payback)}</dd>
          </div>
        </dl>
        <div className={styles.asideFoot}>
          <button type="button" className={styles.link} onClick={r.editar}>
            Editar simulação
          </button>
        </div>
      </section>
      <p className={styles.asideNote}>Projeção estimada a partir da sua simulação. Não é rendimento garantido.</p>
    </>
  )
}

/** Cartão compacto "Sua simulação" no corpo das etapas. `mobileOnly`: some no desktop, onde vale a lateral */
export function SimulationSummary({ mobileOnly = false }: { mobileOnly?: boolean }) {
  const r = useResumo()

  return (
    <section className={cn(styles.summary, mobileOnly && styles.mobileOnly)} aria-label="Sua simulação">
      <div className={styles.head}>
        <FancyIcon src={ICON[r.charger]} bg="var(--bg-primary)" size={40} iconSize={20} />
        <div className={styles.headText}>
          <span className={styles.overline}>Sua simulação</span>
          <span className={styles.model}>
            {r.modelo} · {POWER[r.charger]}
          </span>
        </div>
        <button type="button" className={styles.edit} onClick={r.editar}>
          Editar
        </button>
      </div>
      <dl className={styles.stats}>
        <div>
          <dt>Seu investimento</dt>
          <dd>{money(r.investimento)}</dd>
        </div>
        <div>
          <dt>Recebimento no mês 1</dt>
          <dd>{compactMoney(r.recebimento)}</dd>
        </div>
        <div>
          <dt>Retorno</dt>
          <dd>{paybackLabel(r.payback)}</dd>
        </div>
      </dl>
    </section>
  )
}
