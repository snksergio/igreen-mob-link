import { useCallback, useState } from 'react'
import { ICONS } from '../../assets'
import { AddressSection } from '../../components/address/AddressSection'
import { Highlight, Stack } from '../../components/layout/PageShell'
import { Button, FooterGroup } from '../../components/ui/Button'
import { YesNoToggle } from '../../components/ui/Controls'
import { Icon } from '../../components/ui/Icon'
import { cn } from '../../lib/cn'
import { focusFirstError } from '../../lib/focusFirstError'
import { todayBr } from '../../lib/format'
import { isValidCep } from '../../lib/validators'
import type { Address } from '../../services/address'
import { GeradorStepPage } from '../components/Shell'
import { SimulationSummary } from '../components/SimulationSummary'
import { useGerador } from '../state'
import styles from './Steps.module.css'

/** Etapa 3: endereço do eletroposto (mapa) + faturamento de publicidade — adaptada do passo 3 atual */
export function Eletroposto() {
  const { state, patch, go } = useGerador()
  const { endereco, publicidade } = state.eletroposto
  const [showErrors, setShowErrors] = useState(false)
  const setEndereco = useCallback((value: Address) => patch('eletroposto', { endereco: value }), [patch])

  const hasAddress = Boolean(endereco.logradouro || endereco.cidade)
  const errors = {
    cep: endereco.cep && !isValidCep(endereco.cep) ? 'CEP incompleto' : undefined,
    endereco: !hasAddress ? 'Informe o CEP onde o eletroposto será instalado' : undefined,
    numero: !endereco.numero.trim() ? 'Informe o número' : undefined,
  }

  const submit = () => {
    if (Object.values(errors).some(Boolean)) {
      setShowErrors(true)
      focusFirstError()
      return
    }
    // Pré-preenche quem assina com os dados do investidor (etapa 4)
    const { assinatura: ass, investidor: inv } = state
    if (!ass.data && !ass.nome && !ass.documento) patch('assinatura', { data: todayBr(), nome: inv.nome, documento: inv.documento })
    go('resumo')
  }

  return (
    <GeradorStepPage
      step={3}
      title={
        <>
          Endereço do <Highlight>eletroposto</Highlight>
        </>
      }
      subtitle="Onde o eletroposto será instalado. Ajuste o ponto no mapa se precisar."
      onSubmit={submit}
      footer={
        <FooterGroup>
          <Button variant="secondary" onClick={() => go('dados')}>
            Voltar
          </Button>
          <Button type="submit">Prosseguir</Button>
        </FooterGroup>
      }
    >
      <Stack gap={40}>
        <SimulationSummary />
        <AddressSection
          value={endereco}
          onChange={setEndereco}
          withMap
          errors={showErrors ? errors : undefined}
          modal={{
            title: 'Endereço do eletroposto',
            subtitle: 'Edite de forma livre o endereço onde o eletroposto será instalado',
            icon: ICONS.light,
          }}
          cepSubtitle="Encontre o CEP pelo endereço onde o eletroposto será instalado"
        />

        <div className={styles.labeled}>
          <p className={cn('t-label', styles.groupLabel)}>INFORMAÇÕES ADICIONAIS</p>
          <div className={styles.toggleCard}>
            <span className={styles.toggleIcon}>
              <Icon src={ICONS.discountBadge} size={24} color="var(--fg-strong)" />
            </span>
            <div className={styles.toggleText}>
              <p className={cn('t-body-lg-semibold', styles.strong)}>Faturamento de publicidade</p>
              <p className={cn('t-body-xs-medium', styles.mutedText)}>
                Inclui cláusula no contrato concedendo participação sobre o faturamento de mídia/<wbr />publicidade do totem.
              </p>
            </div>
            <YesNoToggle label="Faturamento de publicidade" value={publicidade} onChange={(v) => patch('eletroposto', { publicidade: v })} />
          </div>
        </div>
      </Stack>
    </GeradorStepPage>
  )
}
