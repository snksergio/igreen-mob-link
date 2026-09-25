import { maskCep, onlyDigits } from '../lib/format'

export type Address = {
  cep: string
  logradouro: string
  bairro: string
  cidade: string
  uf: string
  numero: string
  complemento: string
  lat?: number
  lng?: number
}

export const emptyAddress: Address = {
  cep: '',
  logradouro: '',
  bairro: '',
  cidade: '',
  uf: '',
  numero: '',
  complemento: '',
}

export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

type ViaCepResponse = {
  cep: string
  logradouro: string
  bairro: string
  localidade: string
  uf: string
  erro?: boolean | string
}

const toAddress = (r: ViaCepResponse): Address => ({
  ...emptyAddress,
  cep: maskCep(r.cep),
  logradouro: r.logradouro,
  bairro: r.bairro,
  cidade: r.localidade,
  uf: r.uf,
})

/** Busca endereço pelo CEP (ViaCEP). Retorna null se não existir. */
export async function fetchCep(cep: string, signal?: AbortSignal): Promise<Address | null> {
  const digits = onlyDigits(cep)
  if (digits.length !== 8) return null
  const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal })
  if (!res.ok) return null
  const data = (await res.json()) as ViaCepResponse
  if (data.erro) return null
  return toAddress(data)
}

/** "Não sabe o seu CEP?" — busca por UF + cidade + logradouro (ViaCEP). */
export async function searchCep(uf: string, cidade: string, logradouro: string, signal?: AbortSignal) {
  const path = [uf, cidade, logradouro].map((p) => encodeURIComponent(p.trim())).join('/')
  const res = await fetch(`https://viacep.com.br/ws/${path}/json/`, { signal })
  if (!res.ok) return []
  const data = (await res.json()) as ViaCepResponse[] | { erro: true }
  return Array.isArray(data) ? data.slice(0, 20).map(toAddress) : []
}

/** Coordenadas do endereço: AwesomeAPI (pelo CEP) e, como alternativa, Nominatim (OpenStreetMap). */
export async function geocode(address: Address, signal?: AbortSignal): Promise<{ lat: number; lng: number } | null> {
  const digits = onlyDigits(address.cep)
  try {
    if (digits.length === 8) {
      const res = await fetch(`https://cep.awesomeapi.com.br/json/${digits}`, { signal })
      if (res.ok) {
        const data = (await res.json()) as { lat?: string; lng?: string }
        const lat = Number(data.lat)
        const lng = Number(data.lng)
        if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0) return { lat, lng }
      }
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
  }

  const query = [
    [address.numero, address.logradouro].filter(Boolean).join(' '),
    address.cidade,
    address.uf,
    'Brasil',
  ]
    .filter(Boolean)
    .join(', ')
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`,
    { signal, headers: { 'Accept-Language': 'pt-BR' } },
  )
  if (!res.ok) return null
  const [hit] = (await res.json()) as { lat: string; lon: string }[]
  return hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null
}

/** Endereço a partir de uma coordenada (Nominatim) — usado quando o pino é movido no mapa. */
export async function reverseGeocode(lat: number, lng: number, signal?: AbortSignal): Promise<Partial<Address> | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${lat}&lon=${lng}`,
    { signal, headers: { 'Accept-Language': 'pt-BR' } },
  )
  if (!res.ok) return null
  const { address: a } = (await res.json()) as { address?: Record<string, string> }
  if (!a) return null
  const iso = a['ISO3166-2-lvl4'] ?? ''
  return {
    logradouro: a.road ?? a.pedestrian ?? a.footway ?? '',
    numero: a.house_number ?? '',
    bairro: a.suburb ?? a.neighbourhood ?? a.quarter ?? a.city_district ?? '',
    cidade: a.city ?? a.town ?? a.village ?? a.municipality ?? '',
    uf: iso.startsWith('BR-') ? iso.slice(3) : '',
    cep: a.postcode ? maskCep(a.postcode) : '',
  }
}

export const cityLine =(a: Address) => [a.cidade && `${a.cidade}, ${a.uf}`, a.cep].filter(Boolean).join(' - ')
