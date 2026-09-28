import { useState, type CSSProperties } from 'react'
import { useCountUp } from '../../lib/useCountUp'
import { ICONS, IMAGES } from '../../assets'
import { Highlight, Stack } from '../../components/layout/PageShell'
import { Button } from '../../components/ui/Button'
import { Checkbox, FancyIcon, Flag, SectionHeading, TextLink } from '../../components/ui/Controls'
import { Field, FieldRow } from '../../components/ui/Field'
import { Icon, Img } from '../../components/ui/Icon'
import { cn } from '../../lib/cn'
import { maskCnpj, maskCpf, maskDate, money, onlyDigits } from '../../lib/format'
import { focusFirstError } from '../../lib/focusFirstError'
import { isFullName, isValidCnpj, isValidCpf, isValidDate } from '../../lib/validators'
import { GeradorDetailModal } from '../components/GeradorDetailModal'
import { GeradorStepPage } from '../components/Shell'
import { compactMoney, paybackLabel } from '../format'
import type { ChargerId } from '../model'
import { createGeradorProposal } from '../proposal'
import { semInvestimento } from '../guided'
import { useGerador } from '../state'
import styles from './Steps.module.css'

const PASSOS = [
  { titulo: 'Proposta de contrato', texto: 'Geramos a sua proposta com os valores desta simulação.' },
  { titulo: 'Assinatura digital', texto: 'Você recebe o link para assinar, com um token enviado para o seu e-mail.' },
  { titulo: 'Pagamento do investimento', texto: 'Após a assinatura, enviamos as instruções de pagamento da sua parte do investimento.' },
  { titulo: 'Instalação e operação', texto: 'A iGreen instala, opera e faz a manutenção do eletroposto.' },
  { titulo: 'Recebimentos mensais', texto: 'Você acompanha as recargas e a carteira iGreen e recebe os resultados pela plataforma.' },
]

const POTENCIA: Record<ChargerId, string> = { lento: '7 KW', duo: '7 + 40 KW', ultra: '80 KW' }

export function Resumo() {
  const { state, patch, go, result, setProposta, version } = useGerador()
  const hideInvestment = semInvestimento(version)
  const { investidor: inv, eletroposto, assinatura: ass } = state
  const s = state.simulacao.inputs
  const combined = s.incomeMode === 'combined'
  const m1 = result.months[0]
  const recebimento = combined ? m1.totalInvestor : m1.investorRechargeCash
  const payback = combined ? result.payback : result.chargingPayback
  const solo = result.charger.investorShare === 1
  const local = eletroposto.endereco
  const pf = inv.tipo === 'pf'
  const [detailOpen, setDetailOpen] = useState(false)
  const [howOpen, setHowOpen] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)


  const docValid = pf ? isValidCpf(ass.documento) : isValidCnpj(ass.documento)
  const errors = {
    data: !isValidDate(ass.data) ? 'Informe a data de assinatura' : null,
    nome: !ass.nome.trim() ? 'Informe o nome para assinatura' : null,
    documento: !docValid ? `${pf ? 'CPF' : 'CNPJ'} inválido` : null,
    testemunhaNome: !isFullName(ass.testemunhaNome) ? 'Informe o nome completo' : null,
    testemunhaCpf: !isValidCpf(ass.testemunhaCpf)
      ? 'CPF inválido'
      : onlyDigits(ass.testemunhaCpf) === onlyDigits(ass.documento)
        ? 'A testemunha deve ser outra pessoa'
        : null,
    aceite: !ass.aceite ? 'Aceite os termos para gerar a proposta' : null,
  }
  const show = (e: string | null) => (showErrors ? e : null)

  const submit = async () => {
    if (Object.values(errors).some(Boolean)) {
      setShowErrors(true)
      focusFirstError()
      return
    }
    setSubmitting(true)
    try {
      setProposta(await createGeradorProposal(state))
      go('proposta')
    } finally {
      setSubmitting(false)
    }
  }


  return (
    <GeradorStepPage
      step={4}
      title={
        <>
          Você está a um <Highlight>passo de investir</Highlight>
        </>
      }
      subtitle="Revise a simulação e os dados. Nenhuma cobrança ou contrato acontece nesta etapa."
      onSubmit={submit}
      footer={
        <div className={cn(styles.footerStack, styles.afterBanner)} style={delay(1.6)}>
          <Button type="submit" loading={submitting}>
            Gerar Proposta de Contrato
          </Button>
          <TextLink tone="primary" onClick={() => go('simulador')}>
            Ajustar a simulação
          </TextLink>
        </div>
      }
    >
      <Stack gap={40}>
        {/* ---------- Investimento + cards ---------- */}
        <Stack gap={28}>
          <div className={styles.investBlock}>
            <button type="button" className={styles.investDrawer} onClick={() => setDetailOpen(true)}>
              <span className={cn('t-body-md-semibold', styles.underline)}>Ver detalhamento completo</span>
              <Icon src={ICONS.chevronDown} size={18} color="var(--fg-primary)" className={styles.drawerChevron} />
            </button>
            {/* Entrada: card → chips → valor contando → bateria flutuando; o resto da página vem depois */}
            <div className={cn(styles.investCard, styles.bannerIn)} style={{ backgroundImage: `url(${IMAGES.greenCard})` }}>
              <div className={styles.investChips}>
                <span className={cn(styles.investChip, styles.popIn)} style={delay(0.35)}>
                  {result.charger.name.toUpperCase()} · {POTENCIA[s.charger]}
                </span>
                <span className={styles.popIn} style={delay(0.45)}>
                  <Img src={ICONS.plusCircle} size={16} />
                </span>
                <span className={cn(styles.investChip, styles.popIn)} style={delay(0.55)}>
                  {solo ? '100% SEU' : `SOCIEDADE ${result.charger.investorShare * 100}/${result.charger.igreenShare * 100}`}
                </span>
              </div>
              <div className={styles.investBottom}>
                <div className={styles.investValue}>
                  <AnimatedMoney value={hideInvestment ? recebimento : result.capital.investor} className={cn(styles.investAmount, styles.riseIn)} style={delay(0.45)} />
                  <p className={cn(styles.investOverline, styles.riseIn)} style={delay(0.6)}>
                    {hideInvestment ? 'RECEBIMENTO ESTIMADO NO MÊS 1' : 'VALOR DO SEU INVESTIMENTO'}
                  </p>
                </div>
                <span className={cn(styles.investFlag, styles.riseIn)} style={delay(0.75)}>
                  {hideInvestment ? (
                    <>
                      Retorno em <b>{paybackLabel(payback)}</b> · {combined ? 'carteira + recargas' : 'só recargas'}
                    </>
                  ) : (
                    <>
                      <b>{compactMoney(recebimento)}/mês</b> estimado · retorno em {paybackLabel(payback)}
                    </>
                  )}
                </span>
              </div>
            </div>
            <div className={styles.investBattery} aria-hidden>
              <img src={IMAGES.battery} alt="" />
            </div>
          </div>

          <Stack gap={12} className={styles.afterBanner} style={delay(1.15)}>
            <div className={styles.summaryCard}>
              <div className={cn(styles.flag, styles.flagPrimary)}>
                <FancyIcon src={ICONS.userWhite} bg="var(--bg-primary)" multicolor />
                <div className={styles.flagText}>
                  <p className={cn('t-overline', styles.flagOverlinePrimary)}>INVESTIDOR RESPONSÁVEL</p>
                  <p className={styles.flagName}>{inv.nome || '—'}</p>
                </div>
              </div>
              <div className={styles.summaryRow}>
                <div className={styles.summaryInfo}>
                  <p className={cn('t-body-lg-semibold', styles.strong)}>{inv.documento}</p>
                  <div className={cn('t-body-sm-medium', styles.summaryLines)}>
                    <p>Whatsapp: {inv.whatsapp}</p>
                    <p>Email: {inv.email}</p>
                  </div>
                </div>
                <TextLink tone="primary" onClick={() => go('dados')}>
                  Editar
                </TextLink>
              </div>
            </div>

            <div className={styles.summaryCard}>
              <div className={cn(styles.flag, styles.flagMuted)}>
                <FancyIcon src={ICONS.fuelWhite} bg="var(--bg-fill)" multicolor />
                <div className={styles.flagText}>
                  <p className={cn('t-overline', styles.flagOverlineMuted)}>LOCAL ELETRO POSTO</p>
                  <p className={cn('t-body-lg-semibold', styles.strong)}>
                    {local.cidade} - {local.uf}
                  </p>
                </div>
              </div>
              <div className={styles.summaryRow}>
                <div className={styles.summaryInfo}>
                  <p className={cn('t-body-lg-semibold', styles.strong)}>{local.logradouro}</p>
                  <div className={cn('t-body-sm-medium', styles.summaryLines)}>
                    <p>{local.bairro}</p>
                    <p>
                      Número {local.numero}
                      {local.complemento ? `, ${local.complemento}` : ''} - {local.cep}
                    </p>
                  </div>
                </div>
                <TextLink tone="primary" onClick={() => go('eletroposto')}>
                  Editar
                </TextLink>
              </div>
            </div>
          </Stack>
        </Stack>

        {/* ---------- Assinatura e testemunha ---------- */}
        <Stack gap={28} className={styles.afterBanner} style={delay(1.3)}>
          <SectionHeading title="Assinatura e Testemunha" subtitle="Dados de quem assina o contrato e da testemunha" />
          <Stack gap={18}>
            <Field
              label="DATA DE ASSINATURA"
              value={ass.data}
              onChange={(data) => patch('assinatura', { data })}
              mask={maskDate}
              placeholder="00/00/0000"
              inputMode="numeric"
              icon={ICONS.calendar}
              valid={!errors.data}
              error={show(errors.data)}
            />
            <FieldRow stackOnMobile>
              <Field
                width={276}
                label="NOME PARA ASSINATURA"
                value={ass.nome}
                onChange={(nome) => patch('assinatura', { nome })}
                placeholder="Ex.: João da Silva Pereira"
                valid={!errors.nome}
                error={show(errors.nome)}
              />
              <Field
                label={pf ? 'CPF PARA ASSINATURA' : 'CNPJ PARA ASSINATURA'}
                value={ass.documento}
                onChange={(documento) => patch('assinatura', { documento })}
                mask={pf ? maskCpf : maskCnpj}
                placeholder={pf ? '000.000.000-00' : '00.000.000/0000-00'}
                inputMode="numeric"
                valid={!errors.documento}
                error={show(errors.documento)}
              />
            </FieldRow>
            <FieldRow stackOnMobile>
              <Field
                width={276}
                label="NOME DA TESTEMUNHA"
                value={ass.testemunhaNome}
                onChange={(testemunhaNome) => patch('assinatura', { testemunhaNome })}
                placeholder="Ex.: João da Silva Pereira"
                valid={!errors.testemunhaNome}
                error={show(errors.testemunhaNome)}
              />
              <Field
                label="CPF DA TESTEMUNHA"
                value={ass.testemunhaCpf}
                onChange={(testemunhaCpf) => patch('assinatura', { testemunhaCpf })}
                mask={maskCpf}
                placeholder="000.000.000-00"
                inputMode="numeric"
                valid={!errors.testemunhaCpf}
                error={show(errors.testemunhaCpf)}
              />
            </FieldRow>
          </Stack>
        </Stack>

        {/* ---------- Como funciona + avisos + aceite ---------- */}
        <Stack gap={18} className={styles.afterBanner} style={delay(1.45)}>
          <div className={cn(styles.accordion, howOpen && styles.accordionOpen)}>
            <button type="button" className={styles.accordionHeader} aria-expanded={howOpen} onClick={() => setHowOpen((v) => !v)}>
              <FancyIcon src={ICONS.help} bg="var(--bg-primary)" multicolor />
              <span className={styles.accordionText}>
                <span className={cn('t-body-lg-semibold', styles.strong)}>Como funciona daqui para frente?</span>
                <span className={cn('t-body-sm-medium', styles.mainText)}>Clique para conhecer mais sobre o processo e tire suas dúvidas</span>
              </span>
              <Icon src={ICONS.chevronDown} size={18} className={styles.accordionChevron} />
            </button>
            <div className={styles.accordionPanel} hidden={!howOpen}>
              {/* Timeline: o passo atual (1) em destaque, os próximos em sequência */}
              <ol className={styles.timeline}>
                {PASSOS.map((passo, i) => (
                  <li key={passo.titulo} className={cn(styles.tlItem, i === 0 && styles.tlCurrent)} style={{ '--i': i } as CSSProperties}>
                    <span className={styles.tlDot} aria-hidden>
                      {i + 1}
                    </span>
                    <div className={styles.tlContent}>
                      <p className={cn('t-body-md-semibold', styles.strong)}>
                        {passo.titulo}
                        {i === 0 ? <span className={cn('t-label', styles.tlBadge)}>PRÓXIMO PASSO</span> : null}
                      </p>
                      <p className={cn('t-body-sm-medium', styles.mainText)}>{passo.texto}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <Flag icon={ICONS.alert} tone="warning">
            Fique tranquilo, nenhuma cobrança ou contrato será feito agora. O início é válido apenas quando assinar o contrato.
          </Flag>

          <div className={cn(showErrors && errors.aceite && styles.checkError)} data-invalid={showErrors && errors.aceite ? 'true' : undefined} tabIndex={-1}>
            <Checkbox id="aceite" checked={ass.aceite} onChange={(aceite) => patch('assinatura', { aceite })}>
              Li e concordo com o{' '}
              <a href="#memorando" className={styles.noWrap} onClick={(e) => e.preventDefault()}>
                Memorando de Entendimento
              </a>{' '}
              e com os{' '}
              <a href="#termos" className={styles.noWrap} onClick={(e) => e.preventDefault()}>
                Termos de Uso
              </a>
              . Entendo que o retorno acompanha o faturamento do eletroposto e não é rendimento garantido.
            </Checkbox>
            {showErrors && errors.aceite ? <p className={cn('t-caption', styles.errorText)}>{errors.aceite}</p> : null}
          </div>
        </Stack>
      </Stack>

      <GeradorDetailModal open={detailOpen} onClose={() => setDetailOpen(false)} />
    </GeradorStepPage>
  )
}

const delay = (seconds: number) => ({ '--d': `${seconds}s` }) as CSSProperties

/** Valor do aporte contando até o total (isolado para não re-renderizar a página inteira) */
function AnimatedMoney({ value, className, style }: { value: number; className?: string; style?: CSSProperties }) {
  const p = useCountUp(900, 450)
  return (
    <p className={className} style={style} aria-label={money(value)}>
      {money(value * p)}
    </p>
  )
}
