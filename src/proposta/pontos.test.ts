import { describe, expect, it } from 'vitest'
import {
  CENARIOS,
  CENARIOS_V3,
  agendarVistorias,
  alternarUnidade,
  chamada,
  enviarPontos,
  errosPonto,
  etapas,
  isCenario,
  montarProposta,
  novoPonto,
  pagar,
  pendencias,
  pontoInicial,
  proximoPasso,
  semPonto,
  type Ponto,
} from './data'

const hoje = new Date(2026, 9, 21)
const v3 = (c: Parameters<typeof montarProposta>[0]) => montarProposta(c, hoje, 'v3')
const vistoriaDe = (c: Parameters<typeof montarProposta>[0]) => etapas(v3(c), hoje).find((e) => e.id === 'vistoria')

const completo = (pt: Ponto): Ponto => ({
  ...pt,
  endereco: { cep: '38400-100', logradouro: 'Rua Tiradentes', bairro: 'Centro', cidade: 'Uberlândia', uf: 'MG', numero: '250', complemento: '' },
})

describe('compra com vários carregadores (#proposta-v3)', () => {
  it('um de cada modelo: total somado, entrada fixa e 4 parcelas', () => {
    const p = v3('nova')
    expect(p.unidades?.map((u) => u.nome)).toEqual(['Mob', 'Mob Fast', 'Mob Ultra Fast'])
    expect(p.pagamento.total).toBe(199_894)
    expect(p.pagamento.parcelas.map((x) => x.valor)).toEqual([9_997, 47_474.25, 47_474.25, 47_474.25, 47_474.25])
  })

  it('o primeiro modelo continua com 1 carregador e sem os cenários de pontos', () => {
    const p = montarProposta('vistoria', hoje)
    expect(p.unidades).toBeUndefined()
    expect(p.pagamento.total).toBe(129_900)
    expect(isCenario('distribuir')).toBe(false)
    expect(isCenario('distribuir', CENARIOS_V3)).toBe(true)
    expect(CENARIOS_V3).toHaveLength(CENARIOS.length + 2)
  })

  it('entrada paga: todos os carregadores no Ponto 1 e o próximo passo é distribuir', () => {
    const p = v3('distribuir')
    expect(p.pontos).toHaveLength(1)
    expect(p.pontos![0].unidades).toEqual(['u1', 'u2', 'u3'])
    expect(vistoriaDe('distribuir')).toMatchObject({ status: 'atual', resumo: 'Indicar os pontos' })
    expect(proximoPasso(p, hoje)).toMatchObject({ etapa: 'vistoria', titulo: 'Distribua seus 3 carregadores', acao: { tipo: 'distribuir' } })
    expect(`${chamada(p).linha} ${chamada(p).destaque}`).toBe('Entrada paga com sucesso!')
  })

  it('pagar a entrada leva à distribuição (no primeiro modelo, direto à vistoria agendada)', () => {
    expect(pagar(v3('pagamento'), 'entrada', hoje).vistoria.status).toBe('distribuir')
    expect(pagar(montarProposta('pagamento', hoje), 'entrada', hoje).vistoria.status).toBe('agendada')
  })
})

describe('montar os pontos', () => {
  const unidades = v3('distribuir').unidades!

  it('marcar um carregador em outro ponto tira ele do ponto anterior', () => {
    let pontos = [pontoInicial(unidades)]
    pontos = [...pontos, novoPonto(pontos)]
    pontos = alternarUnidade(pontos, 'pt2', 'u3')
    expect(pontos.map((pt) => pt.unidades)).toEqual([['u1', 'u2'], ['u3']])
    pontos = alternarUnidade(pontos, 'pt2', 'u3')
    expect(semPonto(unidades, pontos).map((u) => u.id)).toEqual(['u3'])
  })

  it('pede CEP e número; nome do ponto, e-mail e documento do contato são opcionais', () => {
    const pt = pontoInicial(unidades)
    expect(errosPonto(pt)).toEqual({ cep: 'Informe o CEP do ponto' })
    expect(errosPonto({ ...completo(pt), endereco: { ...completo(pt).endereco, numero: '' } })).toEqual({ numero: 'Informe o número' })
    expect(errosPonto(completo(pt))).toEqual({})
    const outro = { nome: 'Marcos Andrade', telefone: '(34) 99123-4567', email: '', documento: '' }
    expect(errosPonto({ ...completo(pt), contato: outro })).toEqual({})
    expect(errosPonto({ ...completo(pt), contato: { ...outro, telefone: '(31) 0012', email: 'x@', documento: '697.04' } })).toEqual({
      contatoTelefone: 'Informe um telefone com DDD',
      contatoEmail: 'E-mail inválido',
      contatoDocumento: 'CPF com 11 ou CNPJ com 14 dígitos',
    })
  })

  it('lista o que falta e só envia com tudo distribuído e completo', () => {
    const p = v3('distribuir')
    const pontos = [completo(pontoInicial(unidades)), novoPonto([pontoInicial(unidades)])]
    expect(pendencias(unidades, pontos)).toEqual(['um carregador no Ponto 2', 'o endereço do Ponto 2'])
    expect(pendencias(unidades, [{ ...completo(pontoInicial(unidades)), unidades: ['u1'] }])).toEqual(['um ponto para os carregadores Mob Fast e Mob Ultra Fast'])
    expect(enviarPontos(p, pontos)).toBe(p)
    const ok = enviarPontos(p, [completo(pontoInicial(unidades))])
    expect(ok.vistoria.status).toBe('agendando')
    expect(ok.pontos![0].vistoria?.status).toBe('agendando')
    expect(proximoPasso(ok, hoje).titulo).toBe('Vistoria em agendamento')
  })

  it('pontos enviados: vistoria em agendamento e, depois, uma data por ponto', () => {
    expect(vistoriaDe('pontos')).toMatchObject({ status: 'andamento', resumo: 'Em agendamento' })
    const agendada = agendarVistorias(v3('pontos'), hoje)
    expect(agendada.pontos!.map((pt) => pt.vistoria?.status)).toEqual(['agendada', 'agendada'])
    expect(agendada.vistoria.status).toBe('agendada')
  })

  it('vistoria feita: cada ponto com a sua data e o aditivo ligado ao ponto que precisou', () => {
    const p = v3('vistoria')
    expect(p.pontos!.every((pt) => pt.vistoria?.status === 'concluida')).toBe(true)
    expect(p.vistoria.aditivo?.ponto).toBe('pt2')
    expect(`${chamada(p).linha} ${chamada(p).destaque}`).toBe('Seus eletropostos estão a caminho!')
  })
})
