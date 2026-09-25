import { useCallback, useState } from 'react'
import { ICONS } from '../assets'
import { AddressSection } from '../components/address/AddressSection'
import { Highlight, StepPage } from '../components/layout/PageShell'
import { Button, FooterGroup } from '../components/ui/Button'
import { focusFirstError } from '../lib/focusFirstError'
import { todayBr } from '../lib/format'
import { isValidCep } from '../lib/validators'
import type { Address } from '../services/address'
import { useCadastro } from '../state/cadastro'

export function Step3Endereco() {
  const { state, patch, go } = useCadastro()
  const endereco = state.eletroposto.endereco
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
    // Pré-preenche quem assina com os dados do investidor (passo 4)
    const { assinatura: ass, investidor: inv } = state
    if (!ass.data && !ass.nome && !ass.documento) patch('assinatura', { data: todayBr(), nome: inv.nome, documento: inv.documento })
    go('step4')
  }

  return (
    <StepPage
      step={3}
      title={
        <>
          Endereço do <Highlight>eletroposto</Highlight>
        </>
      }
      onSubmit={submit}
      footer={
        <FooterGroup>
          <Button type="submit">Prosseguir</Button>
        </FooterGroup>
      }
    >
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
    </StepPage>
  )
}
