import { ICONS } from '../../assets'
import { Icon } from '../../components/ui/Icon'
import { cn } from '../../lib/cn'
import type { PeriodView } from '../model'
import { useGerador } from '../state'
import { Segmented } from './Segmented'
import styles from './Segmented.module.css'

/** Mensal/Anual + mês (1–36) ou ano (1–3) do resultado. O mesmo estado vale para o painel e para o DRE */
export function PeriodControl({ className }: { className?: string }) {
  const { state, patch } = useGerador()
  const { view, month, year } = state.simulacao
  const max = view === 'month' ? 36 : 3
  const current = view === 'month' ? month : year
  const setCurrent = (n: number) => patch('simulacao', view === 'month' ? { month: n } : { year: n })

  return (
    <div className={cn(styles.period, className)}>
      <Segmented<PeriodView>
        size="sm"
        label="Período do resultado"
        value={view}
        options={[
          { value: 'month', label: 'Mensal' },
          { value: 'year', label: 'Anual' },
        ]}
        onChange={(v) => patch('simulacao', { view: v })}
      />
      <div className={styles.stepper} role="group" aria-label={view === 'month' ? 'Mês da projeção' : 'Ano da projeção'}>
        <button type="button" className={styles.stepBtn} onClick={() => setCurrent(current - 1)} disabled={current <= 1} aria-label="Período anterior">
          <Icon src={ICONS.chevronDown} size={16} className={cn(styles.stepIcon, styles.stepLeft)} />
        </button>
        <output className={styles.stepValue} aria-live="polite">
          {view === 'month' ? 'Mês' : 'Ano'} {current}
          <small> de {max}</small>
        </output>
        <button type="button" className={styles.stepBtn} onClick={() => setCurrent(current + 1)} disabled={current >= max} aria-label="Próximo período">
          <Icon src={ICONS.chevronDown} size={16} className={cn(styles.stepIcon, styles.stepRight)} />
        </button>
      </div>
    </div>
  )
}
