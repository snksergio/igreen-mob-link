import { useState } from 'react'
import { ICONS } from '../assets'
import { CategorySelect } from '../components/investment/CategorySelect'
import { Highlight, Stack, StepPage } from '../components/layout/PageShell'
import { Button, FooterGroup } from '../components/ui/Button'
import { FancyIcon, QuantityStepper, YesNoToggle } from '../components/ui/Controls'
import { Img } from '../components/ui/Icon'
import {
  MAX_CARREGADORES,
  PERCENTUAL_FATURAMENTO_LIQUIDO,
  VALOR_REDE,
  aporteDe,
  carregador,
  type TipoCarregador,
} from '../data/investment'
import { cn } from '../lib/cn'
import { decimal, money, moneyCents } from '../lib/format'
import { focusFirstError } from '../lib/focusFirstError'
import { useCadastro } from '../state/cadastro'
import styles from './Steps.module.css'

export function Step2Modelo() {
  const { state, patch, go, simulation } = useCadastro()
  const { tipo, quantidade } = state.simulacao
  const { categoriaConfirmada, publicidade } = state.modelo
  const [showErrors, setShowErrors] = useState(false)
  const modelo = carregador(tipo)

  const selecionar = (novo: TipoCarregador) => {
    // Troca de modelo mantém o aporte o mais próximo possível do simulado
    const aporteAtual = aporteDe({ tipo, quantidade })
    const qtd = novo === tipo ? quantidade : Math.round(aporteAtual / carregador(novo).preco)
    patch('simulacao', { tipo: novo, quantidade: Math.min(MAX_CARREGADORES, Math.max(1, qtd)) })
    patch('modelo', { categoriaConfirmada: true })
    setShowErrors(false)
  }

  const submit = () => {
    if (!categoriaConfirmada) {
      setShowErrors(true)
      focusFirstError()
      return
    }
    go('step3')
  }

  const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

  return (
    <StepPage
      step={2}
      title={
        <>
          Dados do <Highlight>modelo do eletroposto</Highlight>
        </>
      }
      onSubmit={submit}
      footer={
        <FooterGroup>
          <Button type="submit">Prosseguir</Button>
        </FooterGroup>
      }
    >
      <Stack gap={28}>
        <Stack gap={18}>
          <div className={styles.labeled}>
            <p className={cn('t-label', styles.groupLabel, showErrors && !categoriaConfirmada && styles.labelError)}>CATEGORIA DE INVESTIMENTO</p>
            <CategorySelect
              value={tipo}
              collapsed={categoriaConfirmada}
              error={showErrors && !categoriaConfirmada ? 'Escolha um modelo' : null}
              onSelect={selecionar}
              onEdit={() => patch('modelo', { categoriaConfirmada: false })}
            />
            {showErrors && !categoriaConfirmada ? (
              <p className={cn('t-caption', styles.errorText)} role="alert">
                Escolha o modelo de carregador para continuar
              </p>
            ) : null}
          </div>

          <div className={cn(styles.reveal, categoriaConfirmada && styles.revealOpen)} aria-hidden={!categoriaConfirmada || undefined}>
            <div className={styles.revealInner}>
              <div className={styles.summaryCard}>
                <div className={cn(styles.flag, styles.flagPrimary)}>
                  <FancyIcon src={ICONS.dollarWhite} bg="var(--bg-primary)" multicolor />
                  <div className={styles.flagText}>
                    <p className={cn('t-overline', styles.flagOverlinePrimary)}>RESUMO DO INVESTIMENTO</p>
                    <p className={cn('t-body-lg-semibold', styles.flagValue)}>{money(simulation.aporte)}</p>
                  </div>
                </div>

                <div className={styles.quantityRow}>
                  <div className={styles.quantityText}>
                    <p className={cn('t-body-lg-semibold', styles.strong)}>Quantos carregadores?</p>
                    <p className={cn('t-caption', styles.mainText)}>
                      {modelo.nome} · {money(modelo.preco)} cada
                    </p>
                  </div>
                  <QuantityStepper
                    label="Quantidade de carregadores"
                    value={quantidade}
                    max={MAX_CARREGADORES}
                    onChange={(q) => patch('simulacao', { quantidade: q })}
                  />
                </div>

                <div className={cn('t-body-sm-medium', styles.summaryLines)}>
                  <p>
                    Valor a pagar: <b>{moneyCents(simulation.aporte)}</b> ({quantidade} × {money(modelo.preco)})
                  </p>
                  <p>
                    Potência instalada: <b>{quantidade * modelo.potenciaKw} kW</b> · {plural(quantidade * modelo.conectores, 'conector', 'conectores')} ·{' '}
                    {plural(quantidade * modelo.vagas, 'vaga', 'vagas')}
                  </p>
                  <p>
                    Percentual de faturamento líquido: <b>{PERCENTUAL_FATURAMENTO_LIQUIDO}%</b>
                  </p>
                  <p>
                    Participação: <b>{decimal(simulation.percentual, 2)}% da rede</b> (base {money(VALOR_REDE)})
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Stack>

        <div className={styles.labeled}>
          <p className={cn('t-label', styles.groupLabel)}>INFORMAÇÕES ADICIONAIS</p>
          <div className={styles.toggleCard}>
            <span className={styles.toggleIcon}>
              <Img src={ICONS.discountBadge} size={24} />
            </span>
            <div className={styles.toggleText}>
              <p className={cn('t-body-lg-semibold', styles.strong)}>Faturamento de publicidade</p>
              <p className={cn('t-body-xs-medium', styles.mutedText)}>
                Inclui cláusula no contrato concedendo participação sobre o faturamento de mídia/<wbr />publicidade do totem.
              </p>
            </div>
            <YesNoToggle label="Faturamento de publicidade" value={publicidade} onChange={(v) => patch('modelo', { publicidade: v })} />
          </div>
        </div>
      </Stack>
    </StepPage>
  )
}
