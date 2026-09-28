import { describe, expect, it } from 'vitest'
import { DEFAULTS } from './model'
import { decodeSim, encodeSim, shareText } from './share'

describe('link de compartilhamento da simulação', () => {
  it('guarda só o que difere do padrão e volta igual', () => {
    const inputs = { ...DEFAULTS, charger: 'ultra' as const, cars: 12, energyEnabled: false, sale: 2.5 }
    const encoded = encodeSim(inputs)
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(decodeSim(encoded)).toEqual({ charger: 'ultra', cars: 12, energyEnabled: false, sale: 2.5 })
  })

  it('simulação padrão vira um código curto e volta vazia', () => {
    const encoded = encodeSim(DEFAULTS)
    expect(encoded.length).toBeLessThan(8)
    expect(decodeSim(encoded)).toEqual({})
  })

  it('ignora chaves desconhecidas e tipos errados', () => {
    const raw = btoa(JSON.stringify({ cars: '9', hack: 1, days: 20, charger: 42 })).replace(/=+$/, '')
    expect(decodeSim(raw)).toEqual({ days: 20 })
  })

  it('código inválido devolve null', () => {
    expect(decodeSim('%%%')).toBeNull()
    expect(decodeSim('')).toBeNull()
    expect(decodeSim(btoa('[1,2]'))).toBeNull()
  })

  it('texto para WhatsApp traz modelo, recebimento, retorno e o link', () => {
    const text = shareText({ modelo: 'iGreen DUO', recebimento: 7311.47, payback: 4.1, url: 'https://x.test/#gerador2/visualizar?d=e30' })
    expect(text).toContain('iGreen DUO')
    expect(text).toContain('R$ 7.311')
    expect(text).toContain('4,1 meses')
    expect(text).toContain('https://x.test/#gerador2/visualizar?d=e30')
  })
})
