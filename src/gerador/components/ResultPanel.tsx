import { useMemo, type Ref } from 'react'
import { ICONS, IMAGES } from '../../assets'
import { Button } from '../../components/ui/Button'
import { Flag } from '../../components/ui/Controls'
import { Img } from '../../components/ui/Icon'
import { cn } from '../../lib/cn'
import { money, moneyCents, moneyParts } from '../../lib/format'
import { compactMoney, paybackLabel, pct, signedMoney } from '../format'
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
 * retorno e ROI, mini gráfico do saldo em 36 meses, origem do recebimento e aviso. Depois, o botão para seguir.
 */
export function ResultPanel({ onContinue, panelRef }: { onContinue: () => void; panelRef?: Ref<HTMLDivElement> }) {
  const { state, setSim, result, scenario } = useGerador()
  const { view, month, year } = state.simulacao
  const combined = state.simulacao.inputs.incomeMode === 'combined'
  const p = scenario.period
  const { int, cents } = moneyParts(scenario.receipt)
  const { charger, capital } = result
  const solo = charger.investorShare === 1

  const saldo = useMemo(
    () => [-result.investment, ...result.months.map((m) => (combined ? m.netAccumulated : m.chargingNetAccumulated))],
    [result, combined],
  )

  const pendentes = [result.localTaxPending && 'sem ICMS adicional', combined && result.commissionTaxPending && 'com comissões antes de tributos'].filter(Boolean)

  return (
    <div className={styles.wrap} ref={panelRef}>
      <section className={styles.panel} aria-label="Seu resultado">
        <div className={styles.top}>
          <Segmented
            label="Receitas incluídas no resultado"
            value={combined ? 'combined' : 'charging'}
            options={[
              { value: 'combined', label: 'Carteira + recargas' },
              { value: 'charging', label: 'Só recargas' },
            ]}
            onChange={(incomeMode) => setSim({ incomeMode })}
          />

          <div className={styles.hero} style={{ backgroundImage: `url(${IMAGES.greenCard})` }}>
            <div className={styles.heroValue}>
              <p className={styles.overline}>RECEBIMENTO ESTIMADO {view === 'month' ? `NO MÊS ${month}` : `NO ANO ${year}`}</p>
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

          <PeriodControl />

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
              <div className={styles.row}>
                <Img src={ICONS.userGreen} size={20} />
                <p className={styles.rowLabel}>
                  Carteira iGreen <small>{p.clients} clientes</small>
                </p>
                <p className={styles.rowValue}>{moneyCents(p.commissionNet)}</p>
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.bottom}>
          {result.feasible ? (
            <Flag icon={ICONS.alert}>Projeção estimada. O retorno varia conforme o movimento do eletroposto e não é garantido.</Flag>
          ) : (
            <Flag icon={ICONS.alert} tone="warning">
              Acima da capacidade estimada: reduza os carros por dia ou os kWh por carro.
            </Flag>
          )}
          {pendentes.length ? <p className={styles.pending}>Prévia {pendentes.join(' e ')}. Ajuste na aba Tributos.</p> : null}
        </div>
      </section>

      <Button className={styles.cta} onClick={onContinue}>
        Seguir para proposta
      </Button>
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
