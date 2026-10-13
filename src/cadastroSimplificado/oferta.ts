import { capacityFor, CHARGERS, type ChargerId } from '../gerador/model'
import { defaultsFor, FIXOS_V2, NOMES_V2 } from '../gerador/guided'
import { onlyDigits } from '../lib/format'

/*
 * Regras da oferta da live (#cadastro-simplificado): o mesmo produto do simulador, com preço,
 * entrada fixa paga na hora e o restante em parcelas mensais.
 */

export const ENTRADA = 9_997
export const PARCELAS = 4

export type Plano = { total: number; entrada: number; restante: number; parcelas: number; parcela: number }

/** Entrada fixa em todos os modelos; o que sobra do valor vira 4 parcelas (a Carga lenta já sai quitada na entrada) */
export function plano(id: ChargerId): Plano {
  const total = CHARGERS[id].price
  const entrada = Math.min(ENTRADA, total)
  const restante = total - entrada
  return { total, entrada, restante, parcelas: restante > 0 ? PARCELAS : 0, parcela: restante > 0 ? restante / PARCELAS : 0 }
}

export type Ficha = {
  nome: string
  potencia: string
  recarga: string
  simultaneos: number
  carrosDia: number
  sociedade: string
  taxa: string
}

const TECNICO: Record<ChargerId, { potencia: string; recarga: string; simultaneos: number }> = {
  lento: { potencia: '7 kW', recarga: 'Lenta (AC), 1 conector de 7 kW', simultaneos: 1 },
  duo: { potencia: '7 kW + 40 kW', recarga: 'Lenta (AC) e rápida (DC), 2 conectores', simultaneos: 2 },
  ultra: { potencia: '80 kW', recarga: 'Ultra rápida (DC)', simultaneos: 1 },
}

/** Especificações detalhadas de cada modelo (capacidade calculada com as premissas padrão do simulador) */
export function ficha(id: ChargerId): Ficha {
  const c = CHARGERS[id]
  return {
    nome: NOMES_V2[id],
    ...TECNICO[id],
    carrosDia: capacityFor({ ...defaultsFor('v2'), charger: id }).maxCars,
    sociedade: c.investorShare === 1 ? '100% do resultado é seu' : `Você ${c.investorShare * 100}%, iGreen ${c.igreenShare * 100}%`,
    taxa: `${FIXOS_V2.adminRate}% do faturamento`,
  }
}

export const INCLUSO = ['Equipamento', 'Instalação', 'Pintura', 'Licença iGreen', 'Conexões de energia, seguros e telecom']

/* ---------------- Cartão ---------------- */

export type Bandeira = 'Visa' | 'Mastercard' | 'Elo' | 'Amex' | 'Hipercard'

const ELO = /^(4011(78|79)|43(1274|8935)|45(1416|7393|763(1|2))|50(4175|6699|67[0-7]\d|9\d{3})|627780|63(6297|6368)|650(0(3[1-3]|[4-9]\d)|4[0-9]\d|5[0-2]\d)|6516(5[2-9]|[6-7]\d)|6550([0-1]\d|2[1-9]|[3-4]\d|5[0-8]))/

export function bandeira(numero: string): Bandeira | null {
  const n = onlyDigits(numero)
  if (ELO.test(n)) return 'Elo'
  if (/^(606282|3841)/.test(n)) return 'Hipercard'
  if (/^3[47]/.test(n)) return 'Amex'
  if (/^4/.test(n)) return 'Visa'
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(n)) return 'Mastercard'
  return null
}

/** Grupos de 4 (Amex: 4-6-5) */
export function maskCartao(v: string) {
  const n = onlyDigits(v)
  if (/^3[47]/.test(n)) {
    const d = n.slice(0, 15)
    return [d.slice(0, 4), d.slice(4, 10), d.slice(10)].filter(Boolean).join(' ')
  }
  return (n.slice(0, 19).match(/.{1,4}/g) ?? []).join(' ')
}

export const maskValidade = (v: string) => {
  const n = onlyDigits(v).slice(0, 4)
  return n.length > 2 ? `${n.slice(0, 2)}/${n.slice(2)}` : n
}

export function luhn(numero: string) {
  const n = onlyDigits(numero)
  if (n.length < 13 || n.length > 19) return false
  let soma = 0
  for (let i = 0; i < n.length; i++) {
    let d = Number(n[n.length - 1 - i])
    if (i % 2 === 1) {
      d *= 2
      if (d > 9) d -= 9
    }
    soma += d
  }
  return soma % 10 === 0
}

/** MM/AA válido e ainda dentro do mês de vencimento */
export function validadeOk(mmaa: string, hoje = new Date()) {
  const m = /^(\d{2})\/(\d{2})$/.exec(mmaa)
  if (!m) return false
  const mes = Number(m[1])
  const ano = 2000 + Number(m[2])
  if (mes < 1 || mes > 12) return false
  const fimDoMes = new Date(ano, mes, 0, 23, 59, 59)
  return fimDoMes >= hoje && ano <= hoje.getFullYear() + 20
}

export const cvvOk = (cvv: string, b: Bandeira | null) => onlyDigits(cvv).length === (b === 'Amex' ? 4 : 3)

/** Código Pix "copia e cola" de exemplo com o valor da entrada */
export function pixCopiaECola(pedido: string) {
  const valor = ENTRADA.toFixed(2)
  return `00020126580014BR.GOV.BCB.PIX0136a1f4c2e8-igreen-mob-${pedido.toLowerCase()}520400005303986540${valor.length}${valor}5802BR5913IGREEN MOB SA6009UBERLANDIA62070503***6304B7C1`
}

export const novoPedido = () =>
  Array.from({ length: 8 }, () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)]).join('')
