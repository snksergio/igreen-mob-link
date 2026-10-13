import { useState, type ReactNode } from 'react'
import { ICONS } from '../assets'
import { Button } from '../components/ui/Button'
import { Checkbox, FancyIcon } from '../components/ui/Controls'
import { Icon } from '../components/ui/Icon'
import { cn } from '../lib/cn'
import { moneyCents } from '../lib/format'
import { dataCurta, dataLonga, diasEntre, documentosEntrega, emDias, type DocEntrega, type Parcela, type Proposta } from './data'
import styles from './PropostaV2.module.css'

/* Folhas de cada etapa do andamento. Cada uma abre abaixo do trilho quando a etapa é escolhida. */

type Tom = 'ok' | 'acao' | 'espera' | 'erro'

export function SheetHead({ titulo, status, tom, children }: { titulo: string; status: string; tom: Tom; children?: ReactNode }) {
  return (
    <header className={styles.sheetHead}>
      <div className={styles.sheetHeadRow}>
        <h3 className={styles.sheetTitle}>{titulo}</h3>
        <span className={cn(styles.pill, styles[`pill_${tom}`])}>{status}</span>
      </div>
      {children ? <p className={styles.sheetLead}>{children}</p> : null}
    </header>
  )
}

function Bloco({ titulo, children, nota }: { titulo: string; children: ReactNode; nota?: ReactNode }) {
  return (
    <section className={styles.bloco}>
      <h4 className={styles.blocoTitle}>{titulo}</h4>
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

/** Estado bloqueado: diz o que libera a etapa */
function Bloqueado({ titulo, children, acao }: { titulo: string; children: ReactNode; acao?: ReactNode }) {
  return (
    <div className={styles.bloqueado}>
      <span className={styles.cadeado} aria-hidden>
        <Cadeado />
      </span>
      <p className={styles.bloqueadoTitle}>{titulo}</p>
      <p className={styles.bloqueadoText}>{children}</p>
      {acao}
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

/* ================= Proposta ================= */

export function SheetProposta({ p, onAceitar, onRecusar }: { p: Proposta; onAceitar: () => void; onRecusar: () => void }) {
  const entrada = p.pagamento.parcelas[0]
  const demais = p.pagamento.parcelas.slice(1)
  const status =
    p.resposta.status === 'aguardando'
      ? ({ texto: 'Aguardando resposta', tom: 'acao' } as const)
      : p.resposta.status === 'aceita'
        ? ({ texto: `Aceita em ${dataCurta(p.resposta.em!)}`, tom: 'ok' } as const)
        : ({ texto: `Recusada em ${dataCurta(p.resposta.em!)}`, tom: 'erro' } as const)

  return (
    <>
      <SheetHead titulo="A proposta" status={status.texto} tom={status.tom}>
        O que você contrata, onde fica e como paga. Esta proposta entra no contrato como Anexo I.
      </SheetHead>

      <Bloco titulo="Produto">
        {p.carregadores.map((c, i) => (
          <div key={i} className={styles.produto}>
            <div className={styles.produtoTop}>
              <FancyIcon src={ICONS.energyLink} bg="var(--bg-primary)" size={40} iconSize={20} />
              <div>
                <p className={styles.produtoNome}>
                  {c.quantidade}× {c.modelo}
                </p>
                <p className={styles.produtoMeta}>{c.potencia} por carregador</p>
              </div>
            </div>
            <table className={styles.itens}>
              <caption className={styles.srOnly}>Itens do carregador {c.modelo}</caption>
              <tbody>
                <tr>
                  <th scope="row">Potência</th>
                  <td>{c.potencia}</td>
                </tr>
                <tr>
                  <th scope="row">Conectores</th>
                  <td>{c.conectores} por carregador</td>
                </tr>
                <tr>
                  <th scope="row">Vagas</th>
                  <td>{c.vagas} por carregador</td>
                </tr>
                {p.inclusos.map((item) => (
                  <tr key={item}>
                    <th scope="row">{item}</th>
                    <td className={styles.incluso}>
                      <Icon src={ICONS.checkBold} size={9} color="var(--fg-primary)" /> Incluso
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </Bloco>

      <Bloco titulo="Instalação" nota="Se a vistoria encontrar outra distância ou outro padrão, o ajuste vem como aditivo para você assinar aqui.">
        <Linhas
          itens={[
            ['Endereço', p.local.endereco],
            ['Cidade', `${p.local.cidade}/${p.local.uf}`],
            ['Padrão de entrada', p.local.padrao],
            ['Cabeamento', p.local.distancia],
          ]}
        />
      </Bloco>

      <Bloco titulo="Forma de pagamento">
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
      </Bloco>

      <Bloco titulo="Condições">
        <Linhas
          itens={[
            ['Participação', p.condicoes.participacao],
            ['Taxa iGreen', p.condicoes.taxa],
            ['Emitida em', dataLonga(p.emitidaEm)],
            ['Válida até', dataLonga(p.validaAte)],
          ]}
        />
      </Bloco>

      {p.resposta.status === 'aguardando' ? (
        <div className={styles.sheetActions}>
          <Button onClick={onAceitar}>Aceitar proposta</Button>
          <Button variant="secondary" onClick={onRecusar}>
            Recusar proposta
          </Button>
        </div>
      ) : null}
      {p.resposta.status === 'recusada' && p.resposta.motivo ? <p className={styles.nota}>Motivo informado: {p.resposta.motivo}.</p> : null}
    </>
  )
}

/* ================= Contrato ================= */

export function SheetContrato({
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
        <SheetHead titulo="Contrato" status={p.resposta.status === 'recusada' ? 'Não liberado' : 'Depois do aceite'} tom="espera" />
        <Bloqueado
          titulo="O contrato abre quando você aceita a proposta"
          acao={p.resposta.status === 'aguardando' ? <Button onClick={onAceitar}>Aceitar proposta</Button> : undefined}
        >
          Você lê e assina aqui mesmo, sem precisar de e-mail. A proposta vira o Anexo I do contrato.
        </Bloqueado>
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
      <SheetHead
        titulo="Contrato"
        status={assinado ? `Assinado em ${dataCurta(p.contrato.assinadoEm!)}` : 'Para assinar'}
        tom={assinado ? 'ok' : 'acao'}
      >
        Leia com calma. A proposta está no fim, como Anexo I.
      </SheetHead>

      {/* Na versão final, este quadro mostra o documento do serviço de assinatura eletrônica */}
      <div className={styles.doc}>
        <div className={styles.docBar}>
          <span className={styles.docName}>Contrato nº {p.numero}</span>
          <button type="button" className={styles.docBtn} onClick={onTelaCheia}>
            Tela cheia
          </button>
        </div>
        <div className={styles.docBody} tabIndex={0} aria-label="Texto do contrato">
          <ContratoTexto p={p} />
        </div>
      </div>

      {assinado ? (
        <div className={styles.assinatura}>
          <Icon src={ICONS.checkBold} size={11} color="#fff" className={styles.assinaturaIcon} />
          <p>
            Assinado eletronicamente por <b>{p.investidor.nome}</b> em {dataLonga(p.contrato.assinadoEm!)}.
          </p>
        </div>
      ) : (
        <div className={styles.assinar}>
          <Checkbox id="li-contrato" checked={li} onChange={setLi}>
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

/** Texto de exemplo do contrato, preenchido com a proposta (o real vem do sistema de assinatura) */
export function ContratoTexto({ p }: { p: Proposta }) {
  const [entrada, ...demais] = p.pagamento.parcelas
  const c = p.carregadores[0]
  return (
    <article className={styles.contrato}>
      <p className={styles.contratoAviso}>Texto de exemplo para a prévia.</p>
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
      <p>
        A instalação acontece em até 30 dias após a vistoria. Ao final, o investidor recebe o termo de entrega com laudos e checklists, para dar o aceite.
      </p>
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

export function SheetPagamento({
  p,
  aberta,
  onAbrir,
  onCopiar,
  onPagar,
  onLink,
}: {
  p: Proposta
  aberta: string | null
  onAbrir: (id: string | null) => void
  onCopiar: (texto: string, msg: string) => void
  onPagar: (id: string) => void
  onLink: () => void
}) {
  const liberado = p.contrato.status === 'assinado'
  const parcelas = p.pagamento.parcelas
  const pagas = parcelas.filter((x) => x.status === 'paga')
  const totalPago = pagas.reduce((s, x) => s + x.valor, 0)
  const vencida = parcelas.some((x) => x.status === 'vencida')
  const status = !liberado
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
      <SheetHead titulo="Pagamento" status={status.texto} tom={status.tom}>
        Entrada e mais {parcelas.length - 1} parcelas. Cada cobrança aparece aqui 10 dias antes do vencimento.
      </SheetHead>

      {liberado ? (
        <div className={styles.resumoPag}>
          <div className={styles.resumoPagTop}>
            <span>
              <b>{moneyCents(totalPago)}</b> pagos de {moneyCents(p.pagamento.total)}
            </span>
            <span className={styles.resumoPagConta}>
              {pagas.length} de {parcelas.length}
            </span>
          </div>
          <div
            className={styles.barraPag}
            role="progressbar"
            aria-label="Valor pago"
            aria-valuemin={0}
            aria-valuemax={p.pagamento.total}
            aria-valuenow={totalPago}
          >
            <span style={{ width: `${(totalPago / p.pagamento.total) * 100}%` }} />
          </div>
        </div>
      ) : (
        <Bloqueado titulo="O pagamento é liberado depois da assinatura do contrato">
          Assim que você assinar, a cobrança da entrada aparece aqui com Pix, boleto e link de pagamento. Veja abaixo como fica.
        </Bloqueado>
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
            onLink={onLink}
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
  onLink,
}: {
  x: Parcela
  aberta: boolean
  liberado: boolean
  onToggle: () => void
  onCopiar: (texto: string, msg: string) => void
  onPagar: () => void
  onLink: () => void
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
  const id = `parcela-${x.id}`

  return (
    <li className={cn(styles.parcela, aberta && styles.parcelaAberta, styles[`parcela_${x.status}`])}>
      <button type="button" className={styles.parcelaHead} aria-expanded={aberta} aria-controls={id} onClick={onToggle}>
        <span className={styles.parcelaInfo}>
          <span className={styles.parcelaNome}>{x.rotulo}</span>
          <span className={styles.parcelaQuando}>{quando}</span>
        </span>
        <span className={styles.parcelaLado}>
          <span className={styles.parcelaValor}>{moneyCents(x.valor)}</span>
          <span className={cn(styles.pill, styles[`pill_${st.tom}`])}>{st.texto}</span>
        </span>
        <Icon src={ICONS.chevronDown} size={16} className={styles.parcelaChevron} />
      </button>

      {aberta ? (
        <div id={id} className={styles.parcelaBody}>
          {x.status === 'paga' ? (
            <p className={styles.parcelaTexto}>
              Pagamento confirmado em {dataLonga(x.pagaEm!)}, com {x.pagaCom}.
            </p>
          ) : x.status === 'nao_gerada' ? (
            <div className={styles.vazio}>
              <p className={styles.vazioTitle}>Ainda não gerada</p>
              <p className={styles.parcelaTexto}>
                {liberado && x.geraEm
                  ? `A cobrança é gerada ${emDias(x.geraEm, hoje)}, em ${dataLonga(x.geraEm)}, 10 dias antes do vencimento.`
                  : x.id === 'entrada'
                    ? 'A cobrança da entrada é gerada assim que você assina o contrato, com vencimento em 3 dias.'
                    : `Vence ${x.regra}. A cobrança é gerada 10 dias antes.`}
              </p>
            </div>
          ) : (
            <div className={styles.pagar}>
              {x.status === 'vencida' ? <p className={styles.alerta}>Venceu em {dataLonga(x.vencimento!)}. O Pix e o boleto abaixo continuam valendo.</p> : null}
              <div className={styles.codigo}>
                <span className={styles.codigoLabel}>Pix copia e cola</span>
                <span className={styles.codigoValor}>
                  <span>{x.pix}</span>
                </span>
                <button type="button" className={styles.codigoBtn} onClick={() => onCopiar(x.pix!, 'Código Pix copiado')}>
                  Copiar código Pix
                </button>
              </div>
              <div className={styles.codigo}>
                <span className={styles.codigoLabel}>Boleto</span>
                <span className={styles.codigoValor}>
                  <span>{x.boleto}</span>
                </span>
                <button type="button" className={styles.codigoBtn} onClick={() => onCopiar(x.boleto!, 'Linha do boleto copiada')}>
                  Copiar linha do boleto
                </button>
              </div>
              <Button onClick={onLink}>Pagar com cartão</Button>
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

/* ================= Vistoria ================= */

export function SheetVistoria({ p, onAditivo, onAssinarAditivo }: { p: Proposta; onAditivo: () => void; onAssinarAditivo: () => void }) {
  const [li, setLi] = useState(false)
  const v = p.vistoria
  const ad = v.aditivo

  if (v.status === 'aguardando') {
    return (
      <>
        <SheetHead titulo="Vistoria técnica" status="Depois da entrada" tom="espera" />
        <Bloqueado titulo="Agendamos a vistoria assim que a entrada for paga">
          Um técnico iGreen confere o local e combina a data com você pelo WhatsApp.
        </Bloqueado>
        <OQueVemos />
      </>
    )
  }
  if (v.status === 'agendada') {
    return (
      <>
        <SheetHead titulo="Vistoria técnica" status={`Em ${dataCurta(v.data!)}`} tom="ok">
          Um técnico iGreen vai até o local em {dataLonga(v.data!)}.
        </SheetHead>
        <OQueVemos />
      </>
    )
  }
  return (
    <>
      <SheetHead
        titulo="Vistoria técnica"
        status={ad?.status === 'aguardando' ? 'Aditivo para assinar' : `Feita em ${dataCurta(v.data!)}`}
        tom={ad?.status === 'aguardando' ? 'acao' : 'ok'}
      >
        Vistoria feita em {dataLonga(v.data!)}. O laudo fica no envelope de entrega.
      </SheetHead>
      {ad ? (
        <div className={styles.aditivo}>
          <p className={styles.aditivoNum}>Aditivo nº {ad.numero}</p>
          <p className={styles.aditivoTitulo}>{ad.titulo}</p>
          <p className={styles.parcelaTexto}>{ad.motivo}</p>
          <Linhas
            itens={[
              ['Valor', `${moneyCents(ad.valor)}, somado à próxima parcela`],
              ['Situação', ad.status === 'assinado' ? `Assinado em ${dataLonga(ad.assinadoEm!)}` : 'Aguardando sua assinatura'],
            ]}
          />
          <button type="button" className={styles.docBtn} onClick={onAditivo}>
            Ler o aditivo
          </button>
          {ad.status === 'aguardando' ? (
            <div className={styles.assinar}>
              <Checkbox id="li-aditivo" checked={li} onChange={setLi}>
                Li o aditivo nº {ad.numero} e concordo.
              </Checkbox>
              <Button onClick={onAssinarAditivo} disabled={!li}>
                Assinar aditivo
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <p className={styles.parcelaTexto}>Tudo conforme a proposta. Nenhum aditivo foi necessário.</p>
      )}
    </>
  )
}

function OQueVemos() {
  return (
    <Bloco titulo="O que a vistoria confere">
      <ul className={styles.checklist}>
        {['Padrão de entrada e disjuntor', 'Distância do padrão até a vaga', 'Piso, cobertura e sinalização da vaga'].map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </Bloco>
  )
}

/* ================= Instalação ================= */

export function SheetInstalacao({ p }: { p: Proposta }) {
  const o = p.obra
  if (o.status === 'aguardando') {
    return (
      <>
        <SheetHead titulo="Instalação" status="Depois da vistoria" tom="espera" />
        <Bloqueado titulo="A data é combinada depois da vistoria">A instalação acontece em até 30 dias depois da vistoria e de eventuais aditivos.</Bloqueado>
        <EtapasObra />
      </>
    )
  }
  if (o.status === 'agendada') {
    return (
      <>
        <SheetHead titulo="Instalação" status={`Em ${dataCurta(o.data!)}`} tom="ok">
          A equipe iGreen vai até o local em {dataLonga(o.data!)}, pela manhã.
        </SheetHead>
        <Bloco titulo="Antes do dia">
          <ul className={styles.checklist}>
            <li>Deixe o acesso ao padrão de entrada livre</li>
            <li>Mantenha a vaga desocupada</li>
          </ul>
        </Bloco>
        <EtapasObra />
      </>
    )
  }
  return (
    <>
      <SheetHead titulo="Instalação" status={`Feita em ${dataCurta(o.data!)}`} tom="ok">
        Instalação concluída em {dataLonga(o.data!)}. Laudos e checklist estão no envelope de entrega.
      </SheetHead>
      <EtapasObra feito />
    </>
  )
}

function EtapasObra({ feito = false }: { feito?: boolean }) {
  return (
    <Bloco titulo="No dia da instalação">
      <ol className={cn(styles.passos, feito && styles.passosFeitos)}>
        <li>Preparação elétrica e cabeamento</li>
        <li>Instalação do carregador e sinalização da vaga</li>
        <li>Testes e ativação na plataforma iGreen</li>
      </ol>
    </Bloco>
  )
}

/* ================= Entrega ================= */

export function SheetEntrega({ p, onDoc, onAceite }: { p: Proposta; onDoc: (d: DocEntrega) => void; onAceite: () => void }) {
  const [conferi, setConferi] = useState(false)
  const e = p.entrega
  const docs = documentosEntrega(p)
  const status =
    e.status === 'aceita'
      ? ({ texto: `Aceita em ${dataCurta(e.aceitaEm!)}`, tom: 'ok' } as const)
      : e.status === 'pronta'
        ? ({ texto: 'Para seu aceite', tom: 'acao' } as const)
        : ({ texto: 'Depois da instalação', tom: 'espera' } as const)

  return (
    <>
      <SheetHead titulo="Entrega" status={status.texto} tom={status.tom}>
        No fim, tudo o que foi feito vem em um envelope só, para você conferir e dar o aceite.
      </SheetHead>
      <ul className={cn(styles.envelope, e.status === 'aguardando' && styles.envelopeEspera)}>
        {docs.map((d) => (
          <li key={d.id}>
            <button type="button" className={styles.envelopeItem} onClick={() => onDoc(d)} disabled={e.status === 'aguardando'}>
              <FancyIcon src={ICONS.fileDollar} bg={e.status === 'aguardando' ? 'var(--bg-fill)' : 'var(--bg-primary)'} size={36} multicolor />
              <span className={styles.envelopeText}>
                <span className={styles.envelopeNome}>{d.nome}</span>
                <span className={styles.envelopeDetalhe}>{d.detalhe}</span>
              </span>
              {e.status === 'aguardando' ? null : <span className={styles.envelopeVer}>Ver</span>}
            </button>
          </li>
        ))}
      </ul>
      {e.status === 'pronta' ? (
        <div className={styles.assinar}>
          <Checkbox id="conferi-entrega" checked={conferi} onChange={setConferi}>
            Conferi os documentos e recebi o eletroposto funcionando.
          </Checkbox>
          <Button onClick={onAceite} disabled={!conferi}>
            Dar aceite na entrega
          </Button>
        </div>
      ) : null}
      {e.status === 'aceita' ? (
        <div className={styles.assinatura}>
          <Icon src={ICONS.checkBold} size={11} color="#fff" className={styles.assinaturaIcon} />
          <p>Aceite dado em {dataLonga(e.aceitaEm!)}. Seu eletroposto está ativo.</p>
        </div>
      ) : null}
    </>
  )
}

