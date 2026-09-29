import { useId, useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import { ocultaCapital } from '../guided'
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
  const { state, result, scenario, version } = useGerador()
  const hideCapital = ocultaCapital(version)
  const inputs = state.simulacao.inputs
  const { view, month, year } = state.simulacao
  const [tab, setTab] = useState<ReportTab>('retorno')
  const id = useId()
  const barRef = useRef<HTMLDivElement>(null)

  // Trocar de aba com as abas grudadas no topo leva ao começo da nova seção
  const choose = (next: ReportTab) => {
    setTab(next)
    const bar = barRef.current
    if (!bar || bar.getBoundingClientRect().top > 1) return
    requestAnimationFrame(() => {
      const panel = document.getElementById(`${id}-panel-${next}`)
      if (panel) window.scrollTo({ top: panel.getBoundingClientRect().top + window.scrollY - bar.offsetHeight - 8 })
    })
  }

  return (
    <section className={styles.report} aria-labelledby={`${id}-titulo`}>
      <header className={cn(styles.cardText, styles.reportHead)}>
        <span className={styles.overline}>Relatório da simulação</span>
        <h2 id={`${id}-titulo`} className={cn('t-section-title', styles.cardTitle)}>
          Entenda cada número
        </h2>
      </header>
      {/* Filho direto do relatório: no celular as abas grudam no topo enquanto a pessoa rola o conteúdo */}
      <div ref={barRef} className={styles.reportTabsBar}>
        <TabBar
          className={styles.reportTabs}
          label="Seções do relatório"
          value={tab}
          options={hideCapital ? TABS.map((t) => (t.value === 'retorno' ? { ...t, label: 'Acumulado' } : t)) : TABS}
          onChange={choose}
          idBase={id}
        />
      </div>

      <TabPanel idBase={id} value={tab} className={styles.reportPanel}>
        {tab === 'retorno' ? <ReturnChart result={result} mode={inputs.incomeMode} embedded recebido={hideCapital} /> : null}
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
        {tab === 'mes' ? <MonthTable months={result.months} embedded recebido={hideCapital} /> : null}
        {tab === 'premissas' ? <Premissas /> : null}
      </TabPanel>
    </section>
  )
}
