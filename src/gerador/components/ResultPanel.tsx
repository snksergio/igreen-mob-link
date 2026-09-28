import { useMemo, type Ref } from 'react'
import { ICONS, IMAGES } from '../../assets'
import { Button } from '../../components/ui/Button'
import { Flag } from '../../components/ui/Controls'
import { Img } from '../../components/ui/Icon'
import { cn } from '../../lib/cn'
import { money, moneyCents, moneyParts } from '../../lib/format'
import { compactMoney, paybackLabel, pct, signedMoney } from '../format'
import { POTENCIA } from '../guided'
import { scenarioResult } from '../model'
import { useGerador } from '../state'
import { MiniReturnChart } from './MiniReturnChart'
import { PeriodControl } from './PeriodControl'
import { Segmented } from './Segmented'
import styles from './ResultPanel.module.css'

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statIcon}>
        <Img src={icon} size={24} />
      </span>
      <div className={styles.statText}>
        <p className={styles.statLabel}>{label}</p>
        <p className={styles.statValue}>{value}</p>
      </div>
    </div>
  )
}

/**
 * Painel "Seu resultado" no padrão do simulador atual: card verde com o recebimento do período,
 * retorno e ROI, mini gráfico do saldo em 36 meses, origem do recebimento e aviso. Depois, os botões.
 * `variant="summary"`: resumo para as etapas de cadastro (mês 1, sem os controles, com "Editar simulação").
 * `bare`: sem a moldura própria, para ficar dentro de outro cartão (resumo expansível do celular).
 */
export function ResultPanel({
  onContinue,
  onShare,
  onEdit,
  panelRef,
  variant = 'full',
  bare = false,
}: {
  onContinue?: () => void
  onShare?: () => void
  onEdit?: () => void
  panelRef?: Ref<HTMLDivElement>
  variant?: 'full' | 'summary'
  bare?: boolean
}) {
  const { state, setSim, result, scenario: current } = useGerador()
  const { inputs, view, month, year } = state.simulacao
  const summary = variant === 'summary'
  const combined = inputs.incomeMode === 'combined'
  const monthOne = useMemo(() => scenarioResult(result, inputs.incomeMode, 'month', 1, 1), [result, inputs.incomeMode])
  const scenario = summary ? monthOne : current
  const p = scenario.period
  const { int, cents } = moneyParts(scenario.receipt)
  const { charger, capital } = result
  const solo = charger.investorShare === 1
  const periodo = summary || view === 'month' ? `NO MÊS ${summary ? 1 : month}` : `NO ANO ${year}`

  const saldo = useMemo(
    () => [-result.investment, ...result.months.map((m) => (combined ? m.netAccumulated : m.chargingNetAccumulated))],
    [result, combined],
  )

  const pendentes = [result.localTaxPending && 'sem ICMS adicional', combined && result.commissionTaxPending && 'com comissões antes de tributos'].filter(Boolean)

  return (
    <div className={styles.wrap} ref={panelRef}>
      <section className={cn(styles.panel, bare && styles.bare)} aria-label={summary ? 'Sua simulação' : 'Seu resultado'}>
        <div className={styles.top}>
          {summary ? (
            bare ? null : (
              <div className={styles.summaryHead}>
                <span className={styles.summaryOverline}>Sua simulação</span>
                <span className={styles.summaryModel}>
                  {charger.name} · {POTENCIA[inputs.charger]}
                </span>
              </div>
            )
          ) : (
            <Segmented
              label="Receitas incluídas no resultado"
              value={combined ? 'combined' : 'charging'}
              options={[
                { value: 'combined', label: 'Carteira + recargas' },
                { value: 'charging', label: 'Só recargas' },
              ]}
              onChange={(incomeMode) => setSim({ incomeMode })}
            />
          )}

          <div className={styles.hero} style={{ backgroundImage: `url(${IMAGES.greenCard})` }}>
            <div className={styles.heroValue}>
              <p className={styles.overline}>RECEBIMENTO ESTIMADO {periodo}</p>
              <p className={styles.amount} aria-live="polite" aria-label={moneyCents(scenario.receipt)}>
                R$ {int}
                <span className={styles.cents}>,{cents}</span>
              </p>
            </div>
            <div className={styles.chips}>
              <span className={styles.chip}>Investimento {money(capital.investor)}</span>
              <span className={styles.chip}>{solo ? '100% seu' : `Sociedade ${charger.investorShare * 100}/${charger.igreenShare * 100}`}</span>
            </div>
          </div>

          {summary ? null : <PeriodControl />}

          <div className={styles.stats}>
            <Stat icon={ICONS.handMoney} label="RETORNO" value={paybackLabel(scenario.payback)} />
            <Stat icon={ICONS.moneyBag} label="ROI EM 36 MESES" value={pct(scenario.roi36, 0)} />
          </div>
        </div>

        <div className={styles.middle}>
          <div className={styles.miniHead}>
            <p className={cn('t-label', styles.sectionLabel)}>SALDO EM 36 MESES</p>
            <p className={styles.miniValue}>{signedMoney(scenario.net36)}</p>
          </div>
          <MiniReturnChart values={saldo} payback={scenario.payback} />
          <div className={styles.miniAxis} aria-hidden>
            <span>Investimento</span>
            {scenario.payback != null ? (
              <span className={styles.miniAxisPayback}>
                <i /> retorno em {paybackLabel(scenario.payback)}
              </span>
            ) : null}
            <span>36 meses</span>
          </div>

          <div className={styles.rows}>
            <div className={styles.row}>
              <Img src={ICONS.fuel} size={20} />
              <p className={styles.rowLabel}>
                Recargas <small>líquido do investidor</small>
              </p>
              <p className={styles.rowValue}>{signedMoney(p.investorRechargeCash)}</p>
            </div>
            {combined ? (
              <div className={cn(styles.row, styles.rowPrimary)}>
                <Img src={ICONS.userGreen} size={20} />
                <p className={styles.rowLabel}>
                  Carteira iGreen <small>{p.clients} clientes</small>
                </p>
                <p className={styles.rowValue}>{moneyCents(p.commissionNet)}</p>
              </div>
            ) : null}
          </div>
        </div>

        {summary ? null : (
          <div className={styles.bottom}>
            {result.feasible ? (
              <Flag icon={ICONS.alert}>Projeção estimada. O retorno varia com o movimento e não é garantido.</Flag>
            ) : (
              <Flag icon={ICONS.alert} tone="warning">
                Acima da capacidade estimada: reduza os carros por dia ou os kWh por carro.
              </Flag>
            )}
            {pendentes.length ? <p className={styles.pending}>Prévia {pendentes.join(' e ')}. Ajuste em Tributos.</p> : null}
          </div>
        )}
      </section>

      {onContinue ? (
        <Button className={styles.cta} onClick={onContinue}>
          Seguir para proposta
        </Button>
      ) : null}
      {onShare ? (
        <Button variant="secondary" className={styles.cta} onClick={onShare}>
          Compartilhar simulação
        </Button>
      ) : null}
      {onEdit ? (
        <Button variant="secondary" className={styles.cta} onClick={onEdit}>
          Editar simulação
        </Button>
      ) : null}
    </div>
  )
}

/** Barra fixa do celular: resultado resumido + ação (some quando o painel completo está na tela) */
export function MobileResultBar({ onContinue, hidden, actionLabel = 'Seguir' }: { onContinue: () => void; hidden: boolean; actionLabel?: string }) {
  const { state, scenario } = useGerador()
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
        {actionLabel}
      </Button>
    </div>
  )
}
