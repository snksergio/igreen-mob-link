import { useState, type ReactNode } from 'react'
import { ICONS } from '../../assets'
import { Button } from '../../components/ui/Button'
import { Checkbox } from '../../components/ui/Controls'
import { Icon } from '../../components/ui/Icon'
import { cn } from '../../lib/cn'
import { moneyCents } from '../../lib/format'
import { dataCurta, dataLonga, diasEntre, documentosEntrega, emDias, type DocEntrega, type Parcela, type Proposta } from '../data'
import styles from './Proposta.module.css'

/*
 * Folhas das etapas (versão 2). Regra visual: só o que é clicável tem borda e um indicador
 * (chevron em círculo, "Abrir" com seta, botão "Copiar"). Informação fica em texto ou em fundo tingido, sem caixa dentro de caixa.
 */

type Tom = 'ok' | 'acao' | 'espera' | 'erro'

function Cabecalho({ titulo, status, tom, children }: { titulo: string; status: string; tom: Tom; children?: ReactNode }) {
  return (
    <header className={styles.folhaHead}>
      <div className={styles.folhaHeadRow}>
        <h3 className={styles.folhaTitulo}>{titulo}</h3>
        <span className={cn(styles.pill, styles[`pill_${tom}`])}>{status}</span>
      </div>
      {children ? <p className={styles.folhaLead}>{children}</p> : null}
    </header>
  )
}

function Secao({ titulo, children, nota }: { titulo: string; children: ReactNode; nota?: ReactNode }) {
  return (
    <section className={styles.secao}>
      <h4 className={styles.secaoTitulo}>{titulo}</h4>
      {children}
      {nota ? <p className={styles.nota}>{nota}</p> : null}
    </section>
  )
}

function Linhas({ itens }: { itens: [string, ReactNode][] }) {
  return (
    <dl className={styles.linhas}>
      {itens.map(([k, v]) => (
        <div key={k} className={styles.linha}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Aviso informativo (não clicável): fundo tingido, ícone e texto */
function Aviso({ titulo, children, icone = 'cadeado', acao }: { titulo: string; children: ReactNode; icone?: 'cadeado' | 'relogio'; acao?: ReactNode }) {
  return (
    <div className={styles.aviso}>
      <span className={styles.avisoIcone} aria-hidden>
        {icone === 'cadeado' ? <Cadeado /> : <Relogio />}
      </span>
      <div className={styles.avisoTexto}>
        <p className={styles.avisoTitulo}>{titulo}</p>
        <p>{children}</p>
      </div>
      {acao ? <div className={styles.avisoAcao}>{acao}</div> : null}
    </div>
  )
}

function Cadeado() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

function Relogio() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

/** Linha clicável que abre um documento: borda, nome e "Abrir" com seta */
function LinhaDoc({ titulo, detalhe, onClick, desabilitado }: { titulo: string; detalhe: string; onClick: () => void; desabilitado?: boolean }) {
  return (
    <button type="button" className={styles.linhaDoc} onClick={onClick} disabled={desabilitado}>
      <span className={styles.docIcone} aria-hidden>
        <Icon src={ICONS.fileDollar} size={16} color={desabilitado ? 'var(--fg-muted)' : 'var(--fg-primary)'} />
      </span>
      <span className={styles.linhaDocTexto}>
        <span className={styles.linhaDocTitulo}>{titulo}</span>
        <span className={styles.linhaDocDetalhe}>{detalhe}</span>
      </span>
      {desabilitado ? null : (
        <span className={styles.abrir}>
          Abrir
          <Icon src={ICONS.arrowRight} size={14} color="var(--fg-primary)" />
        </span>
      )}
    </button>
  )
}

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

      <Secao titulo="Instalação" nota="Se a vistoria encontrar outra distância ou outro padrão, o ajuste vem como aditivo para você assinar aqui.">
        <Linhas
          itens={[
            ['Endereço', p.local.endereco],
            ['Cidade', `${p.local.cidade}/${p.local.uf}`],
            ['Padrão de entrada', p.local.padrao],
            ['Cabeamento', p.local.distancia],
          ]}
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

export function ContratoTexto({ p }: { p: Proposta }) {
  const [entrada, ...demais] = p.pagamento.parcelas
  const c = p.carregadores[0]
  return (
    <article className={styles.texto}>
      <p className={styles.textoAviso}>Texto de exemplo para a prévia.</p>
      <h5>Contrato de participação em eletroposto iGreen Mob</h5>
      <p>
        <b>Investidor:</b> {p.investidor.nome}, CPF {p.investidor.documento}. <b>iGreen Mob</b>, responsável pela instalação, operação e manutenção do
        eletroposto.
      </p>
      <h6>1. Objeto</h6>
      <p>
        Instalação e operação de {c.quantidade} eletroposto {c.modelo} ({c.potencia}, {c.conectores} conectores) em {p.local.endereco},{' '}
        {p.local.cidade}/{p.local.uf}, conforme a proposta nº {p.numero} (Anexo I).
      </p>
      <h6>2. Preço e pagamento</h6>
      <p>
        Valor total de {moneyCents(p.pagamento.total)}: entrada de {moneyCents(entrada.valor)} em até 3 dias da assinatura e {demais.length} parcelas de{' '}
        {moneyCents(demais[0].valor)} a cada 30 dias. Cada cobrança é gerada 10 dias antes do vencimento, por Pix, boleto ou cartão.
      </p>
      <h6>3. Vistoria e aditivos</h6>
      <p>
        Com a entrada paga, a iGreen faz a vistoria técnica. Mudanças de escopo, como cabeamento além do previsto, são formalizadas em aditivo, assinado
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
        {c.quantidade}× {c.modelo}, {c.potencia}. Local: {p.local.cidade}/{p.local.uf}. Padrão de entrada {p.local.padrao}, cabeamento {p.local.distancia}.
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

/* ================= Vistoria ================= */

export function FolhaVistoria({ p, onAditivo, onAssinarAditivo }: { p: Proposta; onAditivo: () => void; onAssinarAditivo: () => void }) {
  const [li, setLi] = useState(false)
  const v = p.vistoria
  const ad = v.aditivo

  if (v.status === 'aguardando') {
    return (
      <>
        <Cabecalho titulo="Vistoria técnica" status="Depois da entrada" tom="espera" />
        <Aviso titulo="Agendada assim que a entrada for paga">Um técnico iGreen confere o local e combina a data com você pelo WhatsApp.</Aviso>
        <OQueConfere />
      </>
    )
  }
  if (v.status === 'agendada') {
    return (
      <>
        <Cabecalho titulo="Vistoria técnica" status={`Em ${dataCurta(v.data!)}`} tom="ok">
          Um técnico iGreen vai até o local em {dataLonga(v.data!)}.
        </Cabecalho>
        <OQueConfere />
      </>
    )
  }
  return (
    <>
      <Cabecalho
        titulo="Vistoria técnica"
        status={ad?.status === 'aguardando' ? 'Aditivo para assinar' : `Feita em ${dataCurta(v.data!)}`}
        tom={ad?.status === 'aguardando' ? 'acao' : 'ok'}
      >
        Vistoria feita em {dataLonga(v.data!)}. O laudo fica no envelope de entrega.
      </Cabecalho>
      {ad ? (
        <Secao titulo={`Aditivo nº ${ad.numero}: ${ad.titulo}`}>
          <p className={styles.parcelaTexto}>{ad.motivo}</p>
          <Linhas
            itens={[
              ['Valor', `${moneyCents(ad.valor)}, somado à próxima parcela`],
              ['Situação', ad.status === 'assinado' ? `Assinado em ${dataLonga(ad.assinadoEm!)}` : 'Aguardando sua assinatura'],
            ]}
          />
          <LinhaDoc titulo={`Aditivo nº ${ad.numero}`} detalhe="Leia antes de assinar" onClick={onAditivo} />
          {ad.status === 'aguardando' ? (
            <div className={styles.assinar}>
              <Checkbox id="v3-li-aditivo" checked={li} onChange={setLi}>
                Li o aditivo nº {ad.numero} e concordo.
              </Checkbox>
              <Button onClick={onAssinarAditivo} disabled={!li}>
                Assinar aditivo
              </Button>
            </div>
          ) : null}
        </Secao>
      ) : (
        <p className={styles.parcelaTexto}>Tudo conforme a proposta. Nenhum aditivo foi necessário.</p>
      )}
    </>
  )
}

function OQueConfere() {
  return (
    <Secao titulo="O que a vistoria confere">
      <ul className={styles.marcadores}>
        {['Padrão de entrada e disjuntor', 'Distância do padrão até a vaga', 'Piso, cobertura e sinalização da vaga'].map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </Secao>
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
