import { useEffect, useRef, useState } from 'react'
import { ICONS } from '../../assets'
import { maskCep } from '../../lib/format'
import { isValidCep } from '../../lib/validators'
import { fetchCep, geocode, type Address } from '../../services/address'
import { cn } from '../../lib/cn'
import { TextLink } from '../ui/Controls'
import { Field, FieldRow } from '../ui/Field'
import { AddressCard } from './AddressCard'
import { AddressMapModal } from './AddressMapModal'
import { AddressModal } from './AddressModal'
import { CepModal } from './CepModal'
import styles from './AddressSection.module.css'

export type AddressErrors = { cep?: string; endereco?: string; numero?: string }

type AddressSectionProps = {
  value: Address
  onChange: (address: Address) => void
  errors?: AddressErrors
  /** Mostra o mapa dentro do card (passo 3) */
  withMap?: boolean
  /** Carregando o endereço vindo de outra fonte (ex.: consulta por CPF) */
  loading?: boolean
  modal: { title: string; subtitle: string; icon: string }
  cepSubtitle: string
}

/** CEP + "Não sabe o seu CEP?" + card do endereço (com mapa opcional) + Número/Complemento */
export function AddressSection({ value, onChange, errors, withMap, loading, modal, cepSubtitle }: AddressSectionProps) {
  const [cepLoading, setCepLoading] = useState(false)
  const [cepError, setCepError] = useState<string | null>(null)
  // Chave do último endereço cuja geolocalização terminou (com ou sem sucesso)
  const [geoDoneKey, setGeoDoneKey] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [mapEditing, setMapEditing] = useState(false)
  const [searching, setSearching] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const valueRef = useRef(value)
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    valueRef.current = value
    onChangeRef.current = onChange
  })

  const hasAddress = Boolean(value.logradouro || value.cidade)

  const onCepChange = async (cep: string) => {
    setCepError(null)
    onChange({ ...value, cep })
    if (!isValidCep(cep)) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setCepLoading(true)
    try {
      const found = await fetchCep(cep, controller.signal)
      const current = valueRef.current
      if (found) onChange({ ...found, numero: current.numero, complemento: current.complemento })
      else {
        setCepError('CEP não encontrado. Confira os números ou busque pelo endereço.')
        onChange({ ...current, logradouro: '', bairro: '', cidade: '', uf: '', lat: undefined, lng: undefined })
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setCepError('Não foi possível consultar o CEP agora. Tente novamente.')
    } finally {
      if (abortRef.current === controller) setCepLoading(false)
    }
  }

  // Coordenadas para o mapa sempre que o endereço mudar
  const geoKey = withMap && hasAddress && value.lat == null ? [value.cep, value.logradouro, value.cidade, value.uf].join('|') : null
  const geoLoading = geoKey !== null && geoDoneKey !== geoKey
  useEffect(() => {
    if (!geoKey) return
    const controller = new AbortController()
    geocode(valueRef.current, controller.signal)
      .then((coords) => {
        if (coords) onChangeRef.current({ ...valueRef.current, ...coords })
      })
      .catch(() => {
        /* sem coordenadas: mantém o mapa estático */
      })
      .finally(() => {
        if (!controller.signal.aborted) setGeoDoneKey(geoKey)
      })
    return () => controller.abort()
  }, [geoKey])

  const cepFieldError = cepError || errors?.cep || (!hasAddress && errors?.endereco)

  return (
    <div className={styles.section}>
      <div className={styles.cepRow}>
        <Field
          label="CEP DO ENDEREÇO"
          value={value.cep}
          onChange={onCepChange}
          mask={maskCep}
          placeholder="00000-000"
          inputMode="numeric"
          autoComplete="postal-code"
          loading={cepLoading || loading}
          valid={isValidCep(value.cep) && hasAddress && !cepFieldError}
          error={cepFieldError}
        />
        <TextLink onClick={() => setSearching(true)}>Não sabe o seu CEP?</TextLink>
      </div>

      {/* Card do endereço, mapa, número e complemento só aparecem depois do CEP */}
      <div className={cn(styles.reveal, hasAddress && styles.revealOpen)} aria-hidden={!hasAddress || undefined}>
        <div className={styles.revealInner}>
          {hasAddress ? (
            <AddressCard
              address={value}
              onEdit={() => (withMap ? setMapEditing(true) : setEditing(true))}
              withMap={withMap}
              mapLoading={geoLoading}
              onExpand={() => setMapEditing(true)}
            />
          ) : null}

          <FieldRow>
        <Field
          label="NÚMERO"
          value={value.numero}
          onChange={(numero) => onChange({ ...value, numero })}
          placeholder="000"
          icon={ICONS.user}
          inputMode="numeric"
          valid={value.numero.trim().length > 0}
          error={errors?.numero}
          autoComplete="address-line2"
        />
        <Field
          label="COMPLEMENTO"
          value={value.complemento}
          onChange={(complemento) => onChange({ ...value, complemento })}
          placeholder="AP 250"
          icon={ICONS.calendar}
          valid={value.complemento.trim().length > 0}
        />
          </FieldRow>
        </div>
      </div>

      <AddressModal
        open={editing}
        onClose={() => setEditing(false)}
        onConfirm={(address) => {
          setCepError(null)
          onChange(address)
        }}
        address={value}
        {...modal}
      />
      {withMap ? (
        <AddressMapModal
          open={mapEditing}
          onClose={() => setMapEditing(false)}
          onConfirm={(address) => {
            setCepError(null)
            onChange(address)
          }}
          address={value}
          {...modal}
        />
      ) : null}
      <CepModal
        open={searching}
        onClose={() => setSearching(false)}
        initial={{ uf: value.uf, cidade: value.cidade }}
        subtitle={cepSubtitle}
        onSelect={(address) => {
          setCepError(null)
          onChange({ ...address, numero: value.numero, complemento: value.complemento })
        }}
      />
    </div>
  )
}
