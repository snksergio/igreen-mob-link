import { useMemo, type Ref } from 'react'
import { ICONS, IMAGES } from '../../assets'
import { Button } from '../../components/ui/Button'
import { Flag } from '../../components/ui/Controls'
import { Icon, Img } from '../../components/ui/Icon'
import { cn } from '../../lib/cn'
import { money, moneyCents, moneyParts } from '../../lib/format'
import { compactMoney, num, paybackLabel, pct, signedMoney } from '../format'
import { POTENCIA, ocultaCapital, recebidoAcumulado } from '../guided'
import { scenarioResult } from '../model'
import { useGerador } from '../state'
import { MiniReturnChart } from './MiniReturnChart'
import { PeriodControl } from './PeriodControl'
import { Segmented } from './Segmented'
import styles from './ResultPanel.module.css'

/**
 * `unit` vai menor ao lado do número; `tint` pinta de verde um ícone que não é colorido; `compact` dá um pouco mais
 * de espaço ao texto (os valores anuais de recargas e energia são mais longos que retorno e ROI)
 */
function Stat({ icon, label, value, unit, tint = false, compact = false }: { icon: string; label: string; value: string; unit?: string; tint?: boolean; compact?: boolean }) {
  return (
    <div className={cn(styles.stat, compact && styles.statCompact)}>
      <span className={styles.statIcon}>{tint ? <Icon src={icon} size={22} color="var(--fg-primary)" /> : <Img src={icon} size={24} />}</span>
      <div className={styles.statText}>
        <p className={styles.statLabel}>{label}</p>
        <p className={styles.statValue}>
          {value}
          {unit ? <small> {unit}</small> : null}
        </p>
      </div>
    </div>
  )
}

/** Energia em kWh curta para caber no card: até 99.999 por extenso, acima disso em "mil kWh" */
const energiaCurta = (kwh: number) => (kwh < 100_000 ? { value: num(Math.round(kwh)), unit: 'kWh' } : { value: num(kwh / 1000), unit: 'mil kWh' })

/**
 * Painel "Seu resultado" no padrão do simulador atual: card verde com o recebimento do período,
 * retorno e ROI (v1) ou recargas e energia vendida no período (v2), mini gráfico do saldo em 36 meses, origem do recebimento e aviso. Depois, os botões.
 * `variant="summary"`: resumo para as etapas de cadastro (mês 1, sem os controles; "Editar simulação" discreto no rodapé).
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
  const { state, setSim, result, scenario: current, version } = useGerador()
  const hideCapital = ocultaCapital(version)
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

  // v1: saldo descontando o investimento · v2: recebido acumulado (sem investimento, retorno nem ROI)
  const serie = useMemo(
    () =>
      hideCapital ? recebidoAcumulado(result, combined) : [-result.investment, ...result.months.map((m) => (combined ? m.netAccumulated : m.chargingNetAccumulated))],
    [result, combined, hideCapital],
  )

  // Movimento do período escolhido (v2, no lugar de retorno e ROI): recargas e energia vendida (kWh)
  const meses = summary || view === 'month' ? 1 : 12
  const recargas = inputs.cars * inputs.days * meses
  const energia = energiaCurta(result.delivered * meses)

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
              {hideCapital ? null : <span className={styles.chip}>Investimento {money(capital.investor)}</span>}
              <span className={styles.chip}>{solo ? '100% seu' : `Sociedade ${charger.investorShare * 100}/${charger.igreenShare * 100}`}</span>
            </div>
          </div>

          {summary ? null : <PeriodControl />}

          <div className={styles.stats}>
            {hideCapital ? (
              <>
                <Stat icon={ICONS.fuel} tint compact label="RECARGAS" value={num(recargas)} />
                <Stat icon={ICONS.lightning} tint compact label="ENERGIA" value={energia.value} unit={energia.unit} />
              </>
            ) : (
              <>
                <Stat icon={ICONS.handMoney} label="RETORNO" value={paybackLabel(scenario.payback)} />
                <Stat icon={ICONS.moneyBag} label="ROI EM 36 MESES" value={pct(scenario.roi36, 0)} />
              </>
            )}
          </div>
        </div>

        <div className={styles.middle}>
          <div className={styles.miniHead}>
            <p className={cn('t-label', styles.sectionLabel)}>{hideCapital ? 'RECEBIDO EM 36 MESES' : 'SALDO EM 36 MESES'}</p>
            <p className={styles.miniValue}>{hideCapital ? moneyCents(serie[36]) : signedMoney(scenario.net36)}</p>
          </div>
          <MiniReturnChart values={serie} payback={hideCapital ? null : scenario.payback} kind={hideCapital ? 'recebido' : 'saldo'} />
          <div className={styles.miniAxis} aria-hidden>
            <span>{hideCapital ? 'Início' : 'Investimento'}</span>
            {!hideCapital && scenario.payback != null ? (
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

        {summary && onEdit ? (
          <div className={styles.editRow}>
            <button type="button" className={styles.editLink} onClick={onEdit}>
              <Icon src={ICONS.lineEdit} size={14} className={styles.editIcon} />
              Editar simulação
            </button>
          </div>
        ) : null}

        {summary ? null : (
          <div className={styles.bottom}>
            {result.feasible ? (
              <Flag icon={ICONS.alert}>
                {hideCapital ? 'Projeção estimada. Os recebimentos variam com o movimento e não são garantidos.' : 'Projeção estimada. O retorno varia com o movimento e não é garantido.'}
              </Flag>
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
    </div>
  )
}

/** Barra fixa do celular: resultado resumido + ação (some quando o painel completo está na tela) */
export function MobileResultBar({ onContinue, hidden, actionLabel = 'Seguir' }: { onContinue: () => void; hidden: boolean; actionLabel?: string }) {
  const { state, scenario, version } = useGerador()
  const { view } = state.simulacao
  return (
    <div className={cn(styles.bar, hidden && styles.barHidden)} aria-hidden={hidden}>
      <div className={styles.barText}>
        <b>
          {compactMoney(scenario.receipt)}
          <small>{view === 'month' ? '/mês' : '/ano'}</small>
        </b>
        <span>{ocultaCapital(version) ? 'Recebimento estimado' : `Retorno em ${paybackLabel(scenario.payback).toLowerCase()}`}</span>
      </div>
      <Button className={styles.barButton} onClick={onContinue} tabIndex={hidden ? -1 : 0}>
        {actionLabel}
      </Button>
    </div>
  )
}
