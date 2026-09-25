import { useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { ICONS } from '../assets'
import { HeaderController, PageHeader } from '../components/layout/PageShell'
import { DistributionRows, ProjectionDisclaimer, ProjectionHero, ProjectionStats, RevenueBreakdown } from '../components/projection/Projection'
import { Button, FooterGroup } from '../components/ui/Button'
import { SegmentedTabs, Slider } from '../components/ui/Controls'
import { Field, FieldRow } from '../components/ui/Field'
import { Icon, Img } from '../components/ui/Icon'
import { NumberField } from '../components/ui/NumberField'
import { SelectField } from '../components/ui/SelectField'
import { APORTES, PREMISSAS, aporteDe, modeloLabel, type Investimento } from '../data/investment'
import { cn } from '../lib/cn'
import { decimal, maskCpf, maskMoneyInput, money, moneyCents, onlyDigits, parseLocaleNumber } from '../lib/format'
import { fromRecargas } from '../lib/simulation'
import { useMediaQuery } from '../lib/useMediaQuery'
import { isValidCpf } from '../lib/validators'
import { useCadastro } from '../state/cadastro'
import styles from './Simulador.module.css'

const MODOS = [
  { value: 'energia' as const, label: 'Por energia (kWh)', icon: ICONS.user },
  { value: 'recarga' as const, label: 'Por recarga', icon: ICONS.building },
]

const keyOf = (i: Investimento) => `${i.tipo}-${i.quantidade}`
const premissasTexto = [
  `${PREMISSAS.vagas} vagas de ${PREMISSAS.potenciaKw} kW`,
  `custo de energia ${moneyCents(PREMISSAS.custoEnergiaKwh)}/kWh`,
  `impostos ${PREMISSAS.impostos * 100}% do faturamento`,
  `taxa de administração ${PREMISSAS.taxaAdministracao * 100}%`,
  `manutenção ${money(PREMISSAS.manutencaoMensal)}/mês`,
  `contrato de ${PREMISSAS.contratoAnos} anos`,
  'distribuição proporcional ao aporte.',
].join(' · ')

/** Troca de layout com View Transitions quando o navegador suporta */
function withTransition(update: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown }
  if (doc.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    doc.startViewTransition(() => flushSync(update))
  } else update()
}

export function Simulador() {
  const { state, patch, simulation, go } = useCadastro()
  const sim = state.simulacao
  const [cpfError, setCpfError] = useState<string | null>(null)
  const aporteRef = useRef<HTMLDivElement>(null)
  const cpfValid = isValidCpf(sim.cpf)
  // Em telas estreitas a projeção aparece embaixo dos campos (antes do botão)
  const stacked = useMediaQuery('(max-width: 999px)')

  const liberar = () => {
    if (!cpfValid) {
      setCpfError(onlyDigits(sim.cpf).length < 11 ? 'Digite os 11 números do seu CPF' : 'CPF inválido. Confira os números digitados.')
      return
    }
    withTransition(() => patch('simulacao', { liberada: true }))
    requestAnimationFrame(() => aporteRef.current?.querySelector('button')?.focus({ preventScroll: true }))
  }

  const investir = () => {
    const inv = state.investidor
    if (inv.tipo === 'pf' || !inv.documento) patch('investidor', { tipo: 'pf', documento: sim.cpf })
    go('step1')
  }

  // Aportes pré-definidos (o investimento vindo do passo 2 entra na lista se não fizer parte dela)
  const atual: Investimento = { tipo: sim.tipo, quantidade: sim.quantidade }
  const aportes = (APORTES.some((a) => keyOf(a) === keyOf(atual)) ? APORTES : [...APORTES, atual]).toSorted(
    (a, b) => aporteDe(a) - aporteDe(b),
  )
  const aporteIndex = aportes.findIndex((a) => keyOf(a) === keyOf(atual))
  const setInvestimento = (i: Investimento | undefined) => i && patch('simulacao', { tipo: i.tipo, quantidade: i.quantidade })
  const aporteOptions = aportes.map((a) => ({
    value: keyOf(a),
    label: (
      <>
        {money(aporteDe(a))}
        <span className={styles.suffixDot}>{'  ·  '}</span>
        <span className={styles.suffixMuted}>({modeloLabel(a.tipo)})</span>
      </>
    ),
  }))

  const panel = sim.liberada ? (
    <aside className={styles.panel} aria-label="Resultado da simulação">
      <section className={styles.panelTop}>
        <ProjectionHero simulation={simulation} />
        <ProjectionStats simulation={simulation} />
      </section>
      <section className={styles.panelMiddle}>
        <RevenueBreakdown simulation={simulation} />
        <DistributionRows simulation={simulation} />
      </section>
      <section className={styles.panelBottom}>
        <ProjectionDisclaimer />
      </section>
    </aside>
  ) : null

  return (
    <main className={cn(styles.page, sim.liberada && styles.revealed)}>
      <div className={styles.layout}>
        <div className={styles.column}>
          <HeaderController />
          <form
            className={styles.form}
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              if (sim.liberada) investir()
              else liberar()
            }}
          >
            <PageHeader
              badge="SIMULAÇÃO"
              title="Simule quanto o seu aporte pode render"
              subtitle="Sem contrato e sem compromisso. O CPF guarda a sua simulação e permite que o licenciado retome com você depois."
            />

            <div className={styles.container}>
              {!sim.liberada ? (
                <div className={styles.body}>
                  <Field
                    label="CPF"
                    value={sim.cpf}
                    onChange={(cpf) => {
                      setCpfError(null)
                      patch('simulacao', { cpf })
                    }}
                    mask={maskCpf}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    autoComplete="off"
                    icon={ICONS.id}
                    valid={cpfValid}
                    error={cpfError}
                    autoFocus
                  />

                  <div className={styles.preview}>
                    <p className={cn('t-body-lg-semibold', styles.previewTitle)}>O que você vai ver na simulação</p>
                    <PreviewItem icon={<Img src={ICONS.dollarCircle} size={18} />}>
                      Retorno mensal projetado para o aporte que você escolher
                    </PreviewItem>
                    <PreviewItem icon={<Icon src={ICONS.id} size={18} color="var(--fg-main)" />}>
                      A conta completa do eletroposto: faturamento, custos, impostos e o que sobra
                    </PreviewItem>
                    <PreviewItem icon={<Icon src={ICONS.calendar} size={18} color="var(--fg-main)" />}>
                      Projeção no ano e ao longo dos 5 anos de contrato
                    </PreviewItem>
                  </div>

                  <div className={styles.note}>
                    <Img src={ICONS.dot} size={8} className={styles.noteDot} />
                    <p className="t-body-md-medium">
                      O CPF identifica a sua simulação e permite retomá-la depois. Nesta etapa nada é contratado e nenhuma proposta é gerada.
                    </p>
                  </div>
                </div>
              ) : (
                <div className={cn(styles.body, styles.bodyResult)}>
                  <div className={styles.blocoAporte}>
                    <Field
                      label="CPF"
                      value={sim.cpf}
                      onChange={(cpf) => patch('simulacao', { cpf })}
                      mask={maskCpf}
                      inputMode="numeric"
                      icon={ICONS.id}
                      valid={cpfValid}
                      error={!cpfValid && onlyDigits(sim.cpf).length === 11 ? 'CPF inválido' : null}
                    />
                    <div className={styles.aporte}>
                      <div ref={aporteRef}>
                        <SelectField
                          label="APORTE"
                          value={keyOf(atual)}
                          options={aporteOptions}
                          onChange={(v) => setInvestimento(aportes.find((a) => keyOf(a) === v))}
                        />
                      </div>
                      <Slider
                        label="Valor do aporte"
                        min={0}
                        max={aportes.length - 1}
                        value={aporteIndex}
                        onChange={(i) => setInvestimento(aportes[i])}
                        valueText={`${money(simulation.aporte)} (${modeloLabel(sim.tipo)})`}
                      />
                    </div>
                  </div>

                  <div className={styles.blocoModo}>
                    <div className={styles.modoHeader}>
                      <p className={cn('t-label', styles.overlineLabel)}>COMO ESTIMAR O MOVIMENTO</p>
                      <SegmentedTabs label="Como estimar o movimento" value={sim.modo} options={MODOS} onChange={(modo) => patch('simulacao', { modo })} />
                    </div>

                    {sim.modo === 'energia' ? (
                      <FieldRow>
                        <NumberField
                          label="GRAU DE OCUPAÇÃO"
                          value={sim.ocupacao}
                          format={(v) => `${decimal(v, v % 1 ? 1 : 0)}%`}
                          editFormat={(v) => decimal(v, v % 1 ? 1 : 0)}
                          parse={parseLocaleNumber}
                          mask={(t) => t.replace(/[^\d,]/g, '').slice(0, 5)}
                          onChange={(ocupacao) => patch('simulacao', { ocupacao })}
                          min={1}
                          max={100}
                          inputMode="decimal"
                        />
                        <NumberField
                          label="PREÇO POR kWh"
                          value={sim.precoKwh}
                          format={moneyCents}
                          parse={parseLocaleNumber}
                          mask={(t) => (onlyDigits(t) ? `R$ ${maskMoneyInput(t.slice(0, 12))}` : '')}
                          onChange={(precoKwh) => patch('simulacao', { precoKwh })}
                          min={0.01}
                          max={50}
                          inputMode="numeric"
                        />
                      </FieldRow>
                    ) : (
                      <FieldRow>
                        <NumberField
                          label="RECARGAS POR VAGA/DIA"
                          value={simulation.recargasPorVagaDia}
                          format={(v) => decimal(v, 1)}
                          parse={parseLocaleNumber}
                          mask={(t) => t.replace(/[^\d,]/g, '').slice(0, 5)}
                          onChange={(r) => patch('simulacao', fromRecargas(r, simulation.ticketMedio))}
                          min={0.1}
                          max={48}
                          inputMode="decimal"
                        />
                        <NumberField
                          label="TICKET MÉDIO"
                          value={simulation.ticketMedio}
                          format={moneyCents}
                          parse={parseLocaleNumber}
                          mask={(t) => (onlyDigits(t) ? `R$ ${maskMoneyInput(t.slice(0, 12))}` : '')}
                          onChange={(t) => patch('simulacao', fromRecargas(simulation.recargasPorVagaDia, t))}
                          min={1}
                          max={1000}
                          inputMode="numeric"
                        />
                      </FieldRow>
                    )}

                    <p className={cn('t-body-sm-medium', styles.modoHelper)}>
                      {sim.modo === 'energia'
                        ? `Equivale a ${decimal(simulation.recargasPorVagaDia)} recargas por vaga ao dia e ticket médio de ${money(simulation.ticketMedio)}.`
                        : `Equivale a ${decimal(sim.ocupacao, sim.ocupacao % 1 ? 1 : 0)}% de ocupação e ${moneyCents(sim.precoKwh)} por kWh.`}{' '}
                      Trocar o modo converte os valores e mantém a mesma projeção.
                    </p>
                  </div>

                  <div className={styles.premissas}>
                    <p className={cn('t-label', styles.overlineLabel)}>PREMISSAS DO ELETROPOSTO</p>
                    <p className="t-body-sm-medium">{premissasTexto}</p>
                  </div>
                </div>
              )}

              {stacked ? panel : null}

              <FooterGroup>
                <Button type="submit">{sim.liberada ? 'Quero investir com estes valores' : 'Liberar simulação'}</Button>
              </FooterGroup>
            </div>
          </form>
        </div>

        {stacked ? null : panel}
      </div>
    </main>
  )
}

function PreviewItem({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.previewItem}>
      <span className={styles.previewIcon}>{icon}</span>
      <p className={cn('t-body-md-medium', styles.previewText)}>{children}</p>
    </div>
  )
}
