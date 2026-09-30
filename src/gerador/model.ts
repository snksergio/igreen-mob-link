/**
 * Motor de cálculo do fluxo Gerador — port fiel do modelo do simulador de referência
 * ("Simulador de investimento e DRE | iGreen Mob", model.mjs). Mesmas fórmulas e nomes, com tipos.
 * Valores em reais por mês; percentuais em pontos (ex.: 1.65 = 1,65%).
 */

export type ChargerId = 'lento' | 'duo' | 'ultra'

export type Charger = {
  name: string
  /** potência total (DUO = 7 + 40 kW) */
  power: number
  /** investimento do investidor */
  price: number
  defaultCars: number
  investorShare: number
  igreenShare: number
}

export const CHARGERS: Record<ChargerId, Charger> = {
  lento: { name: 'iGreen Lento', power: 7, price: 9997, defaultCars: 3, investorShare: 1, igreenShare: 0 },
  duo: { name: 'iGreen DUO', power: 47, price: 59997, defaultCars: 7, investorShare: 0.8, igreenShare: 0.2 },
  ultra: { name: 'iGreen Ultra rápido', power: 80, price: 129900, defaultCars: 15, investorShare: 0.8, igreenShare: 0.2 },
}

export const CHARGER_IDS: ChargerId[] = ['lento', 'duo', 'ultra']

export const TERMS = {
  administration: 0.15,
  energyCommission: 0.04,
  insuranceCommission: 0.05,
  telecomCommission: 7,
  energyBill: 500,
  insuranceBill: 500,
}

export type IncomeMode = 'combined' | 'charging'
export type LocalMode = 'unset' | 'provision' | 'included'
export type CommissionMode = 'unset' | 'rate'

export type SimInputs = {
  charger: ChargerId
  cars: number
  kwh: number
  cost: number
  sale: number
  share: number
  days: number
  hours: number
  powerUse: number
  turnoverMinutes: number
  loss: number
  /** administração iGreen (taxa de sistema) sobre o faturamento, em pontos percentuais */
  adminRate: number
  fixed: number
  acShare: number
  monthlyClients: number
  incomeMode: IncomeMode
  energyEnabled: boolean
  insuranceEnabled: boolean
  telecomEnabled: boolean
  pisRate: number
  cofinsRate: number
  taxCredit: number
  pisExclusion: number
  localMode: LocalMode
  localRate: number
  commissionMode: CommissionMode
  commissionRate: number
  taxAdditions: number
}

export const DEFAULTS: SimInputs = {
  charger: 'duo',
  cars: CHARGERS.duo.defaultCars,
  kwh: 25,
  cost: 0.8,
  sale: 2.2,
  share: 0,
  days: 30,
  hours: 24,
  powerUse: 80,
  turnoverMinutes: 10,
  loss: 5,
  adminRate: TERMS.administration * 100,
  fixed: 0,
  acShare: 15,
  monthlyClients: 90,
  incomeMode: 'combined',
  energyEnabled: true,
  insuranceEnabled: true,
  telecomEnabled: true,
  pisRate: 1.65,
  cofinsRate: 7.6,
  taxCredit: 0,
  pisExclusion: 0,
  localMode: 'unset',
  localRate: 18,
  commissionMode: 'unset',
  commissionRate: 0,
  taxAdditions: 0,
}

type NumericKey = {
  [K in keyof SimInputs]: SimInputs[K] extends number ? K : never
}[keyof SimInputs]

/** [mínimo, máximo, inteiro?] */
export const LIMITS: Record<Exclude<NumericKey, never>, [number, number, boolean?]> = {
  cars: [1, 1000, true],
  kwh: [0.1, 500],
  cost: [0, 100],
  sale: [0, 100],
  share: [0, 20],
  days: [1, 31, true],
  hours: [1, 24],
  powerUse: [1, 100],
  turnoverMinutes: [0, 120],
  loss: [0, 50],
  adminRate: [0, 100],
  fixed: [0, 1e6],
  acShare: [0, 100],
  // até 20 clientes por dia × 31 dias (a v2 pergunta por dia; ver guided.ts)
  monthlyClients: [0, 620, true],
  pisRate: [0, 100],
  cofinsRate: [0, 100],
  taxCredit: [0, 1e7],
  pisExclusion: [0, 1e7],
  localRate: [0, 100],
  commissionRate: [0, 100],
  taxAdditions: [0, 1e7],
}

export function validate(s: SimInputs): string[] {
  const e: string[] = []
  if (!['combined', 'charging'].includes(s.incomeMode)) e.push('incomeMode')
  if (!CHARGERS[s.charger]) e.push('charger')
  if (!['unset', 'provision', 'included'].includes(s.localMode)) e.push('localMode')
  if (!['unset', 'rate'].includes(s.commissionMode)) e.push('commissionMode')
  for (const k of ['energyEnabled', 'insuranceEnabled', 'telecomEnabled'] as const) if (typeof s[k] !== 'boolean') e.push(k)
  for (const [k, [min, max, integer]] of Object.entries(LIMITS) as [NumericKey, [number, number, boolean?]][]) {
    const v = s[k]
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max || (integer && !Number.isInteger(v))) e.push(k)
  }
  return e
}

export type Recurrence = {
  perClient: number
  firstMonth: number
  periods: { months: number; clients: number; monthly: number; accumulated: number }[]
}

export function recurrenceProjection(s: SimInputs): Recurrence {
  assertValid(s)
  const perClient =
    (s.energyEnabled ? TERMS.energyBill * TERMS.energyCommission : 0) +
    (s.insuranceEnabled ? TERMS.insuranceBill * TERMS.insuranceCommission : 0) +
    (s.telecomEnabled ? TERMS.telecomCommission : 0)
  const firstMonth = s.monthlyClients * perClient
  return {
    perClient,
    firstMonth,
    periods: [12, 60, 120].map((months) => ({
      months,
      clients: s.monthlyClients * months,
      monthly: firstMonth * months,
      accumulated: (firstMonth * months * (months + 1)) / 2,
    })),
  }
}

export function profitTaxes(base: number) {
  const taxable = Math.max(0, base)
  return { irpj: taxable * 0.15, additionalIrpj: Math.max(0, taxable - 20000) * 0.1, csll: taxable * 0.09 }
}

type PaybackKey = 'totalInvestor' | 'investorRechargeCash'

export function cumulativePayback(months: MonthRow[], investment: number, key: PaybackKey): number | null {
  let accumulated = 0
  for (const m of months) {
    const previous = accumulated
    accumulated += m[key]
    if (accumulated >= investment && m[key] > 0) return m.month - 1 + (investment - previous) / m[key]
  }
  return null
}

export function capitalStructure(chargerId: ChargerId) {
  const investor = CHARGERS[chargerId].price
  const total = investor / CHARGERS[chargerId].investorShare
  return { investor, total, igreen: total - investor }
}

export type Capacity = {
  acCars: number
  dcCars: number
  acHours: number
  dcHours: number
  requiredHours: number
  maxCars: number
  acSession: number
  dcSession: number
  singleSession: number
  utilization: number
  feasible: boolean
}

export function capacityFor(s: SimInputs): Capacity {
  const factor = s.powerUse / 100
  const interval = s.turnoverMinutes / 60
  const acSession = s.kwh / (7 * factor) + interval
  const dcSession = s.kwh / (40 * factor) + interval
  const singleSession = s.kwh / (CHARGERS[s.charger].power * factor) + interval
  const load = (cars: number) => {
    if (s.charger === 'duo') {
      const acCars = Math.round((cars * s.acShare) / 100)
      const dcCars = cars - acCars
      const acHours = acCars * acSession
      const dcHours = dcCars * dcSession
      return { acCars, dcCars, acHours, dcHours, requiredHours: Math.max(acHours, dcHours) }
    }
    return {
      acCars: s.charger === 'lento' ? cars : 0,
      dcCars: s.charger === 'ultra' ? cars : 0,
      acHours: 0,
      dcHours: 0,
      requiredHours: cars * singleSession,
    }
  }
  let maxCars = 0
  for (let cars = 1; cars <= LIMITS.cars[1]; cars++) {
    if (load(cars).requiredHours > s.hours + 1e-9) break
    maxCars = cars
  }
  const current = load(s.cars)
  return {
    ...current,
    maxCars,
    acSession,
    dcSession,
    singleSession,
    utilization: current.requiredHours / s.hours,
    feasible: current.requiredHours <= s.hours + 1e-9,
  }
}

export type MonthRow = {
  revenue: number
  energy: number
  purchased: number
  administration: number
  pis: number
  cofins: number
  creditUsed: number
  federalRevenueTax: number
  localTax: number
  netRevenue: number
  fixed: number
  beforeRent: number
  rent: number
  ebitda: number
  ebt: number
  irpj: number
  additionalIrpj: number
  csll: number
  netProfit: number
  distributions: number
  cashAfterTax: number
  investorDistribution: number
  igreenDistribution: number
  investorContribution: number
  investorRechargeCash: number
  month: number
  clients: number
  energyClients: number
  insuranceClients: number
  telecomClients: number
  energyCommission: number
  insuranceCommission: number
  telecomCommission: number
  commissionGross: number
  commissionTax: number
  commissionNet: number
  totalInvestor: number
  accumulated: number
  netAccumulated: number
  chargingNetAccumulated: number
}

export type SimResult = {
  charger: Charger
  investment: number
  capital: ReturnType<typeof capitalStructure>
  capacity: Capacity
  maxCars: number
  newClients: number
  dailyKwh: number
  delivered: number
  purchased: number
  acHours: number
  dcHours: number
  requiredHours: number
  utilization: number
  feasible: boolean
  newEnergyClients: number
  newInsuranceClients: number
  newTelecomClients: number
  months: MonthRow[]
  payback: number | null
  chargingPayback: number | null
  localTaxPending: boolean
  commissionTaxPending: boolean
  net36: number
  roi36: number
}

function assertValid(s: SimInputs) {
  const errors = validate(s)
  if (errors.length) throw new RangeError('Campos inválidos: ' + errors.join(', '))
}

export function calculate(s: SimInputs): SimResult {
  assertValid(s)
  const charger = CHARGERS[s.charger]
  const investment = charger.price
  const dailyKwh = s.cars * s.kwh
  const delivered = dailyKwh * s.days
  const purchased = delivered / (1 - s.loss / 100)
  const capacity = capacityFor(s)
  const { acHours, dcHours, requiredHours, utilization, feasible, maxCars } = capacity
  const revenue = delivered * s.sale
  const energy = purchased * s.cost
  const administration = revenue * (s.adminRate / 100)
  const pisBase = Math.max(0, revenue - s.pisExclusion)
  const pis = (pisBase * s.pisRate) / 100
  const cofins = (pisBase * s.cofinsRate) / 100
  const creditUsed = Math.min(s.taxCredit, pis + cofins)
  const federalRevenueTax = pis + cofins - creditUsed
  const localTax = s.localMode === 'provision' ? (revenue * s.localRate) / 100 : 0
  const netRevenue = revenue - federalRevenueTax - localTax
  const beforeRent = netRevenue - energy - administration - s.fixed
  const ebitda = beforeRent
  const ebt = ebitda
  const taxes = profitTaxes(ebt + s.taxAdditions)
  const netProfit = ebt - taxes.irpj - taxes.additionalIrpj - taxes.csll
  const cashAfterTax = netProfit
  const rent = (Math.max(0, netProfit) * s.share) / 100
  const distributions = Math.max(0, netProfit) - rent
  const investorDistribution = distributions * charger.investorShare
  const igreenDistribution = distributions * charger.igreenShare
  const investorContribution = Math.max(0, -cashAfterTax) * charger.investorShare
  const investorRechargeCash = investorDistribution - investorContribution
  const newEnergyClients = s.energyEnabled ? s.monthlyClients : 0
  const newInsuranceClients = s.insuranceEnabled ? s.monthlyClients : 0
  const newTelecomClients = s.telecomEnabled ? s.monthlyClients : 0
  const newClients = s.energyEnabled || s.insuranceEnabled || s.telecomEnabled ? s.monthlyClients : 0
  const base = {
    revenue,
    energy,
    purchased,
    administration,
    pis,
    cofins,
    creditUsed,
    federalRevenueTax,
    localTax,
    netRevenue,
    fixed: s.fixed,
    beforeRent,
    rent,
    ebitda,
    ebt,
    ...taxes,
    netProfit,
    distributions,
    cashAfterTax,
    investorDistribution,
    igreenDistribution,
    investorContribution,
    investorRechargeCash,
  }
  let accumulated = 0
  let accumulatedCharging = 0
  const months: MonthRow[] = Array.from({ length: 36 }, (_, i) => {
    const month = i + 1
    const clients = newClients * month
    const energyClients = newEnergyClients * month
    const insuranceClients = newInsuranceClients * month
    const telecomClients = newTelecomClients * month
    const energyCommission = energyClients * TERMS.energyBill * TERMS.energyCommission
    const insuranceCommission = insuranceClients * TERMS.insuranceBill * TERMS.insuranceCommission
    const telecomCommission = telecomClients * TERMS.telecomCommission
    const commissionGross = energyCommission + insuranceCommission + telecomCommission
    const commissionTax = s.commissionMode === 'rate' ? (commissionGross * s.commissionRate) / 100 : 0
    const commissionNet = commissionGross - commissionTax
    const totalInvestor = investorRechargeCash + commissionNet
    accumulated += totalInvestor
    accumulatedCharging += investorRechargeCash
    return {
      ...base,
      month,
      clients,
      energyClients,
      insuranceClients,
      telecomClients,
      energyCommission,
      insuranceCommission,
      telecomCommission,
      commissionGross,
      commissionTax,
      commissionNet,
      totalInvestor,
      accumulated,
      netAccumulated: accumulated - investment,
      chargingNetAccumulated: accumulatedCharging - investment,
    }
  })
  const payback = feasible ? cumulativePayback(months, investment, 'totalInvestor') : null
  const chargingPayback = feasible ? cumulativePayback(months, investment, 'investorRechargeCash') : null
  return {
    charger,
    investment,
    capital: capitalStructure(s.charger),
    capacity,
    maxCars,
    newClients,
    dailyKwh,
    delivered,
    purchased,
    acHours,
    dcHours,
    requiredHours,
    utilization,
    feasible,
    newEnergyClients,
    newInsuranceClients,
    newTelecomClients,
    months,
    payback,
    chargingPayback,
    localTaxPending: s.localMode === 'unset',
    commissionTaxPending: s.commissionMode === 'unset' && (newEnergyClients > 0 || newInsuranceClients > 0 || newTelecomClients > 0),
    net36: months[35].netAccumulated,
    roi36: (months[35].netAccumulated / investment) * 100,
  }
}

export type PeriodView = 'month' | 'year'

/** Chaves que não somam na visão anual (contagens e acumulados usam o último mês) */
const NON_SUM_KEYS = new Set(['month', 'clients', 'energyClients', 'insuranceClients', 'telecomClients', 'accumulated', 'netAccumulated', 'chargingNetAccumulated'])

export function periodResult(r: SimResult, view: PeriodView, month: number, year: number): MonthRow {
  if (!['month', 'year'].includes(view) || !Number.isInteger(month) || month < 1 || month > 36 || !Number.isInteger(year) || year < 1 || year > 3) {
    throw new RangeError('Período inválido')
  }
  if (view === 'month') return { ...r.months[month - 1] }
  const selected = r.months.slice((year - 1) * 12, year * 12)
  const result = { ...selected[selected.length - 1] }
  for (const k of Object.keys(result) as (keyof MonthRow)[]) {
    if (NON_SUM_KEYS.has(k)) continue
    result[k] = selected.reduce((total, m) => total + m[k], 0)
  }
  return result
}

export type Scenario = { period: MonthRow; receipt: number; net36: number; roi36: number; payback: number | null }

export function scenarioResult(r: SimResult, mode: IncomeMode, view: PeriodView = 'month', month = 1, year = 1): Scenario {
  if (!['combined', 'charging'].includes(mode)) throw new RangeError('Cenário inválido')
  const period = periodResult(r, view, month, year)
  const combined = mode === 'combined'
  const receipt = combined ? period.totalInvestor : period.investorRechargeCash
  const net36 = combined ? r.net36 : r.months[35].chargingNetAccumulated
  return { period, receipt, net36, roi36: (net36 / r.investment) * 100, payback: combined ? r.payback : r.chargingPayback }
}

/**
 * Deixa as entradas sempre válidas para o cálculo: aplica os limites (arredondando as inteiras)
 * e, se os carros/dia passarem do limite de capacidade, usa o limite.
 */
export function clampInputs(s: SimInputs): SimInputs {
  const next = { ...s }
  for (const [k, [min, max, integer]] of Object.entries(LIMITS) as [NumericKey, [number, number, boolean?]][]) {
    let v = Number(next[k])
    if (!Number.isFinite(v)) v = DEFAULTS[k]
    v = Math.min(max, Math.max(min, v))
    next[k] = integer ? Math.round(v) : v
  }
  if (!CHARGERS[next.charger]) next.charger = DEFAULTS.charger
  const max = capacityFor(next).maxCars
  if (max >= 1 && next.cars > max) next.cars = max
  return next
}
