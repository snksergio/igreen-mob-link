import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ICONS, IMAGES } from '../assets'
import { ThemeToggle } from '../components/layout/PageShell'
import { Button } from '../components/ui/Button'
import { Icon, Img } from '../components/ui/Icon'
import { Modal } from '../components/ui/Modal'
import { cn } from '../lib/cn'
import { moneyCents } from '../lib/format'
import { useTheme } from '../lib/theme'
import {
  CENARIOS,
  aceitar,
  aceitarEntrega,
  assinarAditivo,
  assinarContrato,
  dataLonga,
  diasEntre,
  etapaEmFoco,
  etapas,
  isCenario,
  montarProposta,
  pagar,
  proximoPasso,
  recusar,
  type Cenario,
  type DocEntrega,
  type EtapaId,
  type Passo,
  type Proposta,
} from './data'
import { ContratoTexto, SheetContrato, SheetEntrega, SheetInstalacao, SheetPagamento, SheetProposta, SheetVistoria } from './Sheets'
import { Timeline } from './Timeline'
import styles from './PropostaV2.module.css'

/*
 * Proposta gerada, modelo novo (só local, com dados de exemplo).
 * Endereço: #proposta-v2/<número>?cenario=<etapa> (ver routes.ts). Abre direto, sem passar pelo cadastro.
 */

const lerCenario = (): Cenario => {
  const c = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('cenario')
  return isCenario(c) ? c : 'nova'
}

/** Parcela que abre por padrão: a primeira que pede pagamento */
const parcelaEmFoco = (p: Proposta) => p.pagamento.parcelas.find((x) => x.status === 'vencida' || x.status === 'aberta')?.id ?? null

const MOTIVOS = ['O valor não cabe no meu orçamento agora', 'Prefiro outro modelo de eletroposto', 'O local não vai funcionar', 'Outro motivo']

type Doc = { titulo: string; conteudo: ReactNode }

export function PropostaV2() {
  const id = useId()
  const theme = useTheme()
  const [cenario, setCenario] = useState<Cenario>(lerCenario)
  const [p, setP] = useState(() => montarProposta(cenario))
  const lista = useMemo(() => etapas(p), [p])
  const passo = useMemo(() => proximoPasso(p), [p])
  const [sel, setSel] = useState<EtapaId>(() => etapaEmFoco(etapas(p)))
  const [parcelaAberta, setParcelaAberta] = useState<string | null>(() => parcelaEmFoco(p))
  const [ponteiro, setPonteiro] = useState(40)
  const [recusando, setRecusando] = useState(false)
  const [doc, setDoc] = useState<Doc | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const passoRef = useRef<HTMLElement>(null)
  const folhaRef = useRef<HTMLDivElement>(null)
  const [passoVisivel, setPassoVisivel] = useState(true)

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(t)
  }, [toast])

  // Barra fixa com a ação principal aparece quando o card "Próximo passo" sai da tela
  useEffect(() => {
    const el = passoRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setPassoVisivel(e.isIntersecting), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const aplicarCenario = useCallback((c: Cenario) => {
    const novo = montarProposta(c)
    setCenario(c)
    setP(novo)
    setSel(etapaEmFoco(etapas(novo)))
    setParcelaAberta(parcelaEmFoco(novo))
  }, [])

  const trocarCenario = (c: Cenario) => {
    const [base] = window.location.hash.split('?')
    window.history.replaceState(null, '', `${base || '#proposta-v2'}?cenario=${c}`)
    aplicarCenario(c)
  }

  // Colar outro endereço (?cenario=...) na mesma aba também troca a prévia
  useEffect(() => {
    const onHash = () => aplicarCenario(lerCenario())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [aplicarCenario])

  const irPara = useCallback((etapa: EtapaId) => {
    setSel(etapa)
    requestAnimationFrame(() => folhaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }, [])

  /* ---------- ações ---------- */
  const onAceitar = () => {
    setP(aceitar(p))
    setToast('Proposta aceita. Agora é só assinar o contrato.')
    irPara('contrato')
  }
  const onRecusar = (motivo: string) => {
    setP(recusar(p, motivo))
    setRecusando(false)
    setSel('proposta')
    setToast(`Proposta recusada. Avisamos ${p.licenciado.nome.split(' ')[0]}.`)
  }
  const onAssinar = () => {
    const n = assinarContrato(p)
    setP(n)
    setParcelaAberta(parcelaEmFoco(n))
    setToast('Contrato assinado. O pagamento da entrada foi liberado.')
    irPara('pagamento')
  }
  const onPagar = (parcela: string) => {
    const n = pagar(p, parcela)
    setP(n)
    setParcelaAberta(parcelaEmFoco(n))
    setToast(`${p.pagamento.parcelas.find((x) => x.id === parcela)?.rotulo} paga.`)
  }
  const onAssinarAditivo = () => {
    setP(assinarAditivo(p))
    setToast('Aditivo assinado. A instalação foi agendada.')
  }
  const onAceite = () => {
    setP(aceitarEntrega(p))
    setToast('Aceite registrado. Seu eletroposto está ativo.')
  }
  const copiar = async (texto: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(texto)
      setToast(msg)
    } catch {
      setToast('Não foi possível copiar')
    }
  }

  const whatsapp = `https://wa.me/${p.licenciado.whatsapp}?text=${encodeURIComponent(`Olá, ${p.licenciado.nome.split(' ')[0]}! Sobre a proposta nº ${p.numero}:`)}`

  const agir = (a: NonNullable<Passo['acao']>) => {
    if (a.tipo === 'aceitar') return onAceitar()
    if (a.tipo === 'whatsapp') return void window.open(whatsapp, '_blank', 'noopener')
    if (a.tipo === 'pagar' && a.parcela) setParcelaAberta(a.parcela)
    irPara(passo.etapa)
  }

  const abrirDocEntrega = (d: DocEntrega) => {
    if (d.id === 'contrato') return setDoc({ titulo: 'Contrato assinado', conteudo: <ContratoTexto p={p} /> })
    if (d.id === 'aditivo') return setDoc({ titulo: d.nome, conteudo: <AditivoTexto p={p} /> })
    setDoc({ titulo: d.nome, conteudo: <DocExemplo nome={d.nome} p={p} /> })
  }

  const folha: Record<EtapaId, ReactNode> = {
    proposta: <SheetProposta p={p} onAceitar={onAceitar} onRecusar={() => setRecusando(true)} />,
    contrato: (
      <SheetContrato
        p={p}
        onAceitar={onAceitar}
        onAssinar={onAssinar}
        onTelaCheia={() => setDoc({ titulo: `Contrato nº ${p.numero}`, conteudo: <ContratoTexto p={p} /> })}
      />
    ),
    pagamento: (
      <SheetPagamento
        p={p}
        aberta={parcelaAberta}
        onAbrir={setParcelaAberta}
        onCopiar={copiar}
        onPagar={onPagar}
        onLink={() => setToast('Na versão final, abre o pagamento com cartão.')}
      />
    ),
    vistoria: (
      <SheetVistoria
        p={p}
        onAditivo={() => setDoc({ titulo: `Aditivo nº ${p.vistoria.aditivo?.numero}`, conteudo: <AditivoTexto p={p} /> })}
        onAssinarAditivo={onAssinarAditivo}
      />
    ),
    instalacao: <SheetInstalacao p={p} />,
    entrega: <SheetEntrega p={p} onDoc={abrirDocEntrega} onAceite={onAceite} />,
  }

  const aguardando = p.resposta.status === 'aguardando'
  const recusada = p.resposta.status === 'recusada'
  const situacao = recusada ? 'Recusada' : aguardando ? 'Aguardando sua resposta' : p.entrega.status === 'aceita' ? 'Concluída' : 'Em andamento'
  const heroImg = theme === 'dark' ? IMAGES.propostaHeroDark : IMAGES.propostaHero
  const link = `${window.location.origin}${window.location.pathname}#proposta-v2/${p.numero}`

  return (
    <main className={styles.page}>
      <div className={styles.demo}>
        <label htmlFor={`${id}-cenario`}>Prévia local. Ver a proposta em:</label>
        <select id={`${id}-cenario`} value={cenario} onChange={(e) => trocarCenario(e.target.value as Cenario)}>
          {CENARIOS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <header className={styles.topbar}>
        <img src={ICONS.logoEnergy} width={88} height={28} alt="iGreen Energy" />
        <ThemeToggle />
      </header>

      <div className={styles.hero} aria-hidden>
        <img src={heroImg} alt="" className={styles.heroImg} />
      </div>

      <div className={styles.content}>
        {/* ---------- Capa ---------- */}
        <section className={styles.capa} aria-labelledby={`${id}-titulo`}>
          <div className={styles.capaTop}>
            <span className={styles.numero}>Proposta nº {p.numero}</span>
            <span className={cn(styles.pill, recusada ? styles.pill_erro : aguardando ? styles.pill_acao : styles.pill_ok)}>{situacao}</span>
          </div>
          <h1 id={`${id}-titulo`} className={styles.titulo}>
            {p.produto.nome}
          </h1>
          <p className={styles.subtitulo}>
            {p.carregadores[0].quantidade} eletroposto de {p.produto.potencia} em {p.local.cidade}/{p.local.uf}
          </p>
          {aguardando ? <Validade p={p} /> : null}
          <p className={styles.emissor}>
            Emitida em {dataLonga(p.emitidaEm)} por <b>{p.licenciado.nome}</b>, sua licenciada.
          </p>
        </section>

        {/* ---------- Próximo passo ---------- */}
        <section ref={passoRef} className={styles.passo} style={{ backgroundImage: `url(${IMAGES.greenCard})` }} aria-labelledby={`${id}-passo`}>
          <p className={styles.passoLabel}>Próximo passo</p>
          <h2 id={`${id}-passo`} className={styles.passoTitulo}>
            {passo.titulo}
          </h2>
          <p className={styles.passoTexto}>{passo.texto}</p>
          {aguardando ? (
            <div className={styles.passoAcoes}>
              <button type="button" className={styles.btnClaro} onClick={onAceitar}>
                Aceitar proposta
              </button>
              <button type="button" className={styles.btnContorno} onClick={() => setRecusando(true)}>
                Recusar
              </button>
            </div>
          ) : passo.acao ? (
            <div className={styles.passoAcoes}>
              <button type="button" className={styles.btnClaro} onClick={() => agir(passo.acao!)}>
                {passo.acao.label}
              </button>
            </div>
          ) : null}
        </section>

        {/* ---------- Andamento ---------- */}
        <section className={styles.andamento} aria-labelledby={`${id}-andamento`}>
          <div className={styles.secHead}>
            <h2 id={`${id}-andamento`} className={styles.secTitulo}>
              Andamento
            </h2>
            <p className={styles.secTexto}>Toque em uma etapa para ver os detalhes.</p>
          </div>
          <Timeline etapas={lista} selected={sel} onSelect={setSel} onPointer={setPonteiro} idBase={id} />
          <div
            ref={folhaRef}
            id={`${id}-folha`}
            role="tabpanel"
            aria-labelledby={`${id}-tab-${sel}`}
            className={styles.folha}
            style={{ '--ponteiro': `${ponteiro}px` } as CSSProperties}
          >
            <div key={sel} className={styles.folhaConteudo}>
              {folha[sel]}
            </div>
          </div>
        </section>

        {/* ---------- Pessoas e compartilhamento ---------- */}
        <section className={styles.cartao} aria-label="Seu licenciado">
          <div className={styles.pessoa}>
            <span className={styles.avatar} aria-hidden>
              {p.licenciado.nome
                .split(' ')
                .filter((_, i, a) => i === 0 || i === a.length - 1)
                .map((n) => n[0])
                .join('')}
            </span>
            <div className={styles.pessoaTexto}>
              <p className={styles.pessoaNome}>{p.licenciado.nome}</p>
              <p className={styles.pessoaPapel}>Sua licenciada iGreen, {p.licenciado.telefone}</p>
            </div>
          </div>
          <div className={styles.pessoaAcoes}>
            <a className={styles.btnLink} href={whatsapp} target="_blank" rel="noreferrer">
              <Img src={ICONS.whatsapp} size={18} />
              WhatsApp
            </a>
            <a className={styles.btnLink} href={`tel:+${p.licenciado.whatsapp}`}>
              <Img src={ICONS.phone} size={18} />
              Ligar
            </a>
          </div>
        </section>

        <section className={styles.cartao} aria-labelledby={`${id}-investidor`}>
          <h2 id={`${id}-investidor`} className={styles.cartaoTitulo}>
            Investidor
          </h2>
          <dl className={styles.linhas}>
            <div className={styles.linha}>
              <dt>Nome</dt>
              <dd>{p.investidor.nome}</dd>
            </div>
            <div className={styles.linha}>
              <dt>CPF</dt>
              <dd>{p.investidor.documento}</dd>
            </div>
            <div className={styles.linha}>
              <dt>E-mail</dt>
              <dd>{p.investidor.email}</dd>
            </div>
          </dl>
        </section>

        <section className={styles.compartilhar} aria-label="Compartilhar proposta">
          <a className={styles.share} href={`https://wa.me/?text=${encodeURIComponent(`Proposta iGreen Mob nº ${p.numero}: ${link}`)}`} target="_blank" rel="noreferrer">
            <span className={styles.shareIcon}>
              <Img src={ICONS.whatsapp} size={20} />
            </span>
            WhatsApp
          </a>
          <a className={styles.share} href={`mailto:?subject=${encodeURIComponent(`Proposta iGreen Mob nº ${p.numero}`)}&body=${encodeURIComponent(link)}`}>
            <span className={styles.shareIcon}>
              <Img src={ICONS.mailShare} size={20} />
            </span>
            E-mail
          </a>
          <button type="button" className={styles.share} onClick={() => copiar(link, 'Link da proposta copiado')}>
            <span className={styles.shareIcon}>
              <Img src={ICONS.link} size={20} />
            </span>
            Copiar link
          </button>
        </section>
      </div>

      {/* ---------- Barra fixa (celular e desktop) ---------- */}
      {(aguardando || passo.acao) && !passoVisivel ? (
        <div className={styles.barra}>
          <p className={styles.barraTexto}>{passo.titulo}</p>
          {aguardando ? (
            <div className={styles.barraAcoes}>
              <Button variant="secondary" className={styles.barraBtn} onClick={() => setRecusando(true)}>
                Recusar
              </Button>
              <Button className={styles.barraBtn} onClick={onAceitar}>
                Aceitar
              </Button>
            </div>
          ) : (
            <Button className={styles.barraBtn} onClick={() => agir(passo.acao!)}>
              {passo.acao!.label}
            </Button>
          )}
        </div>
      ) : null}

      <RecusarModal open={recusando} onClose={() => setRecusando(false)} onConfirmar={onRecusar} licenciado={p.licenciado.nome.split(' ')[0]} />

      <Modal open={doc != null} onClose={() => setDoc(null)} label={doc?.titulo ?? 'Documento'} width={640} padding="compact">
        <div className={styles.docModal}>
          <div className={styles.docModalHead}>
            <h2 className={styles.docModalTitulo}>{doc?.titulo}</h2>
            <button type="button" className={styles.fechar} onClick={() => setDoc(null)} aria-label="Fechar">
              <Icon src={ICONS.close} size={18} />
            </button>
          </div>
          <div className={styles.docModalBody}>{doc?.conteudo}</div>
        </div>
      </Modal>

      {toast ? (
        <div className={styles.toast} role="status">
          {toast}
        </div>
      ) : null}
    </main>
  )
}

/** Prazo para responder: barra do tempo que já passou desde a emissão */
function Validade({ p }: { p: Proposta }) {
  const hoje = new Date()
  const total = Math.max(1, diasEntre(p.emitidaEm, p.validaAte))
  const faltam = Math.max(0, diasEntre(hoje, p.validaAte))
  return (
    <div className={styles.validade}>
      <div className={styles.validadeTexto}>
        <span>Válida até {dataLonga(p.validaAte)}</span>
        <b>{faltam === 1 ? 'Falta 1 dia' : `Faltam ${faltam} dias`}</b>
      </div>
      <div className={styles.validadeBarra} aria-hidden>
        <span style={{ width: `${((total - faltam) / total) * 100}%` }} />
      </div>
    </div>
  )
}

function RecusarModal({ open, onClose, onConfirmar, licenciado }: { open: boolean; onClose: () => void; onConfirmar: (motivo: string) => void; licenciado: string }) {
  const [motivo, setMotivo] = useState(MOTIVOS[0])
  const [texto, setTexto] = useState('')
  const final = motivo === 'Outro motivo' ? texto.trim() || 'Outro motivo' : motivo
  return (
    <Modal open={open} onClose={onClose} label="Recusar proposta" width={480} padding="compact">
      <div className={styles.recusar}>
        <h2 className={styles.docModalTitulo}>Recusar proposta</h2>
        <p className={styles.recusarTexto}>Conte o motivo para {licenciado} entender e, se fizer sentido, preparar outra proposta.</p>
        <fieldset className={styles.motivos}>
          <legend className={styles.srOnly}>Motivo</legend>
          {MOTIVOS.map((m) => (
            <label key={m} className={cn(styles.motivo, motivo === m && styles.motivoOn)}>
              <input type="radio" name="motivo" value={m} checked={motivo === m} onChange={() => setMotivo(m)} />
              {m}
            </label>
          ))}
        </fieldset>
        {motivo === 'Outro motivo' ? (
          <textarea className={styles.recusarCampo} rows={3} placeholder="Escreva o motivo" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Motivo" />
        ) : null}
        <div className={styles.recusarAcoes}>
          <Button variant="secondary" onClick={onClose}>
            Voltar
          </Button>
          <button type="button" className={styles.btnCritico} onClick={() => onConfirmar(final)}>
            Recusar proposta
          </button>
        </div>
      </div>
    </Modal>
  )
}

function AditivoTexto({ p }: { p: Proposta }) {
  const ad = p.vistoria.aditivo
  if (!ad) return null
  return (
    <article className={styles.contrato}>
      <p className={styles.contratoAviso}>Texto de exemplo para a prévia.</p>
      <h5>
        Aditivo nº {ad.numero} ao contrato nº {p.numero}
      </h5>
      <h6>Motivo</h6>
      <p>{ad.motivo}</p>
      <h6>Alteração</h6>
      <p>
        {ad.titulo}, no valor de {moneyCents(ad.valor)}, somado à próxima parcela em aberto. As demais condições do contrato continuam as mesmas.
      </p>
    </article>
  )
}

function DocExemplo({ nome, p }: { nome: string; p: Proposta }) {
  return (
    <article className={styles.contrato}>
      <p className={styles.contratoAviso}>Documento de exemplo para a prévia.</p>
      <h5>{nome}</h5>
      <p>
        Eletroposto {p.produto.nome} ({p.produto.potencia}) em {p.local.endereco}, {p.local.cidade}/{p.local.uf}. Proposta nº {p.numero}.
      </p>
      <ul className={styles.checklistDoc}>
        <li>Padrão de entrada {p.local.padrao} conferido</li>
        <li>Cabeamento instalado e testado</li>
        <li>Carregador ativado na plataforma iGreen</li>
        <li>Vaga pintada e sinalizada</li>
      </ul>
    </article>
  )
}
