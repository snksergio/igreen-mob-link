import { IMAGES } from '../../assets'
import { DialogHeader, Modal } from '../../components/ui/Modal'
import { moneyCents, moneyParts } from '../../lib/format'
import { compactMoney, paybackLabel, pct } from '../format'
import { useGerador } from '../state'
import { DreTable } from './DreTable'
import styles from './Detail.module.css'

export type ResumoItem = { label: string; value: string }

/**
 * Detalhamento da simulação (mês 1): recebimento, retorno, saldo/ROI em 36 meses e o DRE.
 * Na proposta final recebe `resumo` com os dados da proposta acima dos números.
 */
export function GeradorDetailModal({
  open,
  onClose,
  title = 'Detalhamento da simulação',
  subtitle = 'Números do mês 1 com as premissas que você escolheu',
  resumo,
}: {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  resumo?: ResumoItem[]
}) {
  const { state, result } = useGerador()
  const s = state.simulacao.inputs
  const combined = s.incomeMode === 'combined'
  const m1 = result.months[0]
  const receipt = combined ? m1.totalInvestor : m1.investorRechargeCash
  const payback = combined ? result.payback : result.chargingPayback
  const net36 = combined ? result.net36 : result.months[35].chargingNetAccumulated
  const { int, cents } = moneyParts(receipt)

  return (
    <Modal open={open} onClose={onClose} label={title} width={760} padding="compact">
      <DialogHeader title={title} subtitle={subtitle} />
      <div className={styles.content}>
        {resumo?.length ? (
          <dl className={styles.summary}>
            {resumo.map((item) => (
              <div key={item.label} className={styles.summaryRow}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div className={styles.hero} style={{ backgroundImage: `url(${IMAGES.greenCard})` }}>
          <span className={styles.heroLabel}>Recebimento estimado no mês 1 · {combined ? 'carteira + recargas' : 'só recargas'}</span>
          <span className={styles.heroValue} aria-label={moneyCents(receipt)}>
            R$ {int}
            <small>,{cents}</small>
          </span>
          <div className={styles.kpis}>
            <div>
              <span>Retorno</span>
              <b>{paybackLabel(payback)}</b>
            </div>
            <div>
              <span>Saldo em 36 meses</span>
              <b>{compactMoney(net36)}</b>
            </div>
            <div>
              <span>ROI 36 meses</span>
              <b>{pct((net36 / result.investment) * 100, 0)}</b>
            </div>
          </div>
        </div>

        <DreTable period={m1} inputs={s} charger={result.charger} periodLabel="Mês 1" combined={combined} embedded />
      </div>
    </Modal>
  )
}
