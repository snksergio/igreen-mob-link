import { describe, expect, it } from 'vitest'
import { CAMPOS_V2, secoesPreenchidas } from './guided'

describe('seções do formulário v2', () => {
  it('nada preenchido: só a primeira seção', () => {
    expect(secoesPreenchidas([])).toBe(0)
  })

  it('libera a próxima só com todos os campos da anterior', () => {
    expect(secoesPreenchidas(['charger'])).toBe(1)
    expect(secoesPreenchidas(['charger', 'cars', 'kwh'])).toBe(1)
    expect(secoesPreenchidas(['charger', 'cars', 'kwh', 'days'])).toBe(2)
  })

  it('preencher fora de ordem não pula seção', () => {
    expect(secoesPreenchidas(['cost', 'sale', 'monthlyClients'])).toBe(0)
  })

  it('tudo preenchido: as 4 seções obrigatórias', () => {
    expect(secoesPreenchidas(CAMPOS_V2)).toBe(4)
  })
})
