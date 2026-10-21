/*
 * Proposta gerada (modelo novo, só local): dados de exemplo e as regras do andamento.
 * Os dados imitam o que o sistema enviaria. As datas são relativas a hoje para a prévia sempre parecer atual.
 * Nomes e documentos são fictícios.
 */

import type { Address } from '../services/address'
import { onlyDigits } from '../lib/format'
import { isValidCep, isValidCnpj, isValidCpf, isValidEmail, isValidPhone } from '../lib/validators'

export type Cenario = 'nova' | 'contrato' | 'pagamento' | 'distribuir' | 'muitos' | 'pontos' | 'vistoria' | 'instalacao' | 'entrega' | 'recusada'

/** Cenários da prévia (seletor de demonstração e `?cenario=` no endereço) do primeiro modelo (#proposta-v2) */
export const CENARIOS: { value: Cenario; label: string }[] = [
  { value: 'nova', label: 'Proposta enviada' },
  { value: 'contrato', label: 'Aceita, contrato para assinar' },
  { value: 'pagamento', label: 'Contrato assinado, entrada em aberto' },
  { value: 'vistoria', label: 'Vistoria com aditivo' },
  { value: 'instalacao', label: 'Instalação agendada, parcela vencida' },
  { value: 'entrega', label: 'Entrega para aceite' },
  { value: 'recusada', label: 'Proposta recusada' },
]

/** Versão 2 (#proposta-v3): compra com vários carregadores, distribuídos em pontos antes da vistoria */
export const CENARIOS_V3: { value: Cenario; label: string }[] = [
  ...CENARIOS.slice(0, 3),
  { value: 'distribuir', label: 'Entrada paga, distribuir carregadores' },
  { value: 'muitos', label: 'Entrada paga, 10 carregadores para distribuir' },
  { value: 'pontos', label: 'Pontos enviados, vistoria em agendamento' },
  ...CENARIOS.slice(3),
]

export const isCenario = (v: string | null, lista = CENARIOS): v is Cenario => lista.some((c) => c.value === v)

export type EtapaId = 'proposta' | 'contrato' | 'pagamento' | 'vistoria' | 'instalacao' | 'entrega'
export const ETAPAS: EtapaId[] = ['proposta', 'contrato', 'pagamento', 'vistoria', 'instalacao', 'entrega']

export type ParcelaStatus = 'paga' | 'aberta' | 'vencida' | 'nao_gerada'

export type Parcela = {
  id: string
  rotulo: string
  valor: number
  /** sem data enquanto o contrato não é assinado: vale a regra */
  vencimento?: Date
  regra: string
  status: ParcelaStatus
  pagaEm?: Date
  pagaCom?: 'Pix' | 'boleto' | 'cartão'
  /** quando o sistema gera a cobrança (10 dias antes do vencimento) */
  geraEm?: Date
  pix?: string
  boleto?: string
}

/** `ponto`: em qual ponto a vistoria pediu o aditivo (versão com pontos) */
export type Aditivo = { numero: number; titulo: string; motivo: string; valor: number; status: 'aguardando' | 'assinado'; assinadoEm?: Date; ponto?: string }

/** Carregador comprado: vem da compra e é distribuído num ponto (local de instalação) */
export type Unidade = { id: string; modelo: 'mob' | 'fast' | 'ultra'; nome: string; potencia: string; corrente: string; valor: number }

export type ContatoPonto = { nome: string; telefone: string; email: string; documento: string }

/**
 * Ponto: um local de instalação com um ou mais carregadores. `contato: null` usa o contato da proposta.
 * Cada ponto tem a sua vistoria.
 */
export type Ponto = {
  id: string
  nome: string
  unidades: string[]
  endereco: Address
  contato: ContatoPonto | null
  vistoria?: { status: 'agendando' | 'agendada' | 'concluida'; data?: Date }
}

export type Proposta = {
  numero: string
  emitidaEm: Date
  validaAte: Date
  resposta: { status: 'aguardando' | 'aceita' | 'recusada'; em?: Date; motivo?: string }
  produto: { nome: string; potencia: string }
  carregadores: { modelo: string; potencia: string; quantidade: number; conectores: number; vagas: number }[]
  local: { endereco: string; cidade: string; uf: string; padrao: string; distancia: string }
  inclusos: string[]
  condicoes: { participacao: string; taxa: string }
  pagamento: { total: number; parcelas: Parcela[] }
  contrato: { status: 'bloqueado' | 'aguardando' | 'assinado'; assinadoEm?: Date }
  /**
   * `distribuir`: entrada paga, falta dizer onde fica cada carregador; `agendando`: pontos enviados, datas a combinar
   * (os dois só existem na versão com pontos)
   */
  vistoria: { status: 'aguardando' | 'distribuir' | 'agendando' | 'agendada' | 'concluida'; data?: Date; aditivo?: Aditivo }
  obra: { status: 'aguardando' | 'agendada' | 'concluida'; data?: Date }
  entrega: { status: 'aguardando' | 'pronta' | 'aceita'; aceitaEm?: Date }
  investidor: { nome: string; documento: string; email: string; telefone: string }
  licenciado: { nome: string; telefone: string; whatsapp: string }
  /** versão com pontos (#proposta-v3): carregadores comprados e os locais onde cada um vai */
  unidades?: Unidade[]
  pontos?: Ponto[]
}

/* ---------------- Datas ---------------- */

const DIA = 86_400_000
const inicioDoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
export const somaDias = (base: Date, dias: number) => new Date(inicioDoDia(base).getTime() + dias * DIA)
export const diasEntre = (de: Date, ate: Date) => Math.round((inicioDoDia(ate).getTime() - inicioDoDia(de).getTime()) / DIA)

const fmtCurta = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' })
const fmtLonga = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
export const dataCurta = (d: Date) => fmtCurta.format(d)
export const dataLonga = (d: Date) => fmtLonga.format(d)

/** "hoje", "amanhã", "em 12 dias" */
export function emDias(ate: Date, hoje: Date) {
  const n = diasEntre(hoje, ate)
  if (n === 0) return 'hoje'
  if (n === 1) return 'amanhã'
  return `em ${n} dias`
}

/* ---------------- Montagem do exemplo ---------------- */

const PIX = '00020126580014BR.GOV.BCB.PIX0136a1f4c2e8-igreen-mob-9e89c90252040000530398654079997.005802BR5913IGREEN MOB SA6009UBERLANDIA62070503***6304A1B2'
const BOLETO = '34191.79001 01043.510047 91020.150008 1 10450000999700'

/** Vencimentos a partir da assinatura: entrada em 3 dias e as parcelas a cada 30 dias; cobrança gerada 10 dias antes */
function agendar(parcelas: Parcela[], assinatura: Date) {
  parcelas.forEach((p, i) => {
    p.vencimento = somaDias(assinatura, 3 + i * 30)
    p.geraEm = i === 0 ? assinatura : somaDias(p.vencimento, -10)
  })
}

/** Cobrança que já chegou na data de geração e não foi paga fica em aberto (ou vencida, depois do vencimento) */
function gerarCobrancas(parcelas: Parcela[], hoje: Date) {
  parcelas.forEach((p) => {
    if (p.status !== 'nao_gerada' || !p.geraEm || diasEntre(hoje, p.geraEm) > 0) return
    Object.assign(p, { status: p.vencimento && diasEntre(hoje, p.vencimento) < 0 ? 'vencida' : 'aberta', pix: PIX, boleto: BOLETO })
  })
}

/** Compra de exemplo da versão com pontos: um carregador de cada modelo */
export const NOME_MODELO: Record<Unidade['modelo'], string> = { ultra: 'Mob Ultra Fast', fast: 'Mob Fast', mob: 'Mob' }

/** Do maior para o menor: o Ultra Fast vem primeiro em todas as listas */
export const UNIDADES_EXEMPLO: Unidade[] = [
  { id: 'u3', modelo: 'ultra', nome: 'Mob Ultra Fast', potencia: '80 kW', corrente: 'DC', valor: 129_900 },
  { id: 'u2', modelo: 'fast', nome: 'Mob Fast', potencia: '7 + 40 kW', corrente: 'AC + DC', valor: 59_997 },
  { id: 'u1', modelo: 'mob', nome: 'Mob', potencia: '7 kW', corrente: 'AC', valor: 9_997 },
]

/** Compra grande (cenário "muitos"): 3 Ultra Fast, 3 Fast e 4 Mob, numerados */
const compraGrande = (): Unidade[] =>
  (
    [
      ['ultra', 3],
      ['fast', 3],
      ['mob', 4],
    ] as const
  ).flatMap(([modelo, qtd]) => {
    const base = UNIDADES_EXEMPLO.find((u) => u.modelo === modelo)!
    return Array.from({ length: qtd }, (_, i) => ({ ...base, id: `${base.id}-${i + 1}`, nome: `${base.nome} ${i + 1}` }))
  })

const enderecoVazio = (): Address => ({ cep: '', logradouro: '', bairro: '', cidade: '', uf: '', numero: '', complemento: '' })

/** Começo da distribuição: todos os carregadores no Ponto 1, sem endereço e com o contato da proposta */
export const pontoInicial = (unidades: Unidade[]): Ponto => ({ id: 'pt1', nome: '', unidades: unidades.map((u) => u.id), endereco: enderecoVazio(), contato: null })

/** Pontos já enviados no exemplo: a casa com o Mob e um posto com o Fast e o Ultra Fast */
const pontosExemplo = (): Ponto[] => [
  {
    id: 'pt1',
    nome: 'Casa',
    unidades: ['u1'],
    endereco: { cep: '38400-100', logradouro: 'Rua Tiradentes', bairro: 'Centro', cidade: 'Uberlândia', uf: 'MG', numero: '250', complemento: '' },
    contato: null,
  },
  {
    id: 'pt2',
    nome: 'Posto da avenida',
    unidades: ['u2', 'u3'],
    endereco: { cep: '38408-100', logradouro: 'Avenida Rondon Pacheco', bairro: 'Tibery', cidade: 'Uberlândia', uf: 'MG', numero: '4600', complemento: 'Loja 2' },
    contato: { nome: 'Marcos Andrade', telefone: '(34) 99123-4567', email: 'marcos@exemplo.com', documento: '' },
  },
]

/**
 * Exemplo de proposta em cada cenário. Entrada fixa de R$ 9.997 na assinatura e o restante em 4 parcelas mensais;
 * cada cobrança é gerada 10 dias antes do vencimento.
 * `versao: 'v3'`: compra com 3 carregadores (Mob, Mob Fast e Mob Ultra Fast) que a pessoa distribui em pontos depois da entrada.
 */
export function montarProposta(cenario: Cenario, hoje = new Date(), versao: 'v2' | 'v3' = 'v2'): Proposta {
  const v3 = versao === 'v3'
  // o primeiro modelo não tem a etapa de distribuição: os cenários dela viram "entrada em aberto"
  if (!v3 && (cenario === 'distribuir' || cenario === 'muitos' || cenario === 'pontos')) cenario = 'pagamento'
  const d = (n: number) => somaDias(hoje, n)
  const unidades = !v3 ? undefined : cenario === 'muitos' ? compraGrande() : UNIDADES_EXEMPLO
  const total = unidades ? unidades.reduce((s, u) => s + u.valor, 0) : 129_900
  const entrada = 9_997
  const parcela = (total - entrada) / 4

  // dia da assinatura em cada cenário (undefined = ainda não assinado)
  const assinatura: Partial<Record<Cenario, number>> = { pagamento: -1, distribuir: -4, muitos: -4, pontos: -6, vistoria: -12, instalacao: -70, entrega: -118 }
  const assinou = assinatura[cenario]

  const parcelas: Parcela[] = [
    { id: 'entrada', rotulo: 'Entrada', valor: entrada, regra: 'Gerada na assinatura do contrato', status: 'nao_gerada' },
    ...[2, 3, 4, 5].map((n) => ({
      id: `p${n}`,
      rotulo: `Parcela ${n}`,
      valor: parcela,
      regra: `${(n - 1) * 30} dias após a assinatura`,
      status: 'nao_gerada' as ParcelaStatus,
    })),
  ]
  if (assinou != null) {
    agendar(parcelas, d(assinou))
    const paga = (i: number, dia: number, com: Parcela['pagaCom'] = 'Pix') => Object.assign(parcelas[i], { status: 'paga', pagaEm: d(dia), pagaCom: com })
    const emAberto = (i: number) => Object.assign(parcelas[i], { status: 'aberta', pix: PIX, boleto: BOLETO })
    if (cenario === 'pagamento') emAberto(0)
    if (cenario === 'distribuir' || cenario === 'muitos') paga(0, -2)
    if (cenario === 'pontos') paga(0, -4)
    if (cenario === 'vistoria') paga(0, -10)
    if (cenario === 'instalacao') {
      paga(0, -68)
      paga(1, -39, 'boleto')
      Object.assign(parcelas[2], { status: 'vencida', pix: PIX, boleto: BOLETO })
    }
    if (cenario === 'entrega') {
      paga(0, -116)
      paga(1, -86)
      paga(2, -56, 'cartão')
      paga(3, -26)
    }
    gerarCobrancas(parcelas, hoje)
  }

  const resposta: Proposta['resposta'] =
    cenario === 'nova'
      ? { status: 'aguardando' }
      : cenario === 'recusada'
        ? { status: 'recusada', em: hoje, motivo: 'O valor não cabe no meu orçamento agora' }
        : { status: 'aceita', em: d(assinou != null ? assinou : 0) }

  const aditivo: Aditivo = {
    numero: 1,
    titulo: 'Cabeamento adicional de 10 m',
    motivo: v3
      ? 'No Posto da avenida, o padrão de entrada ficou a 20 m das vagas. A proposta inclui até 10 m de cabeamento por ponto.'
      : 'Na vistoria, o padrão de entrada ficou a 20 m da vaga. A proposta inclui até 10 m de cabeamento.',
    valor: 1_850,
    status: cenario === 'vistoria' ? 'aguardando' : 'assinado',
    assinadoEm: cenario === 'vistoria' ? undefined : d((assinou ?? 0) + 12),
    ...(v3 ? { ponto: 'pt2' } : null),
  }

  const vistoriaFeitaEm = cenario === 'vistoria' ? -2 : (assinou ?? 0) + 10
  const vistoria: Proposta['vistoria'] =
    cenario === 'vistoria' || cenario === 'instalacao' || cenario === 'entrega'
      ? { status: 'concluida', data: d(vistoriaFeitaEm), aditivo }
      : cenario === 'distribuir' || cenario === 'muitos'
        ? { status: 'distribuir' }
        : cenario === 'pontos'
          ? { status: 'agendando' }
          : { status: 'aguardando' }

  // pontos da versão v3: o Ponto 1 com tudo para distribuir, depois os dois pontos enviados com a vistoria de cada um
  const pontos = !unidades
    ? undefined
    : cenario === 'distribuir' || cenario === 'muitos'
      ? [pontoInicial(unidades)]
      : cenario === 'pontos'
        ? pontosExemplo().map((pt) => ({ ...pt, vistoria: { status: 'agendando' as const } }))
        : vistoria.status === 'concluida'
          ? pontosExemplo().map((pt, i) => ({ ...pt, vistoria: { status: 'concluida' as const, data: d(vistoriaFeitaEm - 1 + i) } }))
          : []

  return {
    numero: '9E89C902',
    emitidaEm: d(cenario === 'nova' || cenario === 'contrato' || cenario === 'recusada' ? -2 : (assinou ?? 0) - 2),
    validaAte: d(cenario === 'nova' || cenario === 'contrato' || cenario === 'recusada' ? 12 : (assinou ?? 0) + 12),
    resposta,
    produto: unidades ? { nome: `${unidades.length} eletropostos iGreen Mob`, potencia: unidades.map((u) => u.potencia).join(', ') } : { nome: 'Carga ultra rápida', potencia: '80 kW' },
    carregadores: unidades
      ? [
          { modelo: 'Mob Ultra Fast', potencia: '80 kW (DC)', quantidade: 1, conectores: 2, vagas: 1 },
          { modelo: 'Mob Fast', potencia: '7 + 40 kW (AC + DC)', quantidade: 1, conectores: 2, vagas: 2 },
          { modelo: 'Mob', potencia: '7 kW (AC)', quantidade: 1, conectores: 1, vagas: 1 },
        ]
      : [{ modelo: 'Carga ultra rápida', potencia: '80 kW', quantidade: 1, conectores: 2, vagas: 1 }],
    local: {
      endereco: 'Av. Rondon Pacheco, 4600',
      cidade: 'Uberlândia',
      uf: 'MG',
      padrao: 'Bifásico, 63 A',
      distancia: v3 ? 'até 10 m do padrão de entrada, por ponto' : 'até 10 m do padrão de entrada',
    },
    inclusos: ['Equipamento', 'Instalação elétrica', 'Pintura e sinalização da vaga', 'Licença iGreen e plataforma'],
    condicoes: {
      participacao: v3 ? '80% seu e 20% iGreen no Ultra Fast e no Fast; 100% seu no Mob' : '100% do resultado é seu',
      taxa: '14% do faturamento bruto',
    },
    pagamento: { total, parcelas },
    contrato:
      cenario === 'nova' || cenario === 'recusada' ? { status: 'bloqueado' } : assinou == null ? { status: 'aguardando' } : { status: 'assinado', assinadoEm: d(assinou) },
    vistoria,
    obra: cenario === 'instalacao' ? { status: 'agendada', data: d(3) } : cenario === 'entrega' ? { status: 'concluida', data: d(-5) } : { status: 'aguardando' },
    entrega: cenario === 'entrega' ? { status: 'pronta' } : { status: 'aguardando' },
    investidor: { nome: 'Rafael Mendes Costa', documento: '123.***.***-09', email: 'ra***@gmail.com', telefone: '(34) 9****-4321' },
    licenciado: { nome: 'Juliana Martins', telefone: '(34) 99876-5432', whatsapp: '5534998765432' },
    ...(unidades ? { unidades, pontos } : null),
  }
}

/* ---------------- Pontos (versão com vários carregadores) ---------------- */

export const unidadesDoPonto = (p: Proposta, pt: Ponto) => (p.unidades ?? []).filter((u) => pt.unidades.includes(u.id))

/** Carregadores agrupados por modelo, na ordem da compra (para listas que não podem crescer com a quantidade) */
export function porModelo(unidades: Unidade[]) {
  const grupos: (Omit<Unidade, 'id'> & { qtd: number })[] = []
  for (const u of unidades) {
    const g = grupos.find((x) => x.modelo === u.modelo)
    if (g) g.qtd++
    else grupos.push({ ...u, nome: NOME_MODELO[u.modelo], qtd: 1 })
  }
  return grupos
}

/** "Mob Ultra Fast, Mob Fast e Mob" ou, com repetidos, "3 Mob Ultra Fast, 3 Mob Fast e 4 Mob" */
export const resumoCompra = (unidades: Unidade[]) => juntarNomes(porModelo(unidades).map((g) => (g.qtd > 1 ? `${g.qtd} ${g.nome}` : g.nome)))

/** "Mob, Mob Fast e Mob Ultra Fast" */
export const juntarNomes = (nomes: string[]) => (nomes.length <= 1 ? (nomes[0] ?? '') : `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`)

/** "Rua Tiradentes, 250, Centro, Uberlândia/MG" */
export const enderecoCurto = (a: Address) =>
  [[a.logradouro, a.numero, a.complemento].filter((x) => x.trim()).join(', '), a.bairro, a.cidade && `${a.cidade}/${a.uf}`].filter(Boolean).join(', ')

export const nomePonto = (pt: Ponto, i: number) => pt.nome.trim() || `Ponto ${i + 1}`

/** Carregadores que ainda não estão em nenhum ponto */
export const semPonto = (unidades: Unidade[], pontos: Ponto[]) => unidades.filter((u) => !pontos.some((pt) => pt.unidades.includes(u.id)))

/** Novo ponto vazio, com o próximo id livre */
export function novoPonto(pontos: Ponto[]): Ponto {
  let n = pontos.length + 1
  while (pontos.some((pt) => pt.id === `pt${n}`)) n++
  return { id: `pt${n}`, nome: '', unidades: [], endereco: enderecoVazio(), contato: null }
}

/** Marca ou desmarca um carregador no ponto. Marcar tira o carregador do ponto onde ele estava */
export function alternarUnidade(pontos: Ponto[], pontoId: string, unidadeId: string): Ponto[] {
  const tem = pontos.find((pt) => pt.id === pontoId)?.unidades.includes(unidadeId)
  return pontos.map((pt) =>
    pt.id === pontoId
      ? { ...pt, unidades: tem ? pt.unidades.filter((u) => u !== unidadeId) : [...pt.unidades, unidadeId] }
      : tem
        ? pt
        : { ...pt, unidades: pt.unidades.filter((u) => u !== unidadeId) },
  )
}

/**
 * Quantos carregadores de um modelo ficam no ponto (carregadores do mesmo modelo são iguais).
 * Aumentar usa primeiro os que estão sem ponto e depois traz dos outros pontos (do último para o primeiro);
 * diminuir devolve os últimos para "sem ponto".
 */
export function definirQuantidade(pontos: Ponto[], unidades: Unidade[], pontoId: string, modelo: Unidade['modelo'], n: number): Ponto[] {
  const doModelo = new Set(unidades.filter((u) => u.modelo === modelo).map((u) => u.id))
  const novos = pontos.map((pt) => ({ ...pt, unidades: [...pt.unidades] }))
  const alvo = novos.find((pt) => pt.id === pontoId)
  if (!alvo) return pontos
  const aqui = alvo.unidades.filter((id) => doModelo.has(id))
  if (n < aqui.length) {
    const sair = new Set(aqui.slice(n))
    alvo.unidades = alvo.unidades.filter((id) => !sair.has(id))
    return novos
  }
  let falta = n - aqui.length
  for (const id of doModelo) {
    if (!falta) break
    if (novos.some((pt) => pt.unidades.includes(id))) continue
    alvo.unidades.push(id)
    falta--
  }
  for (const outro of [...novos].reverse()) {
    if (outro.id === pontoId) continue
    while (falta) {
      const i = outro.unidades.findLastIndex((id) => doModelo.has(id))
      if (i < 0) break
      alvo.unidades.push(...outro.unidades.splice(i, 1))
      falta--
    }
  }
  return novos
}

/** Resumo de onde estão os carregadores: um grupo por modelo e ponto (os sem ponto primeiro), para a lista não crescer com a compra */
export function gruposPorPonto(unidades: Unidade[], pontos: Ponto[]) {
  const grupos: { modelo: Unidade['modelo']; nome: string; qtd: number; ponto: number }[] = []
  for (const u of unidades) {
    const ponto = pontos.findIndex((pt) => pt.unidades.includes(u.id))
    const g = grupos.find((x) => x.modelo === u.modelo && x.ponto === ponto)
    if (g) g.qtd++
    else grupos.push({ modelo: u.modelo, nome: NOME_MODELO[u.modelo], qtd: 1, ponto })
  }
  return grupos.sort((a, b) => Number(a.ponto >= 0) - Number(b.ponto >= 0))
}

export type ErrosPonto =Partial<Record<'unidades' | 'cep' | 'numero' | 'contatoNome' | 'contatoTelefone' | 'contatoEmail' | 'contatoDocumento', string>>

/** O que falta em um ponto para enviar (nome é opcional; e-mail e documento do contato também, mas precisam ser válidos) */
export function errosPonto(pt: Ponto): ErrosPonto {
  const e: ErrosPonto = {}
  const temEndereco = Boolean(pt.endereco.logradouro || pt.endereco.cidade)
  if (!pt.unidades.length) e.unidades = 'Escolha ao menos um carregador'
  if (!isValidCep(pt.endereco.cep) || !temEndereco) e.cep = pt.endereco.cep ? 'Confira o CEP' : 'Informe o CEP do ponto'
  else if (!pt.endereco.numero.trim()) e.numero = 'Informe o número'
  const c = pt.contato
  if (c) {
    if (c.nome.trim().split(/\s+/).filter(Boolean).length < 2) e.contatoNome = 'Informe nome e sobrenome'
    if (!isValidPhone(c.telefone)) e.contatoTelefone = 'Informe um telefone com DDD'
    if (c.email.trim() && !isValidEmail(c.email)) e.contatoEmail = 'E-mail inválido'
    const doc = onlyDigits(c.documento)
    if (doc && !(doc.length === 11 ? isValidCpf(doc) : doc.length === 14 ? isValidCnpj(doc) : false)) e.contatoDocumento = 'CPF com 11 ou CNPJ com 14 dígitos'
  }
  return e
}

/** O que falta para enviar, em trechos que completam "Para enviar, falta…" (ex.: "o endereço do Ponto 1") */
export function pendencias(unidades: Unidade[], pontos: Ponto[]): string[] {
  const lista: string[] = []
  const soltos = semPonto(unidades, pontos)
  if (soltos.length > 3) lista.push(`um ponto para ${soltos.length} carregadores`)
  else if (soltos.length) lista.push(`um ponto para ${soltos.length > 1 ? 'os carregadores' : 'o'} ${juntarNomes(soltos.map((u) => u.nome))}`)
  pontos.forEach((pt, i) => {
    const e = errosPonto(pt)
    const nome = nomePonto(pt, i)
    if (e.unidades) lista.push(`um carregador no ${nome}`)
    if (e.cep || e.numero) lista.push(`o endereço do ${nome}`)
    else if (Object.keys(e).some((k) => k.startsWith('contato'))) lista.push(`o contato do ${nome}`)
  })
  return lista
}

/* ---------------- Andamento ---------------- */

export type EtapaStatus = 'feito' | 'atual' | 'andamento' | 'pendente' | 'recusado'
/** `alerta`: algo atrasado na etapa (ex.: parcela vencida) */
export type Etapa = { id: EtapaId; titulo: string; status: EtapaStatus; resumo: string; progresso?: number; alerta?: boolean }

const TITULOS: Record<EtapaId, string> = {
  proposta: 'Proposta',
  contrato: 'Contrato',
  pagamento: 'Pagamento',
  vistoria: 'Vistoria',
  instalacao: 'Instalação',
  entrega: 'Entrega',
}

export function etapas(p: Proposta, hoje = new Date()): Etapa[] {
  const pagas = p.pagamento.parcelas.filter((x) => x.status === 'paga').length
  const n = p.pagamento.parcelas.length
  const entradaPaga = p.pagamento.parcelas[0].status === 'paga'
  const aditivoPendente = p.vistoria.aditivo?.status === 'aguardando'
  const vencida = p.pagamento.parcelas.some((x) => x.status === 'vencida')

  const status: Record<EtapaId, Omit<Etapa, 'id' | 'titulo'>> = {
    proposta:
      p.resposta.status === 'recusada'
        ? { status: 'recusado', resumo: `Recusada em ${dataCurta(p.resposta.em!)}` }
        : p.resposta.status === 'aceita'
          ? { status: 'feito', resumo: `Aceita em ${dataCurta(p.resposta.em!)}` }
          : { status: 'atual', resumo: `Responda ${emDias(p.validaAte, hoje)}` },
    contrato:
      p.contrato.status === 'assinado'
        ? { status: 'feito', resumo: `Assinado em ${dataCurta(p.contrato.assinadoEm!)}` }
        : p.contrato.status === 'aguardando'
          ? { status: 'atual', resumo: 'Para assinar' }
          : { status: 'pendente', resumo: 'Depois do aceite' },
    pagamento:
      p.contrato.status !== 'assinado'
        ? { status: 'pendente', resumo: 'Depois do contrato' }
        : pagas === n
          ? { status: 'feito', resumo: 'Quitado' }
          : vencida
            ? { status: 'atual', resumo: 'Parcela vencida', progresso: pagas / n, alerta: true }
            : !entradaPaga
            ? { status: 'atual', resumo: 'Entrada em aberto', progresso: 0 }
            : { status: 'andamento', resumo: `${pagas} de ${n} pagas`, progresso: pagas / n },
    vistoria:
      p.vistoria.status === 'concluida'
        ? aditivoPendente
          ? { status: 'atual', resumo: 'Aditivo para assinar' }
          : { status: 'feito', resumo: `Feita em ${dataCurta(p.vistoria.data!)}` }
        : p.vistoria.status === 'agendada'
          ? { status: 'atual', resumo: `Em ${dataCurta(p.vistoria.data!)}` }
          : p.vistoria.status === 'distribuir'
            ? { status: 'atual', resumo: 'Indicar os pontos' }
            : p.vistoria.status === 'agendando'
              ? { status: 'andamento', resumo: 'Em agendamento', progresso: 0 }
              : { status: 'pendente', resumo: 'Depois da entrada' },
    instalacao:
      p.obra.status === 'concluida'
        ? { status: 'feito', resumo: `Feita em ${dataCurta(p.obra.data!)}` }
        : p.obra.status === 'agendada'
          ? { status: 'atual', resumo: `Em ${dataCurta(p.obra.data!)}` }
          : { status: 'pendente', resumo: 'Depois da vistoria' },
    entrega:
      p.entrega.status === 'aceita'
        ? { status: 'feito', resumo: `Aceita em ${dataCurta(p.entrega.aceitaEm!)}` }
        : p.entrega.status === 'pronta'
          ? { status: 'atual', resumo: 'Para seu aceite' }
          : { status: 'pendente', resumo: 'Depois da instalação' },
  }
  return (Object.keys(TITULOS) as EtapaId[]).map((id) => ({ id, titulo: TITULOS[id], ...status[id] }))
}

/** Etapa aberta ao carregar: a primeira que pede algo da pessoa (ou a última em andamento) */
export function etapaEmFoco(lista: Etapa[]): EtapaId {
  const recusada = lista.find((e) => e.status === 'recusado')
  if (recusada) return recusada.id
  return (lista.find((e) => e.status === 'atual') ?? [...lista].reverse().find((e) => e.status === 'andamento') ?? lista[lista.length - 1]).id
}

/* ---------------- Próximo passo ---------------- */

export type Acao = 'aceitar' | 'assinar' | 'pagar' | 'distribuir' | 'aditivo' | 'aceite-entrega' | 'whatsapp' | 'ver'

export type Passo = { etapa: EtapaId; titulo: string; texto: string; acao?: { tipo: Acao; label: string; parcela?: string } }

/** O que a pessoa precisa fazer agora, na ordem em que o processo exige */
export function proximoPasso(p: Proposta, hoje = new Date()): Passo {
  const parcelas = p.pagamento.parcelas
  const vencida = parcelas.find((x) => x.status === 'vencida')
  const aberta = parcelas.find((x) => x.status === 'aberta')

  if (p.resposta.status === 'recusada')
    return {
      etapa: 'proposta',
      titulo: 'Você recusou esta proposta',
      texto: `Se quiser outra condição ou mudar de ideia, fale com ${p.licenciado.nome.split(' ')[0]}.`,
      acao: { tipo: 'whatsapp', label: 'Falar no WhatsApp' },
    }
  if (p.resposta.status === 'aguardando')
    return {
      etapa: 'proposta',
      titulo: `Responda até ${dataCurta(p.validaAte)}`,
      texto: 'Ao aceitar, você assina o contrato aqui mesmo e o pagamento da entrada é liberado.',
      acao: { tipo: 'aceitar', label: 'Aceitar proposta' },
    }
  if (p.contrato.status === 'aguardando')
    return {
      etapa: 'contrato',
      titulo: 'Assine o contrato',
      texto: 'A proposta entra no contrato como Anexo I. Depois da assinatura, o pagamento da entrada é liberado.',
      acao: { tipo: 'assinar', label: 'Revisar e assinar' },
    }
  if (parcelas[0].status !== 'paga' && parcelas[0].vencimento)
    return {
      etapa: 'pagamento',
      titulo: `Pague a entrada até ${dataCurta(parcelas[0].vencimento)}`,
      texto: 'Por Pix, boleto ou cartão. Com a entrada paga, agendamos a vistoria técnica.',
      acao: { tipo: 'pagar', label: 'Pagar entrada', parcela: 'entrada' },
    }
  if (p.vistoria.status === 'distribuir') {
    const n = p.unidades?.length ?? 1
    return {
      etapa: 'vistoria',
      titulo: n > 1 ? `Distribua seus ${n} carregadores` : 'Diga onde fica o carregador',
      texto: 'Diga onde fica cada carregador. A vistoria técnica é agendada por ponto.',
      acao: { tipo: 'distribuir', label: n > 1 ? 'Distribuir carregadores' : 'Informar o local' },
    }
  }
  if (p.vistoria.aditivo?.status === 'aguardando')
    return {
      etapa: 'vistoria',
      titulo: `Assine o aditivo nº ${p.vistoria.aditivo.numero}`,
      texto: p.vistoria.aditivo.motivo,
      acao: { tipo: 'aditivo', label: 'Revisar e assinar aditivo' },
    }
  if (vencida)
    return {
      etapa: 'pagamento',
      titulo: `${vencida.rotulo} venceu em ${dataCurta(vencida.vencimento!)}`,
      texto: 'O Pix e o boleto continuam valendo. Pague para manter a instalação na data agendada.',
      acao: { tipo: 'pagar', label: `Pagar ${vencida.rotulo.toLowerCase()}`, parcela: vencida.id },
    }
  if (p.entrega.status === 'pronta')
    return {
      etapa: 'entrega',
      titulo: 'Dê o aceite na entrega',
      texto: 'Reunimos contrato, aditivo, laudos e o termo de entrega em um envelope só.',
      acao: { tipo: 'aceite-entrega', label: 'Revisar e dar aceite' },
    }
  if (p.obra.status === 'agendada')
    return {
      etapa: 'instalacao',
      titulo: `Instalação ${emDias(p.obra.data!, hoje)}, em ${dataCurta(p.obra.data!)}`,
      texto: 'A equipe iGreen vai até o local. Não precisa fazer nada até lá.',
      acao: { tipo: 'ver', label: 'Ver detalhes' },
    }
  if (aberta)
    return {
      etapa: 'pagamento',
      titulo: `${aberta.rotulo} vence em ${dataCurta(aberta.vencimento!)}`,
      texto: 'Pague por Pix, boleto ou cartão até o vencimento.',
      acao: { tipo: 'pagar', label: `Pagar ${aberta.rotulo.toLowerCase()}`, parcela: aberta.id },
    }
  if (p.entrega.status === 'aceita')
    return { etapa: 'entrega', titulo: 'Seu eletroposto está ativo', texto: 'Tudo foi entregue e aceito. Os documentos ficam disponíveis aqui.' }
  if (p.vistoria.status === 'agendando' && p.pontos?.length)
    return {
      etapa: 'vistoria',
      titulo: 'Vistoria em agendamento',
      texto: `Recebemos ${p.pontos.length === 1 ? 'o seu ponto' : `os seus ${p.pontos.length} pontos`}. Vamos combinar a data de cada vistoria pelo WhatsApp.`,
    }
  return { etapa: 'vistoria', titulo: 'Vistoria em agendamento', texto: 'Vamos combinar a data da vistoria técnica com você pelo WhatsApp.' }
}

/* ---------------- Ações da página (a prévia simula o que o sistema faria) ---------------- */

const copia = (p: Proposta): Proposta => structuredClone(p)

export function aceitar(p: Proposta, hoje = new Date()): Proposta {
  const n = copia(p)
  n.resposta = { status: 'aceita', em: hoje }
  n.contrato = { status: 'aguardando' }
  return n
}

export function recusar(p: Proposta, motivo: string, hoje = new Date()): Proposta {
  const n = copia(p)
  n.resposta = { status: 'recusada', em: hoje, motivo }
  return n
}

/** Assinar o contrato agenda as parcelas e gera a cobrança da entrada */
export function assinarContrato(p: Proposta, hoje = new Date()): Proposta {
  const n = copia(p)
  n.contrato = { status: 'assinado', assinadoEm: hoje }
  agendar(n.pagamento.parcelas, hoje)
  gerarCobrancas(n.pagamento.parcelas, hoje)
  return n
}

/**
 * Pagamento confirmado (na prévia, simulado). Com a entrada paga, a vistoria é agendada; na versão com pontos,
 * a pessoa primeiro diz onde fica cada carregador (todos começam no Ponto 1)
 */
export function pagar(p: Proposta, id: string, hoje = new Date()): Proposta {
  const n = copia(p)
  const parcela = n.pagamento.parcelas.find((x) => x.id === id)
  if (!parcela) return p
  Object.assign(parcela, { status: 'paga', pagaEm: hoje, pagaCom: 'Pix' })
  if (id === 'entrada' && n.vistoria.status === 'aguardando') {
    if (n.unidades) {
      n.vistoria = { status: 'distribuir' }
      n.pontos = [pontoInicial(n.unidades)]
    } else n.vistoria = { status: 'agendada', data: somaDias(hoje, 4) }
  }
  return n
}

/** Envia os pontos para a vistoria (só com todos os carregadores distribuídos e os pontos completos) */
export function enviarPontos(p: Proposta, pontos: Ponto[]): Proposta {
  if (!p.unidades || pendencias(p.unidades, pontos).length) return p
  const n = copia(p)
  n.pontos = structuredClone(pontos).map((pt) => ({ ...pt, vistoria: { status: 'agendando' as const } }))
  n.vistoria = { ...n.vistoria, status: 'agendando' }
  return n
}

/** Prévia: a equipe combinou as datas; cada ponto ganha a sua vistoria, em dias seguidos */
export function agendarVistorias(p: Proposta, hoje = new Date()): Proposta {
  if (!p.pontos?.length) return p
  const n = copia(p)
  n.pontos = n.pontos!.map((pt, i) => ({ ...pt, vistoria: { status: 'agendada' as const, data: somaDias(hoje, 3 + i * 2) } }))
  n.vistoria = { ...n.vistoria, status: 'agendada', data: somaDias(hoje, 3) }
  return n
}

/** Assinar o aditivo libera o agendamento da instalação */
export function assinarAditivo(p: Proposta, hoje = new Date()): Proposta {
  const n = copia(p)
  if (n.vistoria.aditivo) Object.assign(n.vistoria.aditivo, { status: 'assinado', assinadoEm: hoje })
  if (n.obra.status === 'aguardando') n.obra = { status: 'agendada', data: somaDias(hoje, 6) }
  return n
}

export function aceitarEntrega(p: Proposta, hoje = new Date()): Proposta {
  const n = copia(p)
  n.entrega = { status: 'aceita', aceitaEm: hoje }
  return n
}

/* ---------------- Envelope de entrega ---------------- */

export type DocEntrega = { id: string; nome: string; detalhe: string }

export function documentosEntrega(p: Proposta): DocEntrega[] {
  return [
    { id: 'contrato', nome: 'Contrato assinado', detalhe: p.contrato.assinadoEm ? `Assinado em ${dataCurta(p.contrato.assinadoEm)}` : 'Com a proposta como Anexo I' },
    ...(p.vistoria.aditivo ? [{ id: 'aditivo', nome: `Aditivo nº ${p.vistoria.aditivo.numero}`, detalhe: p.vistoria.aditivo.titulo }] : []),
    { id: 'laudos', nome: 'Laudos e checklists', detalhe: 'Vistoria, instalação e testes' },
    { id: 'termo', nome: 'Termo de entrega', detalhe: 'Para o seu aceite' },
  ]
}

/* ---------------- Recusa: confirmação do investidor ---------------- */

/**
 * O CPF digitado é válido e bate com o da proposta (que vem mascarado: "123.***.***-09").
 * Na versão final, quem confere é o sistema; aqui comparamos os dígitos visíveis.
 */
export function cpfConfere(digitado: string, mascarado: string) {
  const d = digitado.replace(/\D/g, '')
  const m = mascarado.replace(/[^\d*]/g, '')
  if (d.length !== 11 || m.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  const dv = (len: number) => {
    let soma = 0
    for (let i = 0; i < len; i++) soma += Number(d[i]) * (len + 1 - i)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  if (dv(9) !== Number(d[9]) || dv(10) !== Number(d[10])) return false
  return [...m].every((c, i) => c === '*' || c === d[i])
}

/* ---------------- Chamada do topo ---------------- */

const TEXTO_INSTITUCIONAL = 'O seu acesso oficial ao nosso mundo de soluções e tecnologia está muito mais próximo.'

/** Título institucional do topo: a estrutura é fixa e o destaque acompanha a etapa da proposta */
export function chamada(p: Proposta): { linha: string; destaque: string; texto: string; tom: 'ok' | 'erro' } {
  const varios = (p.unidades?.length ?? 1) > 1
  const seu = varios ? 'Seus eletropostos' : 'Seu eletroposto'
  const esta = (s: string) => `${varios ? 'estão' : 'está'} ${s}${varios ? 's' : ''}!`
  if (p.resposta.status === 'recusada')
    return { linha: 'Proposta', destaque: 'recusada', texto: 'Quando quiser retomar, sua licenciada pode preparar uma nova proposta.', tom: 'erro' }
  if (p.entrega.status === 'aceita') return { linha: seu, destaque: esta('ativo'), texto: TEXTO_INSTITUCIONAL, tom: 'ok' }
  if (p.entrega.status === 'pronta') return { linha: seu, destaque: esta('pronto'), texto: TEXTO_INSTITUCIONAL, tom: 'ok' }
  if (p.vistoria.status === 'distribuir') return { linha: 'Entrada paga', destaque: 'com sucesso!', texto: TEXTO_INSTITUCIONAL, tom: 'ok' }
  if (p.vistoria.status !== 'aguardando' || p.obra.status !== 'aguardando')
    return { linha: seu, destaque: `${varios ? 'estão' : 'está'} a caminho!`, texto: TEXTO_INSTITUCIONAL, tom: 'ok' }
  if (p.contrato.status === 'assinado') return { linha: 'Contrato assinado', destaque: 'com sucesso!', texto: TEXTO_INSTITUCIONAL, tom: 'ok' }
  if (p.resposta.status === 'aceita') return { linha: 'Proposta aceita', destaque: 'com sucesso!', texto: TEXTO_INSTITUCIONAL, tom: 'ok' }
  return { linha: 'Proposta gerada com', destaque: 'Sucesso!', texto: TEXTO_INSTITUCIONAL, tom: 'ok' }
}
