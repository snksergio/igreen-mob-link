import { describe, expect, it } from 'vitest'
import { CHARGERS, DEFAULTS, calculate, capacityFor, clampInputs, recurrenceProjection, scenarioResult } from './model'

// Valores conferidos no simulador de referência (igreen-mob-retorno), cenário padrão
describe('cenário padrão (DUO)', () => {
  const r = calculate(DEFAULTS)
  const m1 = r.months[0]

  it('DRE do mês 1', () => {
    expect(m1.revenue).toBeCloseTo(11550, 2)
    expect(m1.administration).toBeCloseTo(1732.5, 2)
    expect(m1.pis).toBeCloseTo(190.575, 3)
    expect(m1.cofins).toBeCloseTo(877.8, 2)
    expect(m1.energy).toBeCloseTo(4421.05, 2)
    expect(m1.beforeRent).toBeCloseTo(4328.07, 2)
    expect(m1.irpj).toBeCloseTo(649.21, 2)
    expect(m1.csll).toBeCloseTo(389.53, 2)
    expect(m1.netProfit).toBeCloseTo(3289.34, 2)
    expect(m1.investorRechargeCash).toBeCloseTo(2631.47, 2)
    expect(m1.igreenDistribution).toBeCloseTo(657.87, 2)
  })

  it('carteira e total do mês 1', () => {
    expect(m1.commissionGross).toBeCloseTo(4680, 2)
    expect(m1.totalInvestor).toBeCloseTo(7311.47, 2)
  })

  it('retorno e 36 meses', () => {
    expect(r.payback).toBeCloseTo(4.1, 1)
    expect(r.net36).toBeCloseTo(3151615.85, 2)
    expect(Math.round(r.roi36)).toBe(5253)
  })

  it('capacidade', () => {
    const c = capacityFor(DEFAULTS)
    expect(c.utilization).toBeCloseTo(0.237, 3)
    expect(c.maxCars).toBe(30)
  })

  it('recorrência de 10 anos', () => {
    const p = recurrenceProjection(DEFAULTS)
    expect(p.firstMonth).toBe(4680)
    expect(p.periods.map((x) => x.accumulated)).toEqual([365040, 8564400, 33976800])
  })
})

describe('outros cenários', () => {
  it('Lento: 100% do investidor', () => {
    const r = calculate({ ...DEFAULTS, charger: 'lento', cars: CHARGERS.lento.defaultCars })
    expect(r.capital.total).toBe(9997)
    expect(r.months[0].igreenDistribution).toBe(0)
  })

  it('adicional de IRPJ acima de R$ 20 mil', () => {
    const r = calculate({ ...DEFAULTS, charger: 'ultra', cars: 40, kwh: 40, sale: 3 })
    const m = r.months[0]
    expect(m.additionalIrpj).toBeCloseTo(Math.max(0, m.ebt - 20000) * 0.1, 6)
    expect(m.additionalIrpj).toBeGreaterThan(0)
  })

  it('repasse de 20% ao ponto', () => {
    const m = calculate({ ...DEFAULTS, share: 20 }).months[0]
    expect(m.rent).toBeCloseTo(m.netProfit * 0.2, 6)
  })

  it('só recargas usa o payback de recargas', () => {
    const r = calculate(DEFAULTS)
    expect(scenarioResult(r, 'charging').payback).toBe(r.chargingPayback)
  })

  it('visão anual soma o ano', () => {
    const r = calculate(DEFAULTS)
    const y1 = scenarioResult(r, 'combined', 'year', 1, 1).period
    expect(y1.revenue).toBeCloseTo(11550 * 12, 2)
  })

  it('clampInputs ajusta carros ao limite de capacidade', () => {
    const s = clampInputs({ ...DEFAULTS, cars: 999 })
    expect(s.cars).toBe(capacityFor(s).maxCars)
  })
})
