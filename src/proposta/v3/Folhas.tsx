import { useState } from 'react'
import { ICONS } from '../../assets'
import { Button } from '../../components/ui/Button'
import { Checkbox } from '../../components/ui/Controls'
import { Icon } from '../../components/ui/Icon'
import { cn } from '../../lib/cn'
import { moneyCents } from '../../lib/format'
import { dataCurta, dataLonga, diasEntre, documentosEntrega, emDias, juntarNomes, type DocEntrega, type Parcela, type Proposta, type Unidade } from '../data'
import { Aviso, Cabecalho, LinhaDoc, Linhas, Relogio, Secao, type Tom } from './Blocos'
import { Frota } from './Vistoria'
import styles from './Proposta.module.css'

/*
 * Folhas das etapas (versão 2). Regra visual: só o que é clicável tem borda e um indicador
 * (chevron em círculo, "Abrir" com seta, botão "Copiar"). Informação fica em texto ou em fundo tingido, sem caixa dentro de caixa.
 */

/* ================= Proposta ================= */

export function FolhaProposta({ p, onAceitar, onRecusar }: { p: Proposta; onAceitar: () => void; onRecusar: () => void }) {
  const entrada = p.pagamento.parcelas[0]
  const demais = p.pagamento.parcelas.slice(1)
  const st =
    p.resposta.status === 'aguardando'
      ? ({ texto: 'Aguardando resposta', tom: 'acao' } as const)
      : p.resposta.status === 'aceita'
        ? ({ texto: `Aceita em ${dataCurta(p.resposta.em!)}`, tom: 'ok' } as const)
        : ({ texto: `Recusada em ${dataCurta(p.resposta.em!)}`, tom: 'erro' } as const)

  return (
    <>
      <Cabecalho titulo="A proposta" status={st.texto} tom={st.tom}>
        O que você contrata, onde fica e como paga. Ela entra no contrato como Anexo I.
      </Cabecalho>

      {p.unidades ? (
        <Secao titulo={`Seus ${p.unidades.length} eletropostos`}>
          <Frota unidades={p.unidades} comValor />
          <p className={styles.nota}>Incluso em cada eletroposto:</p>
          <ul className={styles.inclusos} aria-label="Incluso em cada eletroposto">
            {p.inclusos.map((item) => (
              <li key={item}>
                <span className={styles.tick} aria-hidden>
                  <Icon src={ICONS.checkBold} size={8} color="#fff" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </Secao>
      ) : (
      <Secao titulo="Produto">
        {p.carregadores.map((c, i) => (
          <div key={i} className={styles.produto}>
            <div className={styles.produtoTopo}>
              <span className={styles.produtoIcone} aria-hidden>
                <Icon src={ICONS.energyLink} size={20} color="#fff" />
              </span>
              <div>
                <p className={styles.produtoNome}>
                  {c.quantidade}× {c.modelo}
                </p>
                <p className={styles.produtoMeta}>{c.potencia} por carregador</p>
              </div>
            </div>
            <div className={styles.specs}>
              <div>
                <span>Potência</span>
                <b>{c.potencia}</b>
              </div>
              <div>
                <span>Conectores</span>
                <b>{c.conectores}</b>
              </div>
              <div>
                <span>Vagas</span>
                <b>{c.vagas}</b>
              </div>
            </div>
            <ul className={styles.inclusos} aria-label="Incluso">
              {p.inclusos.map((item) => (
                <li key={item}>
                  <span className={styles.tick} aria-hidden>
                    <Icon src={ICONS.checkBold} size={8} color="#fff" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Secao>
      )}

      <Secao titulo="Instalação" nota="Se a vistoria encontrar outra distância ou outro padrão, o ajuste vem como aditivo para você assinar aqui.">
        <Linhas
          itens={
            p.unidades
              ? [
                  ['Cidade', `${p.local.cidade}/${p.local.uf}`],
                  ['Locais', 'Você indica os pontos depois da entrada'],
                  ['Cabeamento', p.local.distancia],
                ]
              : [
                  ['Endereço', p.local.endereco],
                  ['Cidade', `${p.local.cidade}/${p.local.uf}`],
                  ['Padrão de entrada', p.local.padrao],
                  ['Cabeamento', p.local.distancia],
                ]
          }
        />
      </Secao>

      <Secao titulo="Forma de pagamento">
        <div className={styles.plano} aria-hidden>
          {p.pagamento.parcelas.map((x) => (
            <span key={x.id} className={cn(styles.planoSeg, x.id === 'entrada' && styles.planoEntrada)} style={{ flexGrow: x.valor }} />
          ))}
        </div>
        <Linhas
          itens={[
            ['Entrada', `${moneyCents(entrada.valor)} na assinatura`],
            [`${demais.length} parcelas`, `${moneyCents(demais[0].valor)} a cada 30 dias`],
            ['Total', <b key="t">{moneyCents(p.pagamento.total)}</b>],
          ]}
        />
      </Secao>

      <Secao titulo="Condições">
        <Linhas
          itens={[
            ['Participação', p.condicoes.participacao],
            ['Taxa iGreen', p.condicoes.taxa],
            ['Emitida em', dataLonga(p.emitidaEm)],
            ['Válida até', dataLonga(p.validaAte)],
          ]}
        />
      </Secao>

      {p.resposta.status === 'aguardando' ? (
        <div className={styles.acoes}>
          <Button onClick={onAceitar}>Aceitar proposta</Button>
          <Button variant="secondary" onClick={onRecusar}>
            Recusar proposta
          </Button>
        </div>
      ) : null}
      {p.resposta.status === 'recusada' && p.resposta.motivo ? (
        <Aviso titulo="Motivo da recusa" icone="relogio">
          {p.resposta.motivo}
        </Aviso>
      ) : null}
    </>
  )
}

/* ================= Contrato ================= */

export function FolhaContrato({
  p,
  onAceitar,
  onAssinar,
  onTelaCheia,
}: {
  p: Proposta
  onAceitar: () => void
  onAssinar: () => void
  onTelaCheia: () => void
}) {
  const [li, setLi] = useState(false)
  const [assinando, setAssinando] = useState(false)

  if (p.contrato.status === 'bloqueado') {
    return (
      <>
        <Cabecalho titulo="Contrato" status={p.resposta.status === 'recusada' ? 'Não liberado' : 'Depois do aceite'} tom="espera" />
        <Aviso
          titulo="O contrato abre quando você aceita a proposta"
          acao={p.resposta.status === 'aguardando' ? <Button onClick={onAceitar}>Aceitar proposta</Button> : undefined}
        >
          Você lê e assina aqui mesmo, sem precisar de e-mail. A proposta vira o Anexo I do contrato.
        </Aviso>
      </>
    )
  }

  const assinado = p.contrato.status === 'assinado'
  const assinar = () => {
    setAssinando(true)
    window.setTimeout(() => {
      setAssinando(false)
      onAssinar()
    }, 900)
  }

  return (
    <>
      <Cabecalho titulo="Contrato" status={assinado ? `Assinado em ${dataCurta(p.contrato.assinadoEm!)}` : 'Para assinar'} tom={assinado ? 'ok' : 'acao'}>
        Leia com calma. A proposta está no fim, como Anexo I.
      </Cabecalho>

      {/* Na versão final, este quadro mostra o documento do serviço de assinatura eletrônica */}
      <div className={styles.doc}>
        <div className={styles.docBarra}>
          <span className={styles.docNome}>Contrato nº {p.numero}</span>
          <button type="button" className={styles.btnPequeno} onClick={onTelaCheia}>
            <Expandir />
            Tela cheia
          </button>
        </div>
        <div className={styles.docCorpo} tabIndex={0} aria-label="Texto do contrato">
          <ContratoTexto p={p} />
        </div>
      </div>

      {assinado ? (
        <div className={styles.feito}>
          <span className={styles.feitoIcone} aria-hidden>
            <Icon src={ICONS.checkBold} size={10} color="#fff" />
          </span>
          <p>
            Assinado eletronicamente por <b>{p.investidor.nome}</b> em {dataLonga(p.contrato.assinadoEm!)}.
          </p>
        </div>
      ) : (
        <div className={styles.assinar}>
          <Checkbox id="v3-li-contrato" checked={li} onChange={setLi}>
            Li o contrato e a proposta (Anexo I) e concordo com os termos.
          </Checkbox>
          <Button onClick={assinar} disabled={!li} loading={assinando}>
            Assinar contrato
          </Button>
        </div>
      )}
    </>
  )
}

function Expandir() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  )
}

/** "Mob 7 kW AC, Mob Fast 7 + 40 kW AC + DC e Mob Ultra Fast 80 kW DC" */
const descreverUnidades = (us: Unidade[]) => juntarNomes(us.map((u) => `${u.nome} ${u.potencia} ${u.corrente}`))

export function ContratoTexto({ p }: { p: Proposta }) {
  const [entrada, ...demais] = p.pagamento.parcelas
  const c = p.carregadores[0]
  const us = p.unidades
  const pontos = p.pontos?.length ? p.pontos : null
  return (
    <article className={styles.texto}>
      <p className={styles.textoAviso}>Texto de exemplo para a prévia.</p>
      <h5>Contrato de participação em eletroposto iGreen Mob</h5>
      <p>
        <b>Investidor:</b> {p.investidor.nome}, CPF {p.investidor.documento}. <b>iGreen Mob</b>, responsável pela instalação, operação e manutenção do
        eletroposto.
      </p>
      <h6>1. Objeto</h6>
      {us ? (
        <p>
          Instalação e operação de {us.length} eletropostos ({descreverUnidades(us)}) nos pontos indicados pelo investidor em {p.local.cidade}/{p.local.uf}
          {pontos ? `: ${pontos.map((pt, i) => `${pt.nome.trim() || `Ponto ${i + 1}`} (${pt.endereco.logradouro}, ${pt.endereco.numero})`).join('; ')}` : ''}, conforme a
          proposta nº {p.numero} (Anexo I).
        </p>
      ) : (
        <p>
          Instalação e operação de {c.quantidade} eletroposto {c.modelo} ({c.potencia}, {c.conectores} conectores) em {p.local.endereco},{' '}
          {p.local.cidade}/{p.local.uf}, conforme a proposta nº {p.numero} (Anexo I).
        </p>
      )}
      <h6>2. Preço e pagamento</h6>
      <p>
        Valor total de {moneyCents(p.pagamento.total)}: entrada de {moneyCents(entrada.valor)} em até 3 dias da assinatura e {demais.length} parcelas de{' '}
        {moneyCents(demais[0].valor)} a cada 30 dias. Cada cobrança é gerada 10 dias antes do vencimento, por Pix, boleto ou cartão.
      </p>
      <h6>3. Vistoria e aditivos</h6>
      <p>
        Com a entrada paga{us ? ' e os pontos indicados' : ''}, a iGreen faz a vistoria técnica{us ? ' de cada ponto' : ''}. Mudanças de escopo, como cabeamento além do previsto, são formalizadas em aditivo, assinado
        eletronicamente nesta mesma página.
      </p>
      <h6>4. Instalação e entrega</h6>
      <p>A instalação acontece em até 30 dias após a vistoria. Ao final, o investidor recebe o termo de entrega com laudos e checklists, para dar o aceite.</p>
      <h6>5. Resultado</h6>
      <p>
        {p.condicoes.participacao}, descontada a taxa iGreen de {p.condicoes.taxa}.
      </p>
      <h6>Anexo I: proposta nº {p.numero}</h6>
      <p>
        {us ? (
          <>
            {us.length} eletropostos: {juntarNomes(us.map((u) => u.nome))}. Cidade: {p.local.cidade}/{p.local.uf}. Cabeamento {p.local.distancia}.
          </>
        ) : (
          <>
            {c.quantidade}× {c.modelo}, {c.potencia}. Local: {p.local.cidade}/{p.local.uf}. Padrão de entrada {p.local.padrao}, cabeamento {p.local.distancia}.
          </>
        )}{' '}
        Emitida em {dataLonga(p.emitidaEm)}, válida até {dataLonga(p.validaAte)}.
      </p>
    </article>
  )
}

/* ================= Pagamento ================= */

export function FolhaPagamento({
  p,
  aberta,
  onAbrir,
  onCopiar,
  onPagar,
  onCartao,
}: {
  p: Proposta
  aberta: string | null
  onAbrir: (id: string | null) => void
  onCopiar: (texto: string, msg: string) => void
  onPagar: (id: string) => void
  onCartao: () => void
}) {
  const liberado = p.contrato.status === 'assinado'
  const parcelas = p.pagamento.parcelas
  const pagas = parcelas.filter((x) => x.status === 'paga')
  const totalPago = pagas.reduce((s, x) => s + x.valor, 0)
  const vencida = parcelas.some((x) => x.status === 'vencida')
  const st = !liberado
    ? ({ texto: 'Depois do contrato', tom: 'espera' } as const)
    : pagas.length === parcelas.length
      ? ({ texto: 'Quitado', tom: 'ok' } as const)
      : vencida
        ? ({ texto: 'Parcela vencida', tom: 'erro' } as const)
        : parcelas[0].status !== 'paga'
          ? ({ texto: 'Entrada em aberto', tom: 'acao' } as const)
          : ({ texto: `${pagas.length} de ${parcelas.length} pagas`, tom: 'ok' } as const)

  return (
    <>
      <Cabecalho titulo="Pagamento" status={st.texto} tom={st.tom}>
        Entrada e mais {parcelas.length - 1} parcelas. Cada cobrança aparece aqui 10 dias antes do vencimento. Toque numa parcela para ver como pagar.
      </Cabecalho>

      {liberado ? (
        <div className={styles.progresso}>
          <div className={styles.progressoTopo}>
            <span>
              <b>{moneyCents(totalPago)}</b> pagos de {moneyCents(p.pagamento.total)}
            </span>
            <span className={styles.progressoConta}>
              {pagas.length} de {parcelas.length}
            </span>
          </div>
          <div className={styles.barraPag} role="progressbar" aria-label="Valor pago" aria-valuemin={0} aria-valuemax={p.pagamento.total} aria-valuenow={totalPago}>
            <span style={{ width: `${(totalPago / p.pagamento.total) * 100}%` }} />
          </div>
        </div>
      ) : (
        <Aviso titulo="Liberado depois da assinatura do contrato">
          Assim que você assinar, a cobrança da entrada aparece aqui com Pix, boleto e cartão. Veja abaixo como fica.
        </Aviso>
      )}

      <ul className={styles.parcelas}>
        {parcelas.map((x) => (
          <ParcelaItem
            key={x.id}
            x={x}
            aberta={aberta === x.id}
            liberado={liberado}
            onToggle={() => onAbrir(aberta === x.id ? null : x.id)}
            onCopiar={onCopiar}
            onPagar={() => onPagar(x.id)}
            onCartao={onCartao}
          />
        ))}
      </ul>
    </>
  )
}

const STATUS_PARCELA: Record<Parcela['status'], { texto: string; tom: Tom }> = {
  paga: { texto: 'Paga', tom: 'ok' },
  aberta: { texto: 'Em aberto', tom: 'acao' },
  vencida: { texto: 'Vencida', tom: 'erro' },
  nao_gerada: { texto: 'Não gerada', tom: 'espera' },
}

function ParcelaItem({
  x,
  aberta,
  liberado,
  onToggle,
  onCopiar,
  onPagar,
  onCartao,
}: {
  x: Parcela
  aberta: boolean
  liberado: boolean
  onToggle: () => void
  onCopiar: (texto: string, msg: string) => void
  onPagar: () => void
  onCartao: () => void
}) {
  const hoje = new Date()
  const st = STATUS_PARCELA[x.status]
  const quando =
    x.status === 'paga'
      ? `Paga em ${dataCurta(x.pagaEm!)}`
      : x.status === 'vencida'
        ? `Venceu em ${dataCurta(x.vencimento!)}`
        : x.status === 'aberta'
          ? `Vence ${diasEntre(hoje, x.vencimento!) <= 1 ? emDias(x.vencimento!, hoje) : `em ${dataCurta(x.vencimento!)}`}`
          : x.vencimento && x.geraEm && liberado
            ? `Gera ${emDias(x.geraEm, hoje)}, vence em ${dataCurta(x.vencimento)}`
            : x.regra
  const id = `v3-parcela-${x.id}`

  return (
    <li className={cn(styles.parcela, aberta && styles.parcelaAberta, styles[`parcela_${x.status}`])}>
      <button type="button" className={styles.parcelaTopo} aria-expanded={aberta} aria-controls={id} onClick={onToggle}>
        <span className={styles.parcelaInfo}>
          <span className={styles.parcelaNome}>
            {x.rotulo}
            <span className={cn(styles.pill, styles.pillMini, styles[`pill_${st.tom}`])}>{st.texto}</span>
          </span>
          <span className={styles.parcelaQuando}>{quando}</span>
        </span>
        <span className={styles.parcelaValor}>{moneyCents(x.valor)}</span>
        <span className={styles.chevronCirculo} aria-hidden>
          <Icon src={ICONS.chevronDown} size={14} />
        </span>
      </button>

      {aberta ? (
        <div id={id} className={styles.parcelaCorpo}>
          {x.status === 'paga' ? (
            <p className={styles.parcelaTexto}>
              Pagamento confirmado em {dataLonga(x.pagaEm!)}, com {x.pagaCom}.
            </p>
          ) : x.status === 'nao_gerada' ? (
            <div className={styles.vazio}>
              <span className={styles.avisoIcone} aria-hidden>
                <Relogio />
              </span>
              <div>
                <p className={styles.vazioTitulo}>Ainda não gerada</p>
                <p className={styles.parcelaTexto}>
                  {liberado && x.geraEm
                    ? `A cobrança é gerada ${emDias(x.geraEm, hoje)}, em ${dataLonga(x.geraEm)}, 10 dias antes do vencimento.`
                    : x.id === 'entrada'
                      ? 'A cobrança da entrada é gerada assim que você assina o contrato, com vencimento em 3 dias.'
                      : `Vence ${x.regra}. A cobrança é gerada 10 dias antes.`}
                </p>
              </div>
            </div>
          ) : (
            <div className={styles.pagar}>
              {x.status === 'vencida' ? <p className={styles.alerta}>Venceu em {dataLonga(x.vencimento!)}. O Pix e o boleto abaixo continuam valendo.</p> : null}
              <Codigo rotulo="Pix copia e cola" valor={x.pix!} onCopiar={() => onCopiar(x.pix!, 'Código Pix copiado')} />
              <Codigo rotulo="Boleto" valor={x.boleto!} onCopiar={() => onCopiar(x.boleto!, 'Linha do boleto copiada')} />
              <Button onClick={onCartao}>Pagar com cartão</Button>
              <button type="button" className={styles.simular} onClick={onPagar}>
                Simular pagamento confirmado (prévia)
              </button>
            </div>
          )}
        </div>
      ) : null}
    </li>
  )
}

/** Código para copiar: o valor em até 2 linhas e o botão "Copiar" ao lado */
function Codigo({ rotulo, valor, onCopiar }: { rotulo: string; valor: string; onCopiar: () => void }) {
  return (
    <div className={styles.codigo}>
      <span className={styles.codigoRotulo}>{rotulo}</span>
      <div className={styles.codigoLinha}>
        <span className={styles.codigoValor}>
          <span>{valor}</span>
        </span>
        <button type="button" className={styles.btnCopiar} onClick={onCopiar} aria-label={`Copiar ${rotulo.toLowerCase()}`}>
          Copiar
        </button>
      </div>
    </div>
  )
}

/* ================= Instalação ================= */

export function FolhaInstalacao({ p }: { p: Proposta }) {
  const o = p.obra
  if (o.status === 'aguardando') {
    return (
      <>
        <Cabecalho titulo="Instalação" status="Depois da vistoria" tom="espera" />
        <Aviso titulo="A data é combinada depois da vistoria" icone="relogio">
          A instalação acontece em até 30 dias depois da vistoria e de eventuais aditivos.
        </Aviso>
        <NoDia />
      </>
    )
  }
  if (o.status === 'agendada') {
    return (
      <>
        <Cabecalho titulo="Instalação" status={`Em ${dataCurta(o.data!)}`} tom="ok">
          A equipe iGreen vai até o local em {dataLonga(o.data!)}, pela manhã.
        </Cabecalho>
        <Secao titulo="Antes do dia">
          <ul className={styles.marcadores}>
            <li>Deixe o acesso ao padrão de entrada livre</li>
            <li>Mantenha a vaga desocupada</li>
          </ul>
        </Secao>
        <NoDia />
      </>
    )
  }
  return (
    <>
      <Cabecalho titulo="Instalação" status={`Feita em ${dataCurta(o.data!)}`} tom="ok">
        Instalação concluída em {dataLonga(o.data!)}. Laudos e checklist estão no envelope de entrega.
      </Cabecalho>
      <NoDia feito />
    </>
  )
}

function NoDia({ feito = false }: { feito?: boolean }) {
  return (
    <Secao titulo="No dia da instalação">
      <ol className={cn(styles.passos, feito && styles.passosFeitos)}>
        <li>Preparação elétrica e cabeamento</li>
        <li>Instalação do carregador e sinalização da vaga</li>
        <li>Testes e ativação na plataforma iGreen</li>
      </ol>
    </Secao>
  )
}

/* ================= Entrega ================= */

export function FolhaEntrega({ p, onDoc, onAceite }: { p: Proposta; onDoc: (d: DocEntrega) => void; onAceite: () => void }) {
  const [conferi, setConferi] = useState(false)
  const e = p.entrega
  const docs = documentosEntrega(p)
  const st =
    e.status === 'aceita'
      ? ({ texto: `Aceita em ${dataCurta(e.aceitaEm!)}`, tom: 'ok' } as const)
      : e.status === 'pronta'
        ? ({ texto: 'Para seu aceite', tom: 'acao' } as const)
        : ({ texto: 'Depois da instalação', tom: 'espera' } as const)

  return (
    <>
      <Cabecalho titulo="Entrega" status={st.texto} tom={st.tom}>
        No fim, tudo o que foi feito vem em um envelope só, para você conferir e dar o aceite.
      </Cabecalho>
      <Secao titulo={e.status === 'aguardando' ? 'O que vem no envelope' : 'Envelope de entrega'}>
        <div className={styles.docs}>
          {docs.map((d) => (
            <LinhaDoc key={d.id} titulo={d.nome} detalhe={d.detalhe} onClick={() => onDoc(d)} desabilitado={e.status === 'aguardando'} />
          ))}
        </div>
      </Secao>
      {e.status === 'pronta' ? (
        <div className={styles.assinar}>
          <Checkbox id="v3-conferi-entrega" checked={conferi} onChange={setConferi}>
            Conferi os documentos e recebi o eletroposto funcionando.
          </Checkbox>
          <Button onClick={onAceite} disabled={!conferi}>
            Dar aceite na entrega
          </Button>
        </div>
      ) : null}
      {e.status === 'aceita' ? (
        <div className={styles.feito}>
          <span className={styles.feitoIcone} aria-hidden>
            <Icon src={ICONS.checkBold} size={10} color="#fff" />
          </span>
          <p>Aceite dado em {dataLonga(e.aceitaEm!)}. Seu eletroposto está ativo.</p>
        </div>
      ) : null}
    </>
  )
}
