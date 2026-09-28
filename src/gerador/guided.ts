import { money } from '../lib/format'
import { fixed, num, pct } from './format'
import { DEFAULTS, TERMS, type SimInputs, type SimResult } from './model'

/* Dados do simulador guiado (v2) usados pelos passos, pelos resumos e pela visualização compartilhada */

export const POTENCIA = { lento: '7 kW', duo: '7 + 40 kW', ultra: '80 kW' } as const

export const CONEXOES = [
  { key: 'energyEnabled' as const, nome: 'Energia', valor: TERMS.energyBill * TERMS.energyCommission, detalhe: `${TERMS.energyCommission * 100}% de ${money(TERMS.energyBill)}` },
  { key: 'insuranceEnabled' as const, nome: 'Seguros', valor: TERMS.insuranceBill * TERMS.insuranceCommission, detalhe: `${TERMS.insuranceCommission * 100}% de ${money(TERMS.insuranceBill)}` },
  { key: 'telecomEnabled' as const, nome: 'Telecom', valor: TERMS.telecomCommission, detalhe: 'por linha' },
]

export const TAX_KEYS = ['pisRate', 'cofinsRate', 'taxCredit', 'pisExclusion', 'localMode', 'localRate', 'taxAdditions', 'commissionMode', 'commissionRate'] as const

export const taxCustom = (s: SimInputs) => TAX_KEYS.some((k) => s[k] !== DEFAULTS[k])

/* ================= Resumos (passo concluído) ================= */

export const RESUMOS: ((s: SimInputs, r: SimResult) => string)[] = [
  (s, r) => `${r.charger.name} · ${POTENCIA[s.charger]} · investimento ${money(r.capital.investor)}`,
  (s) => `${s.cars} ${s.cars === 1 ? 'carro' : 'carros'}/dia · ${s.days} dias/mês · ${num(s.kwh, 1)} kWh por recarga`,
  (s) => `Venda R$ ${fixed(s.sale)} · custo R$ ${fixed(s.cost)} por kWh · ponto ${pct(s.share, 0)}`,
  (s) => {
    const on = CONEXOES.filter((c) => s[c.key]).map((c) => c.nome)
    return s.monthlyClients && on.length ? `${s.monthlyClients} clientes/mês · ${on.join(', ')}` : 'Sem carteira'
  },
  (s) => (taxCustom(s) ? 'Tributos ajustados' : 'Premissas padrão · Lucro Real 2026'),
]
