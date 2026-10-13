import { describe, expect, it } from 'vitest'
import { CENARIOS, aceitar, aceitarEntrega, assinarAditivo, assinarContrato, chamada, cpfConfere, diasEntre, etapaEmFoco, etapas, montarProposta, pagar, proximoPasso, recusar } from './data'

const hoje = new Date(2026, 9, 13)
const status = (c: Parameters<typeof montarProposta>[0]) => etapas(montarProposta(c, hoje), hoje).map((e) => e.status)

describe('andamento de cada cenário', () => {
  it('proposta enviada: só a proposta pede ação, o resto espera', () => {
    expect(status('nova')).toEqual(['atual', 'pendente', 'pendente', 'pendente', 'pendente', 'pendente'])
    expect(proximoPasso(montarProposta('nova', hoje), hoje).acao?.tipo).toBe('aceitar')
  })

  it('aceita: contrato para assinar e pagamento ainda bloqueado', () => {
    expect(status('contrato')).toEqual(['feito', 'atual', 'pendente', 'pendente', 'pendente', 'pendente'])
    const p = montarProposta('contrato', hoje)
    expect(p.pagamento.parcelas.every((x) => x.status === 'nao_gerada' && !x.vencimento)).toBe(true)
  })

  it('contrato assinado: entrada em aberto e as parcelas 2 a 5 ainda não geradas, com data de geração', () => {
    const p = montarProposta('pagamento', hoje)
    expect(status('pagamento')).toEqual(['feito', 'feito', 'atual', 'pendente', 'pendente', 'pendente'])
    expect(p.pagamento.parcelas.map((x) => x.status)).toEqual(['aberta', 'nao_gerada', 'nao_gerada', 'nao_gerada', 'nao_gerada'])
    expect(diasEntre(hoje, p.pagamento.parcelas[1].geraEm!)).toBe(22)
    expect(proximoPasso(p, hoje).acao).toMatchObject({ tipo: 'pagar', parcela: 'entrada' })
  })

  it('vistoria com aditivo pede a assinatura do aditivo', () => {
    expect(status('vistoria')).toEqual(['feito', 'feito', 'andamento', 'atual', 'pendente', 'pendente'])
    expect(proximoPasso(montarProposta('vistoria', hoje), hoje).acao?.tipo).toBe('aditivo')
  })

  it('parcela vencida aparece como vencida e vira o próximo passo', () => {
    const p = montarProposta('instalacao', hoje)
    expect(p.pagamento.parcelas.map((x) => x.status)).toEqual(['paga', 'paga', 'vencida', 'nao_gerada', 'nao_gerada'])
    expect(diasEntre(p.pagamento.parcelas[2].vencimento!, hoje)).toBeGreaterThan(0)
    expect(proximoPasso(p, hoje).acao).toMatchObject({ tipo: 'pagar', parcela: 'p3' })
    // no trilho, o pagamento fica em alerta e é a etapa que abre
    const lista = etapas(p, hoje)
    expect(lista[2]).toMatchObject({ status: 'atual', alerta: true, resumo: 'Parcela vencida' })
    expect(etapaEmFoco(lista)).toBe('pagamento')
  })

  it('entrega para aceite com a última parcela em aberto', () => {
    const p = montarProposta('entrega', hoje)
    expect(status('entrega')).toEqual(['feito', 'feito', 'andamento', 'feito', 'feito', 'atual'])
    expect(p.pagamento.parcelas.map((x) => x.status)).toEqual(['paga', 'paga', 'paga', 'paga', 'aberta'])
  })

  it('recusada abre na proposta e oferece falar com o licenciado', () => {
    const lista = etapas(montarProposta('recusada', hoje), hoje)
    expect(lista[0].status).toBe('recusado')
    expect(etapaEmFoco(lista)).toBe('proposta')
    expect(proximoPasso(montarProposta('recusada', hoje), hoje).acao?.tipo).toBe('whatsapp')
  })

  it('todos os cenários montam sem erro', () => {
    for (const c of CENARIOS) expect(() => etapas(montarProposta(c.value, hoje), hoje)).not.toThrow()
  })
})

describe('ações da página', () => {
  it('aceitar → assinar → pagar a entrada → vistoria agendada', () => {
    let p = aceitar(montarProposta('nova', hoje), hoje)
    expect(p.contrato.status).toBe('aguardando')
    p = assinarContrato(p, hoje)
    expect(p.pagamento.parcelas[0]).toMatchObject({ status: 'aberta' })
    expect(diasEntre(hoje, p.pagamento.parcelas[0].vencimento!)).toBe(3)
    p = pagar(p, 'entrada', hoje)
    expect(p.pagamento.parcelas[0].status).toBe('paga')
    expect(p.vistoria.status).toBe('agendada')
  })

  it('assinar o aditivo agenda a instalação; aceite fecha a entrega', () => {
    let p = assinarAditivo(montarProposta('vistoria', hoje), hoje)
    expect(p.vistoria.aditivo?.status).toBe('assinado')
    expect(p.obra.status).toBe('agendada')
    p = aceitarEntrega(montarProposta('entrega', hoje), hoje)
    expect(etapas(p, hoje)[5].status).toBe('feito')
  })

  it('recusar guarda o motivo e não altera a proposta original', () => {
    const original = montarProposta('nova', hoje)
    const p = recusar(original, 'Prefiro outro modelo', hoje)
    expect(p.resposta).toMatchObject({ status: 'recusada', motivo: 'Prefiro outro modelo' })
    expect(original.resposta.status).toBe('aguardando')
  })
})

describe('recusa', () => {
  it('CPF precisa ser válido e bater com o da proposta', () => {
    expect(cpfConfere('123.456.789-09', '123.***.***-09')).toBe(true)
    expect(cpfConfere('12345678909', '123.***.***-09')).toBe(true)
    expect(cpfConfere('529.982.247-25', '123.***.***-09')).toBe(false)
    expect(cpfConfere('123.456.789-00', '123.***.***-09')).toBe(false)
    expect(cpfConfere('123.456', '123.***.***-09')).toBe(false)
  })
})

describe('chamada do topo', () => {
  it('acompanha a etapa sem repetir os dados do card', () => {
    const destaque = (c: Parameters<typeof montarProposta>[0]) => {
      const x = chamada(montarProposta(c, hoje))
      return `${x.linha} ${x.destaque}`
    }
    expect(destaque('nova')).toBe('Proposta gerada com Sucesso!')
    expect(destaque('contrato')).toBe('Proposta aceita com sucesso!')
    expect(destaque('pagamento')).toBe('Contrato assinado com sucesso!')
    expect(destaque('vistoria')).toBe('Seu eletroposto está a caminho!')
    expect(destaque('instalacao')).toBe('Seu eletroposto está a caminho!')
    expect(destaque('entrega')).toBe('Seu eletroposto está pronto!')
    expect(chamada(montarProposta('recusada', hoje))).toMatchObject({ destaque: 'recusada', tom: 'erro' })
    expect(destaque('nova')).not.toContain('9E89C902')
  })
})
