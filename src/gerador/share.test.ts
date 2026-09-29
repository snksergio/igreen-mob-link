import { describe, expect, it } from 'vitest'
import { money } from '../lib/format'
import { CLIENTES_DIA, clientesPorDia, defaultsFor } from './guided'
import { DEFAULTS, calculate, clampInputs } from './model'
import { readSimulationFile, sanitizeInputs, shareText } from './share'
import { buildSimulationDocument } from './simulationDoc'

const meta = { codigo: 'SIM-TESTE', geradoEm: new Date('2026-09-28T12:00:00Z'), responsavel: 'Juliana Martins', logoSvg: '' }
const documento = (inputs = DEFAULTS, extra: Partial<typeof meta> = {}) => buildSimulationDocument({ inputs, result: calculate(inputs), ...meta, ...extra })

/** Troca o JSON embutido no documento (simula alguém editando o arquivo) */
const adulterar = (html: string, fn: (payload: Record<string, any>) => void) =>
  html.replace(/(<script type="application\/json" id="igreen-mob-simulacao">)([\s\S]*?)(<\/script>)/, (_, a: string, json: string, c: string) => {
    const payload = JSON.parse(json)
    fn(payload)
    return a + JSON.stringify(payload).replace(/</g, '\\u003c') + c
  })

describe('documento da simulação', () => {
  it('guarda as premissas no próprio HTML e o importar lê de volta', () => {
    const inputs = { ...DEFAULTS, charger: 'ultra' as const, cars: 12, energyEnabled: false, sale: 2.5 }
    expect(readSimulationFile(documento(inputs))).toEqual({ inputs: clampInputs(inputs), divergente: false })
  })

  it('traz o essencial para analisar: recebimento, premissas, DRE e mês a mês', () => {
    const html = documento()
    for (const trecho of ['R$ 7.311', 'Recebido em 36 meses', 'CARROS POR DIA', 'PREÇO DE VENDA', 'Lucro disponível aos sócios', 'Mês a mês', 'SIM-TESTE', 'Juliana Martins']) {
      expect(html).toContain(trecho)
    }
  })

  it('não mostra retorno, ROI nem saldo descontando o investimento', () => {
    const html = documento(defaultsFor('v2'))
    const texto = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '')
    expect(texto).not.toMatch(/\bROI\b|[Rr]etorno|[Pp]ayback|[Ss]aldo/)
    // o bloco embutido também não guarda retorno nem saldo (somados ao recebido, revelariam o investimento)
    const embutido = html.match(/<script type="application\/json"[^>]*>([\s\S]*?)<\/script>/)![1]
    expect(embutido).not.toMatch(/retorno|saldo|payback|investment/i)
  })

  it('documento antigo (com retorno e saldo registrados) continua importando e conferindo', () => {
    const html = adulterar(documento(), (p) => {
      const r = calculate(DEFAULTS)
      p.resumo = { recebimentoMes1: p.resumo.recebimentoMes1, retornoMeses: r.payback, saldo36: r.net36 }
    })
    expect(readSimulationFile(html)).toEqual({ inputs: DEFAULTS, divergente: false })
    const mexido = adulterar(html, (p) => {
      p.resumo.saldo36 = 1
    })
    expect(readSimulationFile(mexido)?.divergente).toBe(true)
  })

  it('não mostra o valor do investimento e traz os clientes por dia', () => {
    const inputs = defaultsFor('v2')
    const html = documento(inputs)
    expect(html).not.toContain('Seu investimento')
    expect(html).not.toContain(money(calculate(inputs).capital.investor))
    expect(html).toContain('NOVOS CLIENTES POR DIA')
    expect(html).toContain('2 por dia · 60 por mês')
  })

  it('o texto do documento não quebra o JSON embutido', () => {
    expect(readSimulationFile(documento(DEFAULTS, { responsavel: '</script><b>x' }))?.inputs).toEqual(DEFAULTS)
  })
})

describe('importar protege contra documento editado', () => {
  it('aplica os limites dos campos', () => {
    const html = adulterar(documento(), (p) => Object.assign(p.inputs, { cars: 5000, share: 90, monthlyClients: -3, kwh: 0 }))
    const lido = readSimulationFile(html)!.inputs
    expect(lido.cars).toBe(calculate(lido).capacity.maxCars)
    expect(lido.share).toBe(20)
    expect(lido.monthlyClients).toBe(0)
    expect(lido.kwh).toBe(0.1)
  })

  it('ignora campos que não são editáveis no simulador e valores fora das opções', () => {
    const html = adulterar(documento(), (p) => Object.assign(p.inputs, { powerUse: 100, loss: 0, fixed: 999, localMode: 'isento', charger: 'turbo' }))
    const lido = readSimulationFile(html)!.inputs
    expect(lido.powerUse).toBe(DEFAULTS.powerUse)
    expect(lido.loss).toBe(DEFAULTS.loss)
    expect(lido.fixed).toBe(DEFAULTS.fixed)
    expect(lido.localMode).toBe(DEFAULTS.localMode)
    expect(lido.charger).toBe(DEFAULTS.charger)
  })

  it('recalcula e avisa quando os números do documento não batem com o cálculo atual', () => {
    const html = adulterar(documento(), (p) => {
      p.resumo.recebimentoMes1 = 99999
    })
    expect(readSimulationFile(html)).toEqual({ inputs: DEFAULTS, divergente: true })
  })
})

describe('importar outros formatos', () => {
  it('aceita o JSON das premissas', () => {
    expect(readSimulationFile(JSON.stringify({ inputs: { cars: 3, charger: 'lento' } }))?.inputs).toEqual(clampInputs({ ...DEFAULTS, cars: 3, charger: 'lento' }))
  })

  it('só aceita chaves editáveis, com o tipo e as opções certas', () => {
    expect(sanitizeInputs({ cars: '9', hack: 1, days: 20, charger: 42, hours: 12, incomeMode: 'charging' })).toEqual({ days: 20, incomeMode: 'charging' })
  })

  it('arquivo que não é uma simulação devolve null', () => {
    expect(readSimulationFile('<html><body>oi</body></html>')).toBeNull()
    expect(readSimulationFile('')).toBeNull()
    expect(readSimulationFile('[1,2]')).toBeNull()
    expect(readSimulationFile(JSON.stringify({ inputs: {} }))).toBeNull()
  })
})

describe('mensagem de compartilhamento', () => {
  it('traz modelo e recebimento, sem retorno nem link', () => {
    const text = shareText({ modelo: 'iGreen DUO', recebimento: 7311.47 })
    expect(text).toContain('iGreen DUO')
    expect(text).toContain('R$ 7.311')
    expect(text).not.toMatch(/retorno|ROI/i)
    expect(text).not.toMatch(/https?:\/\//)
  })
})

describe('clientes da carteira por dia (v2)', () => {
  it('cada modelo sugere a sua quantidade: 7 kW 1, DUO 2, Ultra 5', () => {
    expect(CLIENTES_DIA).toEqual({ lento: 1, duo: 2, ultra: 5 })
  })

  it('a v2 parte de 2 clientes por dia no DUO; a v1 continua com as premissas da referência', () => {
    expect(defaultsFor('v2').monthlyClients).toBe(2 * DEFAULTS.days)
    expect(clientesPorDia(defaultsFor('v2'))).toBe(2)
    expect(defaultsFor('v1')).toBe(DEFAULTS)
  })

  it('o limite do modelo comporta 20 clientes por dia em 31 dias', () => {
    expect(clampInputs({ ...DEFAULTS, days: 31, monthlyClients: 20 * 31 }).monthlyClients).toBe(620)
  })
})
