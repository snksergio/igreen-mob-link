import { useId, useState } from 'react'
import { cn } from '../../lib/cn'
import { useGerador } from '../state'
import { DreTable } from './DreTable'
import { MonthTable } from './MonthTable'
import { PeriodControl } from './PeriodControl'
import { Premissas } from './Premissas'
import { ReturnChart } from './ReturnChart'
import { TabBar, TabPanel } from './Segmented'
import styles from './Report.module.css'

type ReportTab = 'retorno' | 'dre' | 'mes' | 'premissas'

const TABS: { value: ReportTab; label: string }[] = [
  { value: 'retorno', label: 'Retorno' },
  { value: 'dre', label: 'DRE' },
  { value: 'mes', label: 'Mês a mês' },
  { value: 'premissas', label: 'Premissas' },
]

/** Relatório completo abaixo do simulador, em abas: retorno em 36 meses, DRE do período, mês a mês e premissas */
export function SimReport() {
  const { state, result, scenario } = useGerador()
  const inputs = state.simulacao.inputs
  const { view, month, year } = state.simulacao
  const [tab, setTab] = useState<ReportTab>('retorno')
  const id = useId()

  return (
    <section className={styles.report} aria-labelledby={`${id}-titulo`}>
      <header className={styles.reportHead}>
        <div className={styles.cardText}>
          <span className={styles.overline}>Relatório da simulação</span>
          <h2 id={`${id}-titulo`} className={cn('t-section-title', styles.cardTitle)}>
            Entenda cada número
          </h2>
        </div>
        <TabBar className={styles.reportTabs} label="Seções do relatório" value={tab} options={TABS} onChange={setTab} idBase={id} />
      </header>

      <TabPanel idBase={id} value={tab}>
        {tab === 'retorno' ? <ReturnChart result={result} mode={inputs.incomeMode} embedded /> : null}
        {tab === 'dre' ? (
          <DreTable
            period={scenario.period}
            inputs={inputs}
            charger={result.charger}
            periodLabel={view === 'month' ? `Mês ${month}` : `Ano ${year}`}
            combined={inputs.incomeMode === 'combined'}
            embedded
            headerAside={<PeriodControl />}
          />
        ) : null}
        {tab === 'mes' ? <MonthTable months={result.months} embedded /> : null}
        {tab === 'premissas' ? <Premissas /> : null}
      </TabPanel>
    </section>
  )
}
