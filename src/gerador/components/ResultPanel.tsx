import type { Ref } from 'react'
import { ICONS, IMAGES } from '../../assets'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { cn } from '../../lib/cn'
import { moneyCents, moneyParts } from '../../lib/format'
import { compactMoney, paybackLabel, pct, signedMoney } from '../format'
import type { PeriodView } from '../model'
import { useGerador } from '../state'
import styles from './ResultPanel.module.css'

function Segment<T extends string>({ label, value, options, onChange, small }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; small?: boolean }) {
  return (
    <div className={cn(styles.segment, small && styles.segmentSmall)} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} className={cn(styles.segmentItem, o.value === value && styles.segmentOn)} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Painel "Seu resultado": cenário, período, recebimento, retorno, saldo, ROI e o botão para seguir */
export function ResultPanel({ onContinue, panelRef }: { onContinue: () => void; panelRef?: Ref<HTMLDivElement> }) {
  const { state, patch, setSim, result, scenario } = useGerador()
  const { view, month, year } = state.simulacao
  const combined = state.simulacao.inputs.incomeMode === 'combined'
  const p = scenario.period
  const { int, cents } = moneyParts(scenario.receipt)
  const periodo = view === 'month' ? `no mês ${month}` : `no ano ${year}`
  const max = view === 'month' ? 36 : 3
  const current = view === 'month' ? month : year
  const setCurrent = (n: number) => patch('simulacao', view === 'month' ? { month: n } : { year: n })

  const notes = [
    !result.feasible && { tone: 'warning', text: 'Acima da capacidade estimada: reduza os carros por dia ou os kWh por carro.' },
    result.localTaxPending && { tone: 'muted', text: 'Tributo local a definir: prévia sem ICMS adicional.' },
    combined && result.commissionTaxPending && { tone: 'muted', text: 'Tributação das comissões a definir: valores antes de tributos.' },
  ].filter(Boolean) as { tone: 'warning' | 'muted'; text: string }[]

  return (
    <div className={styles.wrap} ref={panelRef}>
      <section className={styles.card} style={{ backgroundImage: `url(${IMAGES.greenCard})` }} aria-label="Seu resultado">
        <header className={styles.head}>
          <span className={styles.overline}>Visão do investidor</span>
          <span className={styles.model}>{result.charger.name}</span>
        </header>

        <Segment
          label="Receitas incluídas no resultado"
          value={combined ? 'combined' : 'charging'}
          options={[
            { value: 'combined', label: 'Carteira + recargas' },
            { value: 'charging', label: 'Só recargas' },
          ]}
          onChange={(incomeMode) => setSim({ incomeMode })}
        />

        <div className={styles.period}>
          <Segment<PeriodView>
            small
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
              <Icon src={ICONS.chevronDown} size={16} className={styles.stepLeft} />
            </button>
            <output className={styles.stepValue} aria-live="polite">
              {view === 'month' ? 'Mês' : 'Ano'} {current}
              <small> de {max}</small>
            </output>
            <button type="button" className={styles.stepBtn} onClick={() => setCurrent(current + 1)} disabled={current >= max} aria-label="Próximo período">
              <Icon src={ICONS.chevronDown} size={16} className={styles.stepRight} />
            </button>
          </div>
        </div>

        <div className={styles.hero}>
          <span className={styles.heroLabel}>Recebimento estimado {periodo}</span>
          <span className={styles.heroValue} aria-label={moneyCents(scenario.receipt)}>
            R$ {int}
            <small>,{cents}</small>
          </span>
        </div>

        <div className={styles.rows}>
          <div className={styles.row}>
            <span>
              Recargas <small>· líquido do investidor</small>
            </span>
            <b>{signedMoney(p.investorRechargeCash)}</b>
          </div>
          {combined ? (
            <div className={styles.row}>
              <span>
                Carteira iGreen <small>· {p.clients} clientes</small>
              </span>
              <b>{moneyCents(p.commissionNet)}</b>
            </div>
          ) : null}
        </div>

        <div className={styles.kpis}>
          <div className={styles.kpi}>
            <span>Retorno</span>
            <b>{paybackLabel(scenario.payback)}</b>
          </div>
          <div className={styles.kpi}>
            <span>Saldo em 36 meses</span>
            <b>{compactMoney(scenario.net36)}</b>
          </div>
          <div className={styles.kpi}>
            <span>ROI 36 meses</span>
            <b>{pct(scenario.roi36, 0)}</b>
          </div>
        </div>
      </section>

      {notes.length ? (
        <ul className={styles.notes}>
          {notes.map((n) => (
            <li key={n.text} className={cn(styles.note, n.tone === 'warning' && styles.noteWarning)}>
              {n.text}
            </li>
          ))}
        </ul>
      ) : null}

      <Button className={styles.cta} onClick={onContinue}>
        Seguir para proposta
      </Button>
      <p className={styles.ctaHint}>Cenário ilustrativo. Você revisa tudo antes de gerar a proposta.</p>
    </div>
  )
}

/** Barra fixa do celular: resultado resumido + seguir (some quando o painel completo está na tela) */
export function MobileResultBar({ onContinue, hidden }: { onContinue: () => void; hidden: boolean }) {
  const { scenario, state } = useGerador()
  const { view } = state.simulacao
  return (
    <div className={cn(styles.bar, hidden && styles.barHidden)} aria-hidden={hidden}>
      <div className={styles.barText}>
        <b>
          {compactMoney(scenario.receipt)}
          <small>{view === 'month' ? '/mês' : '/ano'}</small>
        </b>
        <span>Retorno em {paybackLabel(scenario.payback).toLowerCase()}</span>
      </div>
      <Button className={styles.barButton} onClick={onContinue} tabIndex={hidden ? -1 : 0}>
        Seguir
      </Button>
    </div>
  )
}
