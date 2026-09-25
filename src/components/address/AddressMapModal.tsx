import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { geocode, reverseGeocode, type Address } from '../../services/address'
import { Button, FooterGroup } from '../ui/Button'
import { DialogHeader, Modal } from '../ui/Modal'
import { AddressFields, useAddressDraft, type AddressModalProps } from './AddressModal'
import styles from './AddressMapModal.module.css'

// Leaflet em chunk separado (só baixa quando o mapa aparece)
const MapView = lazy(() => import('./MapView').then((m) => ({ default: m.MapView })))

const geoKeyOf = (a: Address) => [a.cep, a.logradouro, a.numero, a.cidade, a.uf].join('|')

/**
 * Mapa ampliado + edição do endereço lado a lado.
 * Campos -> mapa: ao editar, o pino vai para o novo endereço.
 * Mapa -> campos: arrastar o pino (ou clicar no mapa) preenche o endereço daquele ponto.
 */
export function AddressMapModal({ open, onClose, ...rest }: AddressModalProps) {
  return (
    <Modal open={open} onClose={onClose} label={rest.title} width={1080} padding="flush">
      <MapEditor onClose={onClose} {...rest} />
    </Modal>
  )
}

type Status = 'idle' | 'locating' | 'reading'

function MapEditor({ onClose, onConfirm, address, title, subtitle, icon }: Omit<AddressModalProps, 'open'>) {
  const form = useAddressDraft(address)
  const { draft, setDraft } = form
  const [status, setStatus] = useState<Status>('idle')
  const draftRef = useRef(draft)
  const skipKey = useRef<string | null>(null)
  const reverseAbort = useRef<AbortController | null>(null)
  useEffect(() => {
    draftRef.current = draft
  })

  // Campos -> mapa (com debounce enquanto digita)
  const geoKey = geoKeyOf(draft)
  const initialKey = useRef(draft.lat != null ? geoKey : null)
  useEffect(() => {
    if (skipKey.current === geoKey) return // mudança veio do próprio mapa
    if (initialKey.current === geoKey) return // endereço inicial já tem coordenadas
    if (!draftRef.current.cidade && !draftRef.current.logradouro) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setStatus('locating')
      try {
        const coords = await geocode(draftRef.current, controller.signal)
        if (coords) setDraft((d) => ({ ...d, ...coords }))
      } catch {
        /* mantém o pino onde está */
      } finally {
        if (!controller.signal.aborted) setStatus('idle')
      }
    }, 700)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [geoKey, setDraft])

  // Mapa -> campos
  const onPick = async (lat: number, lng: number) => {
    setDraft((d) => ({ ...d, lat, lng }))
    reverseAbort.current?.abort()
    const controller = new AbortController()
    reverseAbort.current = controller
    setStatus('reading')
    try {
      const found = await reverseGeocode(lat, lng, controller.signal)
      if (found) {
        const d = draftRef.current
        const next: Address = {
          ...d,
          logradouro: found.logradouro || d.logradouro,
          numero: found.numero || d.numero,
          bairro: found.bairro || d.bairro,
          cidade: found.cidade || d.cidade,
          uf: found.uf || d.uf,
          cep: found.cep || d.cep,
          lat,
          lng,
        }
        skipKey.current = geoKeyOf(next)
        setDraft(next)
      }
    } catch {
      /* sem endereço para o ponto: mantém os campos */
    } finally {
      if (reverseAbort.current === controller) setStatus('idle')
    }
  }

  const confirm = () => {
    if (!form.validate()) return
    onConfirm(draft)
    onClose()
  }

  const hint =
    status === 'locating'
      ? 'Localizando o endereço no mapa…'
      : status === 'reading'
        ? 'Buscando o endereço deste ponto…'
        : 'Arraste o pino ou clique no mapa para ajustar'

  return (
    <div className={styles.layout}>
      <div className={styles.mapCol}>
        <Suspense fallback={<div className={styles.map} />}>
          <MapView lat={draft.lat} lng={draft.lng} zoom={16} wheelZoom onPick={onPick} loading={status === 'locating'} className={styles.map} />
        </Suspense>
        <p className={styles.hint} role="status">
          {status !== 'idle' ? <span className={styles.hintSpinner} aria-hidden /> : null}
          {hint}
        </p>
      </div>
      <div className={styles.formCol}>
        <DialogHeader icon={icon} title={title} subtitle={subtitle} />
        <AddressFields form={form} onSubmit={confirm} />
        <FooterGroup className={styles.footer}>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={confirm}>Confirmar</Button>
        </FooterGroup>
      </div>
    </div>
  )
}
