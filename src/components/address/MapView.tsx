import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import { ICONS, IMAGES } from '../../assets'
import { cn } from '../../lib/cn'
import { useTheme, type Theme } from '../../lib/theme'
import styles from './MapView.module.css'

/** Pin do Figma (forma + círculo + sombra), com a mesma geometria do node 1:639 */
const pinHtml = `
  <div class="${styles.pin}">
    <img src="${ICONS.mapPinShadow}" class="${styles.pinShadow}" alt="" />
    <img src="${ICONS.mapPinShape}" class="${styles.pinShape}" alt="" />
    <img src="${ICONS.mapPinCircle}" class="${styles.pinCircle}" alt="" />
  </div>`

/**
 * Basemap cinza-claro (Esri Light Gray Canvas), o mais próximo do mapa do Figma.
 * Para produção, confirme os termos de uso ou troque por um provedor contratado
 * (Mapbox, MapTiler, Google...) — basta alterar as URLs abaixo.
 */
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas'
/** Light Gray no tema claro, Dark Gray no escuro (mesmo estilo, só invertido) */
const tiles = (theme: Theme) => {
  const style = theme === 'dark' ? 'Dark' : 'Light'
  return {
    base: `${ESRI}/World_${style}_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    labels: `${ESRI}/World_${style}_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
  }
}
const TILE_ATTRIBUTION = 'Tiles © Esri — Esri, HERE, Garmin, © OpenStreetMap'

const pinIcon = L.divIcon({
  html: pinHtml,
  className: styles.pinWrapper,
  iconSize: [41, 57],
  iconAnchor: [20, 46],
})

type MapViewProps = {
  lat?: number
  lng?: number
  loading?: boolean
  zoom?: number
  className?: string
  /** Libera o zoom pela roda do mouse sem precisar clicar antes */
  wheelZoom?: boolean
  /** false = prévia estática (sem arrastar/zoom), usada dentro do card */
  interactive?: boolean
  /** Pino arrastável + clique no mapa reposiciona; devolve a nova coordenada */
  onPick?: (lat: number, lng: number) => void
}

export function MapView({ lat, lng, loading, zoom = 16, className, wheelZoom = false, interactive = true, onPick }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const layersRef = useRef<{ base: L.TileLayer; labels: L.TileLayer } | null>(null)
  const theme = useTheme()
  const themeRef = useRef(theme)
  const onPickRef = useRef(onPick)
  useEffect(() => {
    onPickRef.current = onPick
  })
  const hasCoords = lat != null && lng != null
  const pickable = Boolean(onPick)

  useEffect(() => {
    if (!hasCoords || !containerRef.current) return
    if (!mapRef.current) {
      const map = L.map(containerRef.current, {
        center: [lat, lng],
        zoom,
        zoomControl: false,
        attributionControl: true,
        scrollWheelZoom: interactive && wheelZoom,
        dragging: interactive,
        touchZoom: interactive,
        doubleClickZoom: interactive,
        boxZoom: interactive,
        keyboard: interactive,
      })
      map.attributionControl.setPrefix(false)
      const urls = tiles(themeRef.current)
      layersRef.current = {
        base: L.tileLayer(urls.base, { maxZoom: 19, maxNativeZoom: 16, attribution: TILE_ATTRIBUTION }).addTo(map),
        labels: L.tileLayer(urls.labels, { maxZoom: 19, maxNativeZoom: 16 }).addTo(map),
      }
      if (interactive) {
        L.control.zoom({ position: 'bottomright', zoomInTitle: 'Aproximar', zoomOutTitle: 'Afastar' }).addTo(map)
        if (!wheelZoom) {
          // Evita "sequestrar" o scroll da página: zoom pela roda só depois de clicar no mapa
          map.on('click', () => map.scrollWheelZoom.enable())
          map.on('mouseout', () => map.scrollWheelZoom.disable())
        }
      }
      const marker = L.marker([lat, lng], { icon: pinIcon, keyboard: false, draggable: pickable }).addTo(map)
      if (pickable) {
        marker.on('dragend', () => {
          const p = marker.getLatLng()
          onPickRef.current?.(p.lat, p.lng)
        })
        map.on('click', (e: L.LeafletMouseEvent) => {
          marker.setLatLng(e.latlng)
          onPickRef.current?.(e.latlng.lat, e.latlng.lng)
        })
      }
      markerRef.current = marker
      mapRef.current = map
    } else {
      markerRef.current?.setLatLng([lat, lng])
      if (!mapRef.current.getBounds().pad(-0.2).contains([lat, lng])) mapRef.current.panTo([lat, lng], { animate: true })
    }
  }, [hasCoords, lat, lng, zoom, wheelZoom, interactive, pickable])

  // Troca de tema com o mapa aberto: só troca as URLs dos tiles
  useEffect(() => {
    themeRef.current = theme
    const urls = tiles(theme)
    layersRef.current?.base.setUrl(urls.base)
    layersRef.current?.labels.setUrl(urls.labels)
  }, [theme])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(() => mapRef.current?.invalidateSize())
    observer.observe(el)
    return () => {
      observer.disconnect()
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  return (
    <div className={cn(styles.frame, !interactive && styles.preview, pickable && styles.pickable, className)}>
      <div ref={containerRef} className={styles.map} role="region" aria-label="Mapa com a localização do endereço" />
      {hasCoords ? null : <StaticMap />}
      {loading ? <div className={styles.loading} aria-label="Carregando mapa" role="status" /> : null}
    </div>
  )
}

/** Mapa estático do Figma — usado enquanto as coordenadas não chegam (ou se a geolocalização falhar). */
function StaticMap() {
  return (
    <div className={styles.static} aria-hidden>
      <img src={IMAGES.mapBase} className={styles.staticBase} alt="" />
      <img src={IMAGES.mapStreets} className={styles.staticStreets} alt="" />
      <div className={styles.staticPin} dangerouslySetInnerHTML={{ __html: pinHtml }} />
    </div>
  )
}
