import { describe, expect, it } from 'vitest'
import { bandeira, cvvOk, ENTRADA, ficha, luhn, maskCartao, maskValidade, plano, validadeOk } from './oferta'

describe('plano de pagamento', () => {
  it('entrada fixa de R$ 9.997 e o restante em 4 parcelas', () => {
    expect(plano('duo')).toEqual({ total: 59_997, entrada: ENTRADA, restante: 50_000, parcelas: 4, parcela: 12_500 })
    expect(plano('ultra')).toMatchObject({ total: 129_900, entrada: 9_997, parcelas: 4, parcela: 29_975.75 })
  })

  it('Carga lenta sai quitada na entrada, sem parcelas', () => {
    expect(plano('lento')).toEqual({ total: 9_997, entrada: 9_997, restante: 0, parcelas: 0, parcela: 0 })
  })
})

describe('ficha do modelo', () => {
  it('usa os nomes e a capacidade do simulador', () => {
    expect(ficha('lento')).toMatchObject({ nome: 'Carga lenta', carrosDia: 5, sociedade: '100% do resultado é seu' })
    expect(ficha('duo')).toMatchObject({ nome: 'Carga rápida', kw: '7 + 40', carrosDia: 30, simultaneos: 2, sociedade: 'Você 80%, iGreen 20%', selo: 'Sociedade 80/20' })
    expect(ficha('ultra')).toMatchObject({ nome: 'Carga ultra rápida', carrosDia: 43, taxa: '14% do faturamento' })
  })
})

describe('cartão', () => {
  it('reconhece a bandeira', () => {
    expect(bandeira('4111 1111 1111 1111')).toBe('Visa')
    expect(bandeira('5555 5555 5555 4444')).toBe('Mastercard')
    expect(bandeira('3782 822463 10005')).toBe('Amex')
    expect(bandeira('6362 9700 0045 7013')).toBe('Elo')
    expect(bandeira('9999')).toBeNull()
  })

  it('formata número e validade', () => {
    expect(maskCartao('4111111111111111')).toBe('4111 1111 1111 1111')
    expect(maskCartao('378282246310005')).toBe('3782 822463 10005')
    expect(maskValidade('1229')).toBe('12/29')
    expect(maskValidade('1')).toBe('1')
  })

  it('confere o dígito (Luhn), a validade e o CVV', () => {
    expect(luhn('4111 1111 1111 1111')).toBe(true)
    expect(luhn('4111 1111 1111 1112')).toBe(false)
    const hoje = new Date(2026, 9, 13)
    expect(validadeOk('10/26', hoje)).toBe(true)
    expect(validadeOk('09/26', hoje)).toBe(false)
    expect(validadeOk('13/27', hoje)).toBe(false)
    expect(cvvOk('123', 'Visa')).toBe(true)
    expect(cvvOk('123', 'Amex')).toBe(false)
  })
})
