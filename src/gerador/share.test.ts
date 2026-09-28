import { describe, expect, it } from 'vitest'
import { DEFAULTS, calculate } from './model'
import { readSimulationFile, sanitizeInputs, shareText } from './share'
import { buildSimulationDocument } from './simulationDoc'

const meta = { codigo: 'SIM-TESTE', geradoEm: new Date('2026-09-28T12:00:00Z'), responsavel: 'Juliana Martins', logoSvg: '' }

describe('documento da simulação', () => {
  it('guarda as premissas no próprio HTML e o importar lê de volta', () => {
    const inputs = { ...DEFAULTS, charger: 'ultra' as const, cars: 12, energyEnabled: false, sale: 2.5 }
    const html = buildSimulationDocument({ inputs, result: calculate(inputs), ...meta })
    expect(html).toContain('<!doctype html>')
    expect(readSimulationFile(html)).toEqual(inputs)
  })

  it('traz o essencial para analisar: recebimento, premissas, DRE e mês a mês', () => {
    const html = buildSimulationDocument({ inputs: DEFAULTS, result: calculate(DEFAULTS), ...meta })
    for (const trecho of ['R$ 7.311', '4,1 meses', 'CARROS POR DIA', 'PREÇO DE VENDA', 'Lucro disponível aos sócios', 'Mês a mês', 'SIM-TESTE', 'Juliana Martins']) {
      expect(html).toContain(trecho)
    }
  })

  it('o texto das premissas não quebra o JSON embutido', () => {
    const html = buildSimulationDocument({ inputs: DEFAULTS, result: calculate(DEFAULTS), ...meta, responsavel: '</script><b>x' })
    expect(readSimulationFile(html)).toEqual(DEFAULTS)
  })
})

describe('importar simulação', () => {
  it('aceita o JSON das premissas', () => {
    expect(readSimulationFile(JSON.stringify({ inputs: { cars: 9, charger: 'lento' } }))).toEqual({ cars: 9, charger: 'lento' })
  })

  it('ignora chaves desconhecidas e tipos errados', () => {
    expect(sanitizeInputs({ cars: '9', hack: 1, days: 20, charger: 42 })).toEqual({ days: 20 })
  })

  it('arquivo que não é uma simulação devolve null', () => {
    expect(readSimulationFile('<html><body>oi</body></html>')).toBeNull()
    expect(readSimulationFile('')).toBeNull()
    expect(readSimulationFile('[1,2]')).toBeNull()
    expect(readSimulationFile(JSON.stringify({ inputs: {} }))).toBeNull()
  })
})

describe('mensagem de compartilhamento', () => {
  it('traz modelo, recebimento e retorno, sem link', () => {
    const text = shareText({ modelo: 'iGreen DUO', recebimento: 7311.47, payback: 4.1 })
    expect(text).toContain('iGreen DUO')
    expect(text).toContain('R$ 7.311')
    expect(text).toContain('4,1 meses')
    expect(text).not.toMatch(/https?:\/\//)
  })
})
