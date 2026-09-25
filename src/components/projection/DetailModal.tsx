import type { Simulation } from '../../lib/simulation'
import { DialogHeader, Modal } from '../ui/Modal'
import { DistributionRows, ProjectionDisclaimer, ProjectionHero, ProjectionStats, RevenueBreakdown } from './Projection'
import styles from './DetailModal.module.css'

export type ResumoItem = { label: string; value: string }

/**
 * "Modal detalhamento" do Figma (node 1:1109). Na tela da proposta recebe título próprio e um `resumo`
 * curto da proposta (ID, investidor, carregadores, contrato, local) acima da projeção.
 */
export function DetailModal({
  open,
  onClose,
  simulation,
  title = 'Detalhes do investimento',
  subtitle = 'Simulação de números baseados nas informações preenchidas',
  resumo,
}: {
  open: boolean
  onClose: () => void
  simulation: Simulation
  title?: string
  subtitle?: string
  resumo?: ResumoItem[]
}) {
  return (
    <Modal open={open} onClose={onClose} label={title} width={500} padding="compact">
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
        <div className={styles.group}>
          <ProjectionHero simulation={simulation} />
          <ProjectionStats simulation={simulation} />
        </div>
        <div className={styles.groupLarge}>
          <RevenueBreakdown simulation={simulation} />
          <DistributionRows simulation={simulation} />
        </div>
        <ProjectionDisclaimer />
      </div>
    </Modal>
  )
}
