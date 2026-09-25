import { useEffect, useState } from 'react'

/**
 * Vídeo adaptativo à conexão (mesma ideia do "adaptive loading"/ABR, simplificada para clipes curtos):
 *
 * 1. Cada vídeo tem uma escada de qualidades (larguras diferentes do mesmo arquivo).
 * 2. A escolha inicial usa o tamanho da tela (não baixa mais pixels do que ela mostra) e a banda estimada:
 *    a medida real desta sessão ou, se não houver, o `navigator.connection.downlink` (Chrome/Edge/Android).
 * 3. O download é medido enquanto acontece. Se a previsão passa do orçamento, ele é cancelado e desce um degrau.
 * 4. Se nem o menor arquivo chega a tempo (ou há economia de dados / 2G), usa a imagem estática no lugar do vídeo.
 * 5. A banda medida fica salva na sessão, então o próximo vídeo já começa na qualidade certa.
 *
 * O arquivo é baixado inteiro antes de tocar: o clipe não trava no meio da animação.
 */

export type Rendition = { src: string; width: number; bytes: number }

/** `lite`: a imagem entrou por causa da rede ruim — use a versão leve dela */
export type AdaptiveVideo = { status: 'loading' } | { status: 'video'; src: string } | { status: 'image'; lite: boolean }

type NetworkInformation = { saveData?: boolean; effectiveType?: string; downlink?: number }

const THROUGHPUT_KEY = 'igreen-mob-banda' // bytes/s medidos nesta sessão

const connection = () => (navigator as Navigator & { connection?: NetworkInformation }).connection

/** Economia de dados ligada ou rede 2G: nem tenta o vídeo */
const avoidVideo = () => {
  const c = connection()
  return !!c?.saveData || c?.effectiveType === 'slow-2g' || c?.effectiveType === '2g'
}

function measuredThroughput(): number | null {
  try {
    const value = Number(sessionStorage.getItem(THROUGHPUT_KEY))
    return value > 0 ? value : null
  } catch {
    return null
  }
}

function saveThroughput(bytesPerSecond: number) {
  const previous = measuredThroughput()
  // média com a medida anterior para uma oscilação pontual não derrubar (ou inflar) tudo
  const value = previous ? (previous + bytesPerSecond) / 2 : bytesPerSecond
  try {
    sessionStorage.setItem(THROUGHPUT_KEY, String(Math.round(value)))
  } catch {
    /* sessionStorage indisponível */
  }
}

/** Banda estimada em bytes/s, ou null quando o navegador não informa e ainda não medimos */
function estimatedThroughput(): number | null {
  const measured = measuredThroughput()
  if (measured) return measured
  const downlink = connection()?.downlink
  return downlink ? (downlink * 1_000_000) / 8 : null
}

/** Folga sobre o orçamento para um download já em andamento */
const GRACE = 1.5

const fits = (r: Rendition, bytesPerSecond: number, ms: number) => (r.bytes / bytesPerSecond) * 1000 <= ms

/** Qualidade inicial: a menor que ainda cobre a tela, rebaixada até caber no orçamento de tempo */
function initialRendition(ladder: readonly Rendition[], neededWidth: number, budgetMs: number): Rendition | null {
  const sorted = [...ladder].sort((a, b) => b.width - a.width)
  let top = 0
  sorted.forEach((r, i) => {
    if (r.width >= neededWidth) top = i
  })
  let candidates = sorted.slice(top)
  // 3G: pula a qualidade mais alta
  if (connection()?.effectiveType === '3g' && candidates.length > 1) candidates = candidates.slice(1)

  const bps = estimatedThroughput()
  if (!bps) return candidates[0] // sem estimativa: a medição durante o download corrige
  const fit = candidates.find((r) => fits(r, bps, budgetMs))
  if (fit) return fit
  const smallest = candidates[candidates.length - 1]
  return fits(smallest, bps, budgetMs * 2) ? smallest : null
}

type Attempt = { blob: Blob } | { slowBps: number } | { failed: true }

async function download(r: Rendition, startedAt: number, budgetMs: number, signal: AbortSignal): Promise<Attempt> {
  const ctrl = new AbortController()
  const abort = () => ctrl.abort()
  signal.addEventListener('abort', abort)
  try {
    const res = await fetch(r.src, { signal: ctrl.signal })
    if (!res.ok || !res.body) return { failed: true }
    const total = Number(res.headers.get('content-length')) || r.bytes
    const reader = res.body.getReader()
    const chunks: Uint8Array[] = []
    let received = 0
    // a banda é medida a partir do primeiro byte (a latência da requisição não entra na conta)
    let firstByteAt = 0
    let firstChunk = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      received += value.length
      if (!firstByteAt) {
        firstByteAt = performance.now()
        firstChunk = value.length
        continue
      }
      const sampleMs = performance.now() - firstByteAt
      const sampleBytes = received - firstChunk
      // com uma amostra razoável, projeta quando termina; só desiste se passar bem do orçamento
      // (cancelar um download quase pronto desperdiçaria o que já veio)
      if (sampleMs > 400 && sampleBytes > 48_000) {
        const bps = sampleBytes / (sampleMs / 1000)
        const finishesAt = performance.now() - startedAt + ((total - received) / bps) * 1000
        if (finishesAt > budgetMs * GRACE) {
          ctrl.abort()
          saveThroughput(bps)
          return { slowBps: bps }
        }
      }
    }
    const sampleMs = firstByteAt ? performance.now() - firstByteAt : 0
    if (sampleMs > 150) saveThroughput((received - firstChunk) / (sampleMs / 1000)) // respostas do cache não contam
    return { blob: new Blob(chunks as BlobPart[], { type: 'video/mp4' }) }
  } catch {
    return { failed: true }
  } finally {
    signal.removeEventListener('abort', abort)
  }
}

async function loadAdaptive(ladder: readonly Rendition[], neededWidth: number, budgetMs: number, signal: AbortSignal): Promise<Blob | null> {
  if (avoidVideo()) return null
  const startedAt = performance.now()
  let choice = initialRendition(ladder, neededWidth, budgetMs)
  while (choice && !signal.aborted) {
    const attempt = await download(choice, startedAt, budgetMs, signal)
    if ('blob' in attempt) return attempt.blob
    if ('failed' in attempt) return null
    // desce para o maior degrau menor que ainda termina dentro do tempo que sobra
    const remaining = budgetMs * GRACE - (performance.now() - startedAt)
    const current: Rendition = choice
    choice = [...ladder].sort((a, b) => b.width - a.width).find((r) => r.width < current.width && fits(r, attempt.slowBps, remaining)) ?? null
  }
  return null
}

/**
 * Decide entre vídeo e imagem conforme a conexão. `neededWidth` é a largura em pixels físicos que o vídeo
 * ocupa na tela; `budgetMs` é quanto tempo aceitamos esperar antes de ficar com a imagem.
 */
export function useAdaptiveVideo(
  ladder: readonly Rendition[],
  { enabled, neededWidth, budgetMs = 3000 }: { enabled: boolean; neededWidth: number; budgetMs?: number },
): AdaptiveVideo {
  const key = ladder[0]?.src ?? ''
  const [result, setResult] = useState<{ key: string; src: string | null } | null>(null)

  useEffect(() => {
    if (!enabled) return
    const ctrl = new AbortController()
    // prazo final: rede travada sem responder também cai para a imagem
    const deadline = setTimeout(() => ctrl.abort(), budgetMs * GRACE + 1000)
    let url: string | null = null
    let cancelled = false
    loadAdaptive(ladder, neededWidth, budgetMs, ctrl.signal).then((blob) => {
      clearTimeout(deadline)
      if (cancelled) return
      url = blob ? URL.createObjectURL(blob) : null
      setResult({ key, src: url })
    })
    return () => {
      cancelled = true
      clearTimeout(deadline)
      ctrl.abort()
      if (url) URL.revokeObjectURL(url)
    }
    // a escolha é feita uma vez por vídeo: redimensionar a janela não baixa outro arquivo
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled])

  if (!enabled) return { status: 'image', lite: false }
  if (avoidVideo()) return { status: 'image', lite: true }
  if (!result || result.key !== key) return { status: 'loading' }
  return result.src ? { status: 'video', src: result.src } : { status: 'image', lite: true }
}
