import { Suspense, lazy } from 'react'
import { ICONS } from '../../assets'
import { cn } from '../../lib/cn'
import { cityLine, type Address } from '../../services/address'
import { Icon, Img } from '../ui/Icon'
import styles from './AddressCard.module.css'

// Leaflet só é baixado quando algum card com mapa aparece (passo 3)
const MapView = lazy(() => import('./MapView').then((m) => ({ default: m.MapView })))

type AddressCardProps = {
  address: Address
  onEdit: () => void
  /** Mostra a prévia do mapa; clicar nela chama onExpand (mapa ampliado + edição) */
  withMap?: boolean
  mapLoading?: boolean
  onExpand?: () => void
}

export function AddressCard({ address, onEdit, withMap, mapLoading, onExpand }: AddressCardProps) {
  return (
    <div className={cn(styles.card, withMap && styles.withMap)}>
      <div className={styles.header}>
        <div className={styles.info}>
          <span className={styles.iconBox}>
            <Img src={ICONS.addressPin} size={28} />
          </span>
          <div className={styles.text}>
            <p className={cn('t-body-lg-semibold', styles.street)}>{address.logradouro || 'Endereço sem logradouro'}</p>
            <div className={cn('t-body-sm-medium', styles.lines)}>
              {address.bairro ? <p>{address.bairro}</p> : null}
              <p>{cityLine(address)}</p>
            </div>
          </div>
        </div>
        <button type="button" className={styles.edit} onClick={onEdit} aria-label="Editar endereço">
          <Img src={ICONS.edit} size={18} />
        </button>
      </div>
      {withMap ? (
        <div className={styles.mapWrap}>
          <Suspense fallback={<div className={styles.mapFallback} aria-hidden />}>
            <MapView lat={address.lat} lng={address.lng} loading={mapLoading} interactive={false} />
          </Suspense>
          <button type="button" className={styles.mapButton} onClick={onExpand} aria-label="Ampliar mapa e ajustar o endereço">
            <span className={cn(styles.expand, 't-caption')}>
              <Icon src={ICONS.search} size={14} color="currentColor" />
              Ampliar mapa
            </span>
          </button>
        </div>
      ) : null}
    </div>
  )
}
