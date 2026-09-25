import { useRef, useState } from 'react'
import { maskCep } from '../../lib/format'
import { isValidCep } from '../../lib/validators'
import { UFS, fetchCep, type Address } from '../../services/address'
import { Button, FooterGroup } from '../ui/Button'
import { Field, FieldRow } from '../ui/Field'
import { DialogHeader, Modal } from '../ui/Modal'
import { SelectField } from '../ui/SelectField'
import styles from './AddressModal.module.css'

export type AddressModalProps = {
  open: boolean
  onClose: () => void
  onConfirm: (address: Address) => void
  address: Address
  title: string
  subtitle: string
  icon: string
}

type Errors = Partial<Record<keyof Address, string>>

const filled = (v: string) => v.trim().length > 0

/** Rascunho editável do endereço (CEP com busca no ViaCEP + validação) */
// oxlint-disable-next-line react/only-export-components
export function useAddressDraft(address: Address) {
  const [draft, setDraft] = useState(address)
  const [errors, setErrors] = useState<Errors>({})
  const [loadingCep, setLoadingCep] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const set = (key: keyof Address) => (value: string) => {
    setDraft((d) => ({ ...d, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const onCepChange = async (value: string) => {
    set('cep')(value)
    if (!isValidCep(value)) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoadingCep(true)
    try {
      const found = await fetchCep(value, controller.signal)
      if (found) setDraft((d) => ({ ...d, ...found, numero: d.numero, complemento: d.complemento, lat: d.lat, lng: d.lng }))
      else setErrors((e) => ({ ...e, cep: 'CEP não encontrado' }))
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setErrors((e) => ({ ...e, cep: 'Não foi possível consultar o CEP agora' }))
    } finally {
      if (abortRef.current === controller) setLoadingCep(false)
    }
  }

  const validate = () => {
    const next: Errors = {}
    if (!isValidCep(draft.cep)) next.cep = 'Informe um CEP válido'
    if (!draft.uf) next.uf = 'Selecione'
    if (!draft.cidade.trim()) next.cidade = 'Informe a cidade'
    if (!draft.logradouro.trim()) next.logradouro = 'Informe o logradouro'
    if (!draft.bairro.trim()) next.bairro = 'Informe o bairro'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  return { draft, setDraft, set, errors, loadingCep, onCepChange, validate }
}

export type AddressDraft = ReturnType<typeof useAddressDraft>

/** Campos do AddressModal do Design System (CEP · Estado/Cidade · Logradouro · Número/Bairro · Complemento) */
export function AddressFields({ form, onSubmit }: { form: AddressDraft; onSubmit: () => void }) {
  const { draft, set, errors, loadingCep, onCepChange } = form
  return (
    <form
      className={styles.fields}
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <Field
        label="CEP"
        value={draft.cep}
        onChange={onCepChange}
        mask={maskCep}
        placeholder="00000-000"
        inputMode="numeric"
        autoComplete="postal-code"
        loading={loadingCep}
        valid={isValidCep(draft.cep) && !loadingCep && !errors.cep}
        error={errors.cep}
      />
      <FieldRow>
        <SelectField
          width={150}
          label="ESTADO"
          value={draft.uf}
          onChange={set('uf')}
          options={UFS.map((uf) => ({ value: uf, label: uf }))}
          error={errors.uf}
        />
        <Field label="CIDADE" value={draft.cidade} onChange={set('cidade')} placeholder="Ex: Uberlândia" valid={filled(draft.cidade)} error={errors.cidade} autoComplete="address-level2" />
      </FieldRow>
      <Field
        label="LOGRADOURO"
        value={draft.logradouro}
        onChange={set('logradouro')}
        placeholder="Ex.: Rua Princesa Izabel"
        valid={filled(draft.logradouro)}
        error={errors.logradouro}
        autoComplete="address-line1"
      />
      <FieldRow>
        <Field width={150} label="NÚMERO" value={draft.numero} onChange={set('numero')} placeholder="000" inputMode="numeric" valid={filled(draft.numero)} />
        <Field label="BAIRRO" value={draft.bairro} onChange={set('bairro')} placeholder="Ex.: Centro" valid={filled(draft.bairro)} error={errors.bairro} />
      </FieldRow>
      <Field label="COMPLEMENTO" value={draft.complemento} onChange={set('complemento')} placeholder="Ex.: AP 250" valid={filled(draft.complemento)} autoComplete="address-line2" />
      <button type="submit" hidden />
    </form>
  )
}

/** "AddressModal" do Design System (node 2508:9462) */
export function AddressModal({ open, onClose, ...rest }: AddressModalProps) {
  return (
    <Modal open={open} onClose={onClose} label={rest.title}>
      {/* montado a cada abertura: o rascunho sempre parte do endereço atual */}
      <AddressForm onClose={onClose} {...rest} />
    </Modal>
  )
}

function AddressForm({ onClose, onConfirm, address, title, subtitle, icon }: Omit<AddressModalProps, 'open'>) {
  const form = useAddressDraft(address)

  const confirm = () => {
    if (!form.validate()) return
    const { draft } = form
    const changedLocation =
      draft.cep !== address.cep || draft.logradouro !== address.logradouro || draft.cidade !== address.cidade || draft.numero !== address.numero
    onConfirm(changedLocation ? { ...draft, lat: undefined, lng: undefined } : draft)
    onClose()
  }

  return (
    <>
      <DialogHeader icon={icon} title={title} subtitle={subtitle} />
      <AddressFields form={form} onSubmit={confirm} />
      <FooterGroup className={styles.footer}>
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={confirm}>Confirmar</Button>
      </FooterGroup>
    </>
  )
}
