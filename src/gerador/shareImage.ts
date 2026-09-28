import { ICONS, IMAGES } from '../assets'
import { money, moneyParts } from '../lib/format'
import { compactMoney, paybackLabel, pct, signedMoney } from './format'

/** Dados da imagem de compartilhamento (sempre o mês 1 do cenário escolhido) */
export type ShareImageData = {
  modelo: string
  potencia: string
  investimento: number
  sociedade: string
  recebimento: number
  payback: number | null
  net36: number
  roi36: number
  /** saldo acumulado: índice 0 = investimento, 1..36 = meses */
  saldo: number[]
  recargas: number
  /** comissões da carteira no mês 1 (null = cenário só recargas) */
  carteira: number | null
  clientes: number
  site: string
}

const W = 1080
const H = 1350
const PAD = 72
const C = {
  bg: '#ffffff',
  strong: '#141416',
  main: '#4b4d52',
  muted: '#8a8d93',
  muted2: '#f3f4f6',
  line: '#e6e7ea',
  green: '#00a859',
  greenDark: '#0a8a3c',
  greenStrong: '#008949',
  greenSubtle: '#e8f7ef',
  highlight: '#00e405',
}
const SANS = 'Geist, system-ui, sans-serif'
const INTER = 'Inter, system-ui, sans-serif'

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })

function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = 'left') {
  ctx.font = font
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.fillText(value, x, y)
  return ctx.measureText(value).width
}

function pill(ctx: CanvasRenderingContext2D, label: string, x: number, y: number) {
  ctx.font = `700 26px ${SANS}`
  const w = ctx.measureText(label).width + 44
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.roundRect(x, y, w, 56, 28)
  ctx.fill()
  text(ctx, label, x + 22, y + 37, `700 26px ${SANS}`, C.greenStrong)
  return w
}

/**
 * Card 1080×1350 (formato retrato, bom para WhatsApp e stories) com o resultado da simulação:
 * recebimento do mês 1, retorno, saldo e ROI em 36 meses, mini gráfico e origem do recebimento.
 */
export async function renderShareImage(d: ShareImageData): Promise<Blob> {
  await Promise.all([
    document.fonts.load(`800 120px ${INTER}`),
    document.fonts.load(`600 26px ${INTER}`),
    document.fonts.load(`700 40px ${SANS}`),
    document.fonts.load(`600 28px ${SANS}`),
    document.fonts.load(`500 26px ${SANS}`),
  ]).catch(() => undefined)
  const [cardBg, isotipo] = await Promise.all([loadImage(IMAGES.greenCard).catch(() => null), loadImage(ICONS.logoIsotipo).catch(() => null)])

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, W, H)

  /* ---------- Marca ---------- */
  ctx.fillStyle = C.green
  ctx.beginPath()
  ctx.roundRect(PAD, PAD, 76, 76, 20)
  ctx.fill()
  if (isotipo) ctx.drawImage(isotipo, PAD + 38 - 15, PAD + 38 - 21, 30, 42)
  text(ctx, 'iGreen Mob', PAD + 100, PAD + 34, `700 36px ${SANS}`, C.strong)
  text(ctx, 'Simulação de eletroposto', PAD + 100, PAD + 70, `500 26px ${SANS}`, C.muted)

  /* ---------- Card verde ---------- */
  const heroY = 204
  const heroH = 360
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(PAD, heroY, W - PAD * 2, heroH, 36)
  ctx.clip()
  ctx.fillStyle = C.greenDark
  ctx.fillRect(PAD, heroY, W - PAD * 2, heroH)
  if (cardBg) {
    const scale = Math.max((W - PAD * 2) / cardBg.width, heroH / cardBg.height)
    const iw = cardBg.width * scale
    const ih = cardBg.height * scale
    ctx.drawImage(cardBg, PAD + (W - PAD * 2 - iw) / 2, heroY + (heroH - ih) / 2, iw, ih)
  }
  ctx.restore()

  const hx = PAD + 52
  text(ctx, 'RECEBIMENTO ESTIMADO NO MÊS 1', hx, heroY + 78, `600 26px ${INTER}`, C.highlight)
  const { int, cents } = moneyParts(d.recebimento)
  const intW = text(ctx, `R$ ${int}`, hx, heroY + 196, `800 112px ${INTER}`, '#ffffff')
  text(ctx, `,${cents}`, hx + intW + 4, heroY + 196, `700 56px ${INTER}`, 'rgba(255,255,255,0.55)')
  let px = hx
  px += pill(ctx, `${d.modelo} · ${d.potencia}`, px, heroY + 250) + 12
  px += pill(ctx, `Investimento ${money(d.investimento)}`, px, heroY + 250) + 12
  if (px + 200 < W - PAD - 40) pill(ctx, d.sociedade, px, heroY + 250)

  /* ---------- Retorno · saldo · ROI ---------- */
  const statY = 600
  const statW = (W - PAD * 2 - 32) / 3
  ;[
    ['RETORNO', paybackLabel(d.payback)],
    ['SALDO EM 36 MESES', compactMoney(d.net36)],
    ['ROI EM 36 MESES', pct(d.roi36, 0)],
  ].forEach(([label, value], i) => {
    const x = PAD + i * (statW + 16)
    ctx.fillStyle = C.muted2
    ctx.beginPath()
    ctx.roundRect(x, statY, statW, 150, 24)
    ctx.fill()
    text(ctx, label, x + 30, statY + 58, `600 22px ${SANS}`, C.muted)
    text(ctx, value, x + 30, statY + 108, `700 38px ${SANS}`, C.strong)
  })

  /* ---------- Mini gráfico do saldo ---------- */
  const chartTop = 820
  text(ctx, 'SALDO ACUMULADO EM 36 MESES', PAD, chartTop, `600 24px ${SANS}`, C.main)
  text(ctx, signedMoney(d.net36), W - PAD, chartTop, `700 30px ${SANS}`, C.strong, 'right')
  const gx = PAD
  const gy = chartTop + 36
  const gw = W - PAD * 2
  const gh = 190
  const min = Math.min(...d.saldo, 0)
  const max = Math.max(...d.saldo, 0)
  const last = d.saldo.length - 1
  const x = (i: number) => gx + 8 + (i / last) * (gw - 16)
  const y = (v: number) => gy + 12 + (1 - (v - min) / (max - min || 1)) * (gh - 24)
  ctx.strokeStyle = C.line
  ctx.lineWidth = 2
  ctx.setLineDash([8, 8])
  ctx.beginPath()
  ctx.moveTo(gx, y(0))
  ctx.lineTo(gx + gw, y(0))
  ctx.stroke()
  ctx.setLineDash([])
  ctx.beginPath()
  d.saldo.forEach((v, i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v))))
  const line = new Path2D()
  d.saldo.forEach((v, i) => (i ? line.lineTo(x(i), y(v)) : line.moveTo(x(i), y(v))))
  ctx.lineTo(x(last), y(0))
  ctx.lineTo(x(0), y(0))
  ctx.closePath()
  ctx.fillStyle = 'rgba(0,168,89,0.1)'
  ctx.fill()
  ctx.strokeStyle = C.green
  ctx.lineWidth = 5
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.stroke(line)
  ctx.fillStyle = C.green
  ctx.beginPath()
  ctx.arc(x(last), y(d.saldo[last]), 9, 0, Math.PI * 2)
  ctx.fill()
  if (d.payback != null) {
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = C.green
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.arc(x(d.payback), y(0), 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
  text(ctx, 'Investimento', gx, gy + gh + 34, `500 22px ${SANS}`, C.muted)
  if (d.payback != null) text(ctx, `retorno em ${paybackLabel(d.payback)}`, gx + gw / 2, gy + gh + 34, `600 22px ${SANS}`, C.main, 'center')
  text(ctx, '36 meses', gx + gw, gy + gh + 34, `500 22px ${SANS}`, C.muted, 'right')

  /* ---------- Origem do recebimento ---------- */
  let ry = 1108
  const row = (label: string, value: string, primary: boolean) => {
    ctx.fillStyle = primary ? C.greenSubtle : C.muted2
    ctx.beginPath()
    ctx.roundRect(PAD, ry, W - PAD * 2, 76, 20)
    ctx.fill()
    text(ctx, label, PAD + 30, ry + 48, `600 28px ${SANS}`, primary ? C.greenStrong : C.strong)
    text(ctx, value, W - PAD - 30, ry + 48, `700 28px ${SANS}`, primary ? C.greenStrong : C.strong, 'right')
    ry += 88
  }
  row('Recargas · líquido do investidor', signedMoney(d.recargas), false)
  if (d.carteira != null) row(`Carteira iGreen · ${d.clientes} clientes`, money(d.carteira), true)

  /* ---------- Rodapé ---------- */
  text(ctx, `Projeção estimada, sem garantia de retorno · Simule grátis em ${d.site}`, W / 2, H - 44, `500 22px ${SANS}`, C.muted, 'center')

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar a imagem'))), 'image/png'))
}
