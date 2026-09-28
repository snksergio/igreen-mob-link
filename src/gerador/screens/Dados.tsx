import { useCallback, useEffect, useRef, useState } from 'react'
import { ICONS } from '../../assets'
import { AddressSection, type AddressErrors } from '../../components/address/AddressSection'
import { Highlight, Stack } from '../../components/layout/PageShell'
import { Button, FooterGroup } from '../../components/ui/Button'
import { SectionHeading, SegmentedTabs } from '../../components/ui/Controls'
import { Field, FieldRow } from '../../components/ui/Field'
import { cn } from '../../lib/cn'
import { maskCnpj, maskCpf, maskDate, maskPhone } from '../../lib/format'
import { focusFirstError } from '../../lib/focusFirstError'
import { isFullName, isValidCep, isValidCnpj, isValidCpf, isValidDate, isValidEmail, isValidPhone } from '../../lib/validators'
import type { Address } from '../../services/address'
import { AUTO_ENDERECO_POR_DOCUMENTO, fetchAddressByDocument } from '../../services/document'
import { GeradorStepPage } from '../components/Shell'
import { SimulationAside, SimulationSummary } from '../components/SimulationSummary'
import { isAdult } from '../rules'
import { useGerador } from '../state'
import styles from './Steps.module.css'

const TIPOS = [
  { value: 'pf' as const, label: 'Pessoa Física', icon: ICONS.user },
  { value: 'pj' as const, label: 'Pessoa Jurídica', icon: ICONS.building },
]

export function Dados() {
  const { state, patch, go } = useGerador()
  const inv = state.investidor
  const pf = inv.tipo === 'pf'
  const [showErrors, setShowErrors] = useState(false)
  const [lookingUp, setLookingUp] = useState(false)
  const lastLookup = useRef<string | null>(null)
  const enderecoRef = useRef(inv.endereco)
  useEffect(() => {
    enderecoRef.current = inv.endereco
  })

  const docValid = pf ? isValidCpf(inv.documento) : isValidCnpj(inv.documento)
  const hasAddress = Boolean(inv.endereco.logradouro || inv.endereco.cidade)

  // Assim que o CPF/CNPJ é válido, o endereço vem preenchido
  useEffect(() => {
    if (!AUTO_ENDERECO_POR_DOCUMENTO || !docValid || hasAddress || lastLookup.current === inv.documento) return
    lastLookup.current = inv.documento
    const controller = new AbortController()
    setLookingUp(true)
    fetchAddressByDocument(inv.documento, controller.signal)
      .then((address) => {
        const { numero, complemento } = enderecoRef.current
        if (address) patch('investidor', { endereco: { ...address, numero, complemento } })
      })
      .catch(() => {
        /* sem endereço: o usuário informa o CEP */
      })
      .finally(() => {
        if (!controller.signal.aborted) setLookingUp(false)
      })
    return () => {
      controller.abort()
      setLookingUp(false)
      lastLookup.current = null
    }
  }, [docValid, hasAddress, inv.documento, patch])

  const setEndereco = useCallback((endereco: Address) => patch('investidor', { endereco }), [patch])

  const errors = {
    documento: !inv.documento ? `Informe o ${pf ? 'CPF' : 'CNPJ'}` : !docValid ? `${pf ? 'CPF' : 'CNPJ'} inválido` : null,
    nome: pf ? (!isFullName(inv.nome) ? 'Informe nome e sobrenome' : null) : !inv.nome.trim() ? 'Informe a razão social' : null,
    nascimento: !isValidDate(inv.nascimento, { past: true })
      ? 'Data inválida'
      : pf && !isAdult(inv.nascimento)
        ? 'É preciso ter 18 anos ou mais'
        : null,
    email: !isValidEmail(inv.email) ? 'Informe um e-mail válido' : null,
    whatsapp: !isValidPhone(inv.whatsapp) ? 'Informe um WhatsApp com DDD' : null,
  }
  const addressErrors: AddressErrors = {
    cep: inv.endereco.cep && !isValidCep(inv.endereco.cep) ? 'CEP incompleto' : undefined,
    endereco: !hasAddress ? 'Informe o CEP do endereço' : undefined,
    numero: !inv.endereco.numero.trim() ? 'Informe o número' : undefined,
  }
  const valid = !Object.values(errors).some(Boolean) && !Object.values(addressErrors).some(Boolean)
  const show = <T,>(e: T) => (showErrors ? e : undefined)

  const submit = () => {
    if (!valid) {
      setShowErrors(true)
      focusFirstError()
      return
    }
    go('eletroposto')
  }

  return (
    <GeradorStepPage
      step={2}
      aside={<SimulationAside />}
      title={
        <>
          Informe os <Highlight>seus dados</Highlight>
        </>
      }
      subtitle="Simples, fácil e seguro. Seus dados entram na proposta junto com a sua simulação."
      onSubmit={submit}
      footer={
        <FooterGroup>
          <Button type="submit">Prosseguir</Button>
        </FooterGroup>
      }
    >
      <Stack gap={40}>
        <SimulationSummary mobileOnly />
        <Stack gap={28}>
          <div className={styles.labeled}>
            <p className={cn('t-label', styles.groupLabel)}>TIPO DE PESSOA</p>
            <SegmentedTabs
              label="Tipo de pessoa"
              value={inv.tipo}
              options={TIPOS}
              onChange={(tipo) => {
                if (tipo === inv.tipo) return
                patch('investidor', { tipo, documento: '' })
              }}
            />
          </div>

          <Stack gap={18}>
            <Field
              label={pf ? 'CPF' : 'CNPJ'}
              value={inv.documento}
              onChange={(documento) => patch('investidor', { documento })}
              mask={pf ? maskCpf : maskCnpj}
              placeholder={pf ? '000.000.000-00' : '00.000.000/0000-00'}
              inputMode="numeric"
              icon={ICONS.id}
              valid={docValid}
              error={show(errors.documento) ?? (inv.documento.length >= (pf ? 14 : 18) && !docValid ? errors.documento : null)}
            />
            <FieldRow stackOnMobile>
              <Field
                label={pf ? 'NOME COMPLETO' : 'RAZÃO SOCIAL'}
                value={inv.nome}
                onChange={(nome) => patch('investidor', { nome })}
                placeholder={pf ? 'João da Silva Pereira' : 'Empresa Exemplo LTDA'}
                icon={pf ? ICONS.user : ICONS.building}
                autoComplete={pf ? 'name' : 'organization'}
                valid={!errors.nome}
                error={show(errors.nome)}
              />
              <Field
                width={180}
                label={pf ? 'DATA DE NASCIMENTO' : 'DATA DE ABERTURA'}
                value={inv.nascimento}
                onChange={(nascimento) => patch('investidor', { nascimento })}
                mask={maskDate}
                placeholder="00/00/0000"
                inputMode="numeric"
                icon={ICONS.calendar}
                autoComplete={pf ? 'bday' : 'off'}
                valid={!errors.nascimento}
                error={show(errors.nascimento) ?? (inv.nascimento.length === 10 ? errors.nascimento : null)}
              />
            </FieldRow>
            <Field
              label="EMAIL"
              type="email"
              value={inv.email}
              onChange={(email) => patch('investidor', { email: email.trim() })}
              placeholder="seuemail@mail.com.br"
              icon={ICONS.mail}
              autoComplete="email"
              inputMode="email"
              valid={!errors.email}
              error={show(errors.email)}
            />
            <Field
              label="WHATSAPP"
              type="tel"
              value={inv.whatsapp}
              onChange={(whatsapp) => patch('investidor', { whatsapp })}
              mask={maskPhone}
              placeholder="(00) 0000-0000"
              icon={ICONS.phone}
              autoComplete="tel-national"
              inputMode="tel"
              valid={!errors.whatsapp}
              error={show(errors.whatsapp)}
            />
          </Stack>
        </Stack>

        <Stack gap={28}>
          <SectionHeading title="Endereço" subtitle="Dados informativos da localidade onde o investidor reside" />
          <AddressSection
            value={inv.endereco}
            onChange={setEndereco}
            loading={lookingUp}
            errors={showErrors ? addressErrors : undefined}
            modal={{
              title: 'Endereço do investidor',
              subtitle: 'Edite de forma livre o endereço onde o investidor reside',
              icon: ICONS.pin,
            }}
            cepSubtitle="Encontre o seu CEP pelo endereço onde você reside"
          />
        </Stack>
      </Stack>
    </GeradorStepPage>
  )
}
