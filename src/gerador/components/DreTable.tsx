import { useId, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { moneyCents } from '../../lib/format'
import { fixed, num, pct } from '../format'
import { TERMS, type Charger, type MonthRow, type SimInputs } from '../model'
import styles from './Report.module.css'

type Line = { label: ReactNode; detail?: ReactNode; value: number; kind?: 'minus' | 'plus' | 'total' | 'highlight' }

function Rows({ lines }: { lines: Line[] }) {
  return (
    <dl className={styles.rows}>
      {lines.map((l, i) => (
        <div key={i} className={cn(styles.dreRow, l.kind === 'total' && styles.dreTotal, l.kind === 'highlight' && styles.dreHighlight)}>
          <dt>
            {l.label}
            {l.detail ? <small>{l.detail}</small> : null}
          </dt>
          <dd>
            {l.kind === 'minus' ? '− ' : l.kind === 'plus' ? '+ ' : ''}
            {moneyCents(Math.abs(l.value))}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * DRE do período (mês ou ano escolhido no painel) em duas partes: a SCP das recargas (Lucro Real estimado)
 * e os recebimentos do investidor (lucros da SCP + comissões da carteira).
 */
export function DreTable({
  period,
  inputs,
  charger,
  periodLabel,
  combined,
  embedded = false,
  headerAside,
}: {
  period: MonthRow
  inputs: SimInputs
  charger: Charger
  periodLabel: string
  combined: boolean
  /** Dentro de outro cartão (modal, proposta): sem borda/sombra própria */
  embedded?: boolean
  /** Substitui o selo do período no cabeçalho (ex.: o controle de período no relatório) */
  headerAside?: ReactNode
}) {
  const titleId = useId()
  const mult = periodLabel.startsWith('Ano') ? 12 : 1
  const recargas = inputs.cars * inputs.days * mult
  const kwh = inputs.cars * inputs.kwh * inputs.days * mult
  const investorPct = charger.investorShare * 100
  const solo = charger.investorShare === 1

  const scp: Line[] = [
    { label: 'Faturamento bruto de recargas', value: period.revenue, kind: 'total' },
    { label: 'Administração iGreen', detail: pct(TERMS.administration * 100, 0), value: period.administration, kind: 'minus' },
    { label: 'PIS', detail: pct(inputs.pisRate, 2), value: period.pis, kind: 'minus' },
    { label: 'Cofins', detail: pct(inputs.cofinsRate, 2), value: period.cofins, kind: 'minus' },
    ...(period.creditUsed > 0 ? [{ label: 'Créditos PIS/Cofins', value: period.creditUsed, kind: 'plus' as const }] : []),
    ...(period.localTax > 0 ? [{ label: 'Tributo local provisionado', detail: pct(inputs.localRate, 1), value: period.localTax, kind: 'minus' as const }] : []),
    { label: 'Receita após tributos e administração', value: period.revenue - period.federalRevenueTax - period.localTax - period.administration, kind: 'total' },
    {
      label: 'Custo de energia',
      detail: `≈ ${num(period.purchased, 3)} kWh × R$ ${fixed(inputs.cost)}/kWh · inclui ${num(inputs.loss)}% de perdas`,
      value: period.energy,
      kind: 'minus',
    },
    { label: 'Despesas operacionais', value: period.fixed, kind: 'minus' },
    { label: 'Resultado antes de IRPJ/CSLL', value: period.beforeRent, kind: 'total' },
    { label: 'IRPJ', detail: '15%', value: period.irpj, kind: 'minus' },
    { label: 'Adicional de IRPJ', detail: '10% do excedente', value: period.additionalIrpj, kind: 'minus' },
    { label: 'CSLL', detail: '9%', value: period.csll, kind: 'minus' },
    { label: 'Lucro líquido estimado da SCP', value: period.netProfit, kind: 'total' },
    { label: 'Repasse ao dono do ponto', detail: `${pct(inputs.share, 0)} do lucro líquido`, value: period.rent, kind: 'minus' },
    { label: 'Lucro disponível aos sócios', value: period.distributions, kind: 'total' },
  ]

  const divisao: Line[] = solo
    ? [{ label: 'Investidor', detail: '100%', value: period.investorDistribution, kind: 'highlight' }]
    : [
        { label: 'Participação iGreen', detail: pct(charger.igreenShare * 100, 0), value: period.igreenDistribution },
        { label: 'Investidor', detail: pct(investorPct, 0), value: period.investorDistribution, kind: 'highlight' },
      ]
  if (period.investorContribution > 0) divisao.push({ label: 'Aporte do investidor no déficit', value: period.investorContribution, kind: 'minus' })

  const recebimentos: Line[] = [
    { label: 'Lucros da SCP', detail: pct(investorPct, 0), value: period.investorRechargeCash },
    ...(combined
      ? [
          { label: 'Comissões de energia', detail: '4%', value: period.energyCommission, kind: 'plus' as const },
          { label: 'Comissões de seguros', detail: '5%', value: period.insuranceCommission, kind: 'plus' as const },
          { label: 'Comissões telecom', detail: 'R$ 7/linha', value: period.telecomCommission, kind: 'plus' as const },
          {
            label: 'Provisão sobre comissões',
            detail: inputs.commissionMode === 'rate' ? pct(inputs.commissionRate, 1) : 'a definir',
            value: period.commissionTax,
            kind: 'minus' as const,
          },
        ]
      : []),
    { label: 'Recebimento total estimado', value: combined ? period.totalInvestor : period.investorRechargeCash, kind: 'highlight' },
  ]

  return (
    <section className={cn(styles.card, styles.dreCard, embedded && styles.embedded)} aria-labelledby={titleId}>
      <header className={styles.cardHead}>
        <div className={styles.cardText}>
          <span className={styles.overline}>DRE · {combined ? 'carteira iGreen + recargas' : 'só recargas'}</span>
          <h2 id={titleId} className={cn('t-section-title', styles.cardTitle)}>
            Como o resultado é formado
          </h2>
          <p className={styles.cardSubtitle}>Recargas · SCP do eletroposto · Lucro Real estimado.</p>
        </div>
        {headerAside ?? <span className={styles.periodChip}>{periodLabel}</span>}
      </header>

      <div className={styles.dreGrid}>
        <div className={styles.dreCol}>
          <div className={styles.statPair}>
            <div>
              <span>Recargas no período</span>
              <b>{num(recargas)}</b>
            </div>
            <div>
              <span>Energia vendida</span>
              <b>{num(kwh)} kWh</b>
            </div>
          </div>
          <Rows lines={scp} />
          <span className={styles.groupTitle}>Divisão do saldo · total 100%</span>
          <Rows lines={divisao} />
          <p className={styles.footnote}>Distribuição limitada ao lucro positivo após impostos e repasse ao ponto.</p>
        </div>

        <div className={styles.dreCol}>
          <span className={styles.groupTitle}>Recebimentos · {combined ? 'carteira iGreen + recargas' : 'só recargas'}</span>
          <Rows lines={recebimentos} />
          <p className={styles.footnote}>
            {combined
              ? `Comissões antes de tributos do licenciado. Valores antes de eventual IR sobre distribuições e do ajuste anual do investidor. Carteira no fim do período: ${num(period.clients)} clientes nas soluções selecionadas.`
              : 'Valores antes de eventual IR sobre distribuições e do ajuste anual do investidor.'}
          </p>
        </div>
      </div>
    </section>
  )
}
