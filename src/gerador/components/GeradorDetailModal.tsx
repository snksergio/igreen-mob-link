import { useId, useState } from 'react'
import { ICONS, IMAGES } from '../../assets'
import { DialogHeader, Modal } from '../../components/ui/Modal'
import { Img } from '../../components/ui/Icon'
import { money, moneyCents, moneyParts } from '../../lib/format'
import { compactMoney, paybackLabel, pct } from '../format'
import { POTENCIA, ocultaCapital, totaisRecebidos } from '../guided'
import { useGerador } from '../state'
import { DreTable } from './DreTable'
import { MonthTable } from './MonthTable'
import { PeriodControl } from './PeriodControl'
import { Premissas } from './Premissas'
import { ReturnChart } from './ReturnChart'
import { TabBar, TabPanel } from './Segmented'
import styles from './Detail.module.css'

export type ResumoItem = { label: string; value: string }

type Aba = 'proposta' | 'retorno' | 'dre' | 'mes' | 'premissas'

/**
 * Detalhamento da simulação: card verde no padrão do card da bateria (recebimento do mês 1, modelo,
 * sociedade, investimento e retorno) e, abaixo, abas com o gráfico de retorno, o DRE, o mês a mês e as premissas.
 * Com `resumo` (proposta final), a primeira aba mostra os dados da proposta.
 * O cabeçalho fica fixo e o conteúdo rola dentro do modal.
 */
export function GeradorDetailModal({
  open,
  onClose,
  title = 'Detalhamento da simulação',
  subtitle = 'Resultado estimado com as premissas que você escolheu',
  resumo,
}: {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  resumo?: ResumoItem[]
}) {
  const { state, result, scenario, version } = useGerador()
  const hideCapital = ocultaCapital(version)
  const s = state.simulacao.inputs
  const { view, month, year } = state.simulacao
  const combined = s.incomeMode === 'combined'
  const m1 = result.months[0]
  const receipt = combined ? m1.totalInvestor : m1.investorRechargeCash
  const payback = combined ? result.payback : result.chargingPayback
  const net36 = combined ? result.net36 : result.months[35].chargingNetAccumulated
  const { int, cents } = moneyParts(receipt)
  const solo = result.charger.investorShare === 1
  const totais = totaisRecebidos(result, combined)
  // v2: só recebidos (sem retorno, saldo descontando o investimento nem ROI)
  const stats = hideCapital
    ? [
        { icon: ICONS.handMoney, label: 'RECEBIDO NO ANO 1', value: compactMoney(totais.ano1) },
        { icon: ICONS.moneyBag, label: 'RECEBIDO EM 36 MESES', value: compactMoney(totais.total36) },
        { icon: ICONS.moneyBag, label: 'MÉDIA POR MÊS', value: compactMoney(totais.mediaMes) },
      ]
    : [
        { icon: ICONS.handMoney, label: 'RETORNO', value: paybackLabel(payback) },
        { icon: ICONS.moneyBag, label: 'SALDO EM 36 MESES', value: compactMoney(net36) },
        { icon: ICONS.moneyBag, label: 'ROI EM 36 MESES', value: pct((net36 / result.investment) * 100, 0) },
      ]

  const abas: { value: Aba; label: string }[] = [
    ...(resumo?.length ? [{ value: 'proposta' as const, label: 'Proposta' }] : []),
    { value: 'retorno', label: hideCapital ? 'Acumulado' : 'Retorno' },
    { value: 'dre', label: 'DRE' },
    { value: 'mes', label: 'Mês a mês' },
    { value: 'premissas', label: 'Premissas' },
  ]
  const [aba, setAba] = useState<Aba>(abas[0].value)
  const id = useId()

  return (
    <Modal open={open} onClose={onClose} label={title} width={880} padding="flush">
      <div className={styles.shell}>
        <div className={styles.head}>
          <DialogHeader title={title} subtitle={subtitle} />
        </div>

        <div className={styles.scroll}>
          {/* Card verde no padrão do card da bateria (resumo) */}
          <section className={styles.hero} style={{ backgroundImage: `url(${IMAGES.greenCard})` }} aria-label="Resultado estimado">
            <div className={styles.heroChips}>
              <span className={styles.heroChip}>
                {result.charger.name} · {POTENCIA[s.charger]}
              </span>
              <Img src={ICONS.plusCircle} size={16} />
              <span className={styles.heroChip}>{solo ? '100% seu' : `Sociedade ${result.charger.investorShare * 100}/${result.charger.igreenShare * 100}`}</span>
            </div>
            <div className={styles.heroBottom}>
              <div className={styles.heroValue}>
                <p className={styles.heroAmount} aria-label={moneyCents(receipt)}>
                  R$ {int}
                  <span>,{cents}</span>
                </p>
                <p className={styles.heroOverline}>RECEBIMENTO ESTIMADO NO MÊS 1 · {combined ? 'CARTEIRA + RECARGAS' : 'SÓ RECARGAS'}</p>
              </div>
              <span className={styles.heroFlag}>
                {hideCapital ? (
                  <>
                    <b>{compactMoney(totais.total36)}</b> recebidos em 36 meses
                  </>
                ) : (
                  <>
                    Investimento <b>{money(result.capital.investor)}</b> · retorno em <b>{paybackLabel(payback)}</b>
                  </>
                )}
              </span>
            </div>
            <div className={styles.heroBattery} aria-hidden>
              <img src={IMAGES.battery} alt="" />
            </div>
          </section>

          <div className={styles.stats}>
            {stats.map((st) => (
              <div key={st.label} className={styles.stat}>
                <span className={styles.statIcon}>
                  <Img src={st.icon} size={22} />
                </span>
                <div>
                  <p className={styles.statLabel}>{st.label}</p>
                  <p className={styles.statValue}>{st.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.tabsBar}>
            <TabBar label="Seções do detalhamento" value={aba} options={abas} onChange={setAba} idBase={id} />
          </div>

          <TabPanel idBase={id} value={aba}>
            {aba === 'proposta' && resumo ? (
              <dl className={styles.facts}>
                {resumo.map((item) => (
                  <div key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {aba === 'retorno' ? <ReturnChart result={result} mode={s.incomeMode} embedded recebido={hideCapital} /> : null}
            {aba === 'dre' ? (
              <DreTable
                period={scenario.period}
                inputs={s}
                charger={result.charger}
                periodLabel={view === 'month' ? `Mês ${month}` : `Ano ${year}`}
                combined={combined}
                embedded
                headerAside={<PeriodControl />}
              />
            ) : null}
            {aba === 'mes' ? <MonthTable months={result.months} embedded recebido={hideCapital} /> : null}
            {aba === 'premissas' ? <Premissas /> : null}
          </TabPanel>
        </div>
      </div>
    </Modal>
  )
}
