/*
 * Proposta gerada (modelo novo, só local): dados de exemplo e as regras do andamento.
 * Os dados imitam o que o sistema enviaria. As datas são relativas a hoje para a prévia sempre parecer atual.
 * Nomes e documentos são fictícios.
 */

export type Cenario = 'nova' | 'contrato' | 'pagamento' | 'vistoria' | 'instalacao' | 'entrega' | 'recusada'

/** Cenários da prévia (seletor de demonstração e `?cenario=` no endereço) */
export const CENARIOS: { value: Cenario; label: string }[] = [
  { value: 'nova', label: 'Proposta enviada' },
  { value: 'contrato', label: 'Aceita, contrato para assinar' },
  { value: 'pagamento', label: 'Contrato assinado, entrada em aberto' },
  { value: 'vistoria', label: 'Vistoria com aditivo' },
  { value: 'instalacao', label: 'Instalação agendada, parcela vencida' },
  { value: 'entrega', label: 'Entrega para aceite' },
  { value: 'recusada', label: 'Proposta recusada' },
]

export const isCenario = (v: string | null): v is Cenario => CENARIOS.some((c) => c.value === v)

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

export type Aditivo = { numero: number; titulo: string; motivo: string; valor: number; status: 'aguardando' | 'assinado'; assinadoEm?: Date }

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
  vistoria: { status: 'aguardando' | 'agendada' | 'concluida'; data?: Date; aditivo?: Aditivo }
  obra: { status: 'aguardando' | 'agendada' | 'concluida'; data?: Date }
  entrega: { status: 'aguardando' | 'pronta' | 'aceita'; aceitaEm?: Date }
  investidor: { nome: string; documento: string; email: string }
  licenciado: { nome: string; telefone: string; whatsapp: string }
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

const PIX = '00020126580014BR.GOV.BCB.PIX0136a1f4c2e8-igreen-mob-9e89c902520400005303986540538970.005802BR5913IGREEN MOB SA6009UBERLANDIA62070503***6304A1B2'
const BOLETO = '34191.79001 01043.510047 91020.150008 1 10450003897000'

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

/**
 * Exemplo de proposta em cada cenário. Entrada de 30% na assinatura e mais 4 parcelas mensais;
 * cada cobrança é gerada 10 dias antes do vencimento.
 */
export function montarProposta(cenario: Cenario, hoje = new Date()): Proposta {
  const d = (n: number) => somaDias(hoje, n)
  const total = 129_900
  const entrada = 38_970
  const parcela = (total - entrada) / 4

  // dia da assinatura em cada cenário (undefined = ainda não assinado)
  const assinatura: Partial<Record<Cenario, number>> = { pagamento: -1, vistoria: -12, instalacao: -70, entrega: -118 }
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
    motivo: 'Na vistoria, o padrão de entrada ficou a 20 m da vaga. A proposta inclui até 10 m de cabeamento.',
    valor: 1_850,
    status: cenario === 'vistoria' ? 'aguardando' : 'assinado',
    assinadoEm: cenario === 'vistoria' ? undefined : d((assinou ?? 0) + 12),
  }

  return {
    numero: '9E89C902',
    emitidaEm: d(cenario === 'nova' || cenario === 'contrato' || cenario === 'recusada' ? -2 : (assinou ?? 0) - 2),
    validaAte: d(cenario === 'nova' || cenario === 'contrato' || cenario === 'recusada' ? 12 : (assinou ?? 0) + 12),
    resposta,
    produto: { nome: 'Carga ultra rápida', potencia: '80 kW' },
    carregadores: [{ modelo: 'Carga ultra rápida', potencia: '80 kW', quantidade: 1, conectores: 2, vagas: 1 }],
    local: { endereco: 'Av. Rondon Pacheco, 4600', cidade: 'Uberlândia', uf: 'MG', padrao: 'Bifásico, 63 A', distancia: 'até 10 m do padrão de entrada' },
    inclusos: ['Equipamento', 'Instalação elétrica', 'Pintura e sinalização da vaga', 'Licença iGreen e plataforma'],
    condicoes: { participacao: '100% do resultado é seu', taxa: '14% do faturamento bruto' },
    pagamento: { total, parcelas },
    contrato:
      cenario === 'nova' || cenario === 'recusada' ? { status: 'bloqueado' } : assinou == null ? { status: 'aguardando' } : { status: 'assinado', assinadoEm: d(assinou) },
    vistoria:
      cenario === 'vistoria'
        ? { status: 'concluida', data: d(-2), aditivo }
        : cenario === 'instalacao' || cenario === 'entrega'
          ? { status: 'concluida', data: d((assinou ?? 0) + 10), aditivo }
          : { status: 'aguardando' },
    obra: cenario === 'instalacao' ? { status: 'agendada', data: d(3) } : cenario === 'entrega' ? { status: 'concluida', data: d(-5) } : { status: 'aguardando' },
    entrega: cenario === 'entrega' ? { status: 'pronta' } : { status: 'aguardando' },
    investidor: { nome: 'Rafael Mendes Costa', documento: '123.***.***-09', email: 'ra***@gmail.com' },
    licenciado: { nome: 'Juliana Martins', telefone: '(34) 99876-5432', whatsapp: '5534998765432' },
  }
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

export type Acao = 'aceitar' | 'assinar' | 'pagar' | 'aditivo' | 'aceite-entrega' | 'whatsapp' | 'ver'

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

/** Pagamento confirmado (na prévia, simulado). Com a entrada paga, a vistoria é agendada */
export function pagar(p: Proposta, id: string, hoje = new Date()): Proposta {
  const n = copia(p)
  const parcela = n.pagamento.parcelas.find((x) => x.id === id)
  if (!parcela) return p
  Object.assign(parcela, { status: 'paga', pagaEm: hoje, pagaCom: 'Pix' })
  if (id === 'entrada' && n.vistoria.status === 'aguardando') n.vistoria = { status: 'agendada', data: somaDias(hoje, 4) }
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
