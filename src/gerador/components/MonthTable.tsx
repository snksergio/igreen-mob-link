import { useMemo, useState } from 'react'
import { cn } from '../../lib/cn'
import { moneyCents } from '../../lib/format'
import { signedMoney } from '../format'
import type { MonthRow } from '../model'
import styles from './Report.module.css'

/** Mês a mês dos 3 anos: tabela no desktop, cards no celular. `recebido` (v2): última coluna com o recebido acumulado, sem descontar o investimento */
export function MonthTable({ months, embedded = false, recebido = false }: { months: MonthRow[]; embedded?: boolean; recebido?: boolean }) {
  const [ano, setAno] = useState(1)
  const rows = months.slice((ano - 1) * 12, ano * 12)
  const acumulado = useMemo(() => months.reduce<number[]>((acc, m) => [...acc, (acc.at(-1) ?? 0) + m.totalInvestor], []), [months])

  return (
    <section className={cn(styles.card, embedded && styles.embedded)} aria-labelledby="mes-titulo">
      <header className={styles.cardHead}>
        <div className={styles.cardText}>
          <span className={styles.overline}>Mês a mês</span>
          <h2 id="mes-titulo" className={cn('t-section-title', styles.cardTitle)}>
            Da primeira recarga à carteira formada
          </h2>
        </div>
        <div className={styles.pills} role="tablist" aria-label="Ano da tabela">
          {[1, 2, 3].map((a) => (
            <button key={a} type="button" role="tab" aria-selected={a === ano} className={cn(styles.pill, a === ano && styles.pillOn)} onClick={() => setAno(a)}>
              Ano {a}
            </button>
          ))}
        </div>
      </header>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Mês</th>
              <th scope="col">Recargas¹</th>
              <th scope="col">Energia²</th>
              <th scope="col">Seguros²</th>
              <th scope="col">Telecom²</th>
              <th scope="col">Total com carteira³</th>
              <th scope="col">{recebido ? 'Recebido acumulado³' : 'Saldo com carteira³'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.month}>
                <th scope="row">{r.month}</th>
                <td>{signedMoney(r.investorRechargeCash)}</td>
                <td>{moneyCents(r.energyCommission)}</td>
                <td>{moneyCents(r.insuranceCommission)}</td>
                <td>{moneyCents(r.telecomCommission)}</td>
                <td className={styles.strong}>{moneyCents(r.totalInvestor)}</td>
                {recebido ? (
                  <td className={styles.strong}>{moneyCents(acumulado[r.month - 1])}</td>
                ) : (
                  <td className={cn(styles.strong, r.netAccumulated < 0 ? styles.negative : styles.positive)}>{signedMoney(r.netAccumulated)}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className={styles.monthCards}>
        {rows.map((r) => (
          <li key={r.month} className={styles.monthCard}>
            <div className={styles.monthHead}>
              <b>Mês {r.month}</b>
              {recebido ? (
                <span>Acumulado {moneyCents(acumulado[r.month - 1])}</span>
              ) : (
                <span className={r.netAccumulated < 0 ? styles.negative : styles.positive}>Saldo {signedMoney(r.netAccumulated)}</span>
              )}
            </div>
            <div className={styles.monthTotal}>
              <span>Total com carteira</span>
              <b>{moneyCents(r.totalInvestor)}</b>
            </div>
            <div className={styles.monthSplit}>
              <span>Recargas {signedMoney(r.investorRechargeCash)}</span>
              <span>Energia {moneyCents(r.energyCommission)}</span>
              <span>Seguros {moneyCents(r.insuranceCommission)}</span>
              <span>Telecom {moneyCents(r.telecomCommission)}</span>
            </div>
          </li>
        ))}
      </ul>

      <p className={styles.footnote}>
        ¹ Recebimentos das recargas, líquidos de eventuais aportes estimados. ² Comissões brutas. ³ Total inclui a carteira após a provisão informada sobre comissões.{' '}
        {recebido ? 'O acumulado soma o total com carteira desde o mês 1.' : 'O saldo desconta seu investimento inicial.'}
      </p>
    </section>
  )
}
