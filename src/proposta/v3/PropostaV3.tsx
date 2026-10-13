import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { ICONS, IMAGES, VIDEOS } from '../../assets'
import { ThemeToggle } from '../../components/layout/PageShell'
import { Button } from '../../components/ui/Button'
import { FancyIcon } from '../../components/ui/Controls'
import { Field } from '../../components/ui/Field'
import { Icon, Img } from '../../components/ui/Icon'
import { Modal } from '../../components/ui/Modal'
import { PlayOnceVideo } from '../../components/ui/PlayOnceVideo'
import { useAdaptiveVideo } from '../../lib/adaptiveVideo'
import { cn } from '../../lib/cn'
import { maskCpf, moneyCents } from '../../lib/format'
import { useTheme } from '../../lib/theme'
import { useMediaQuery } from '../../lib/useMediaQuery'
import {
  CENARIOS,
  ETAPAS,
  aceitar,
  aceitarEntrega,
  assinarAditivo,
  assinarContrato,
  cpfConfere,
  dataCurta,
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
} from '../data'
import { ContratoTexto, FolhaContrato, FolhaEntrega, FolhaInstalacao, FolhaPagamento, FolhaProposta, FolhaVistoria } from './Folhas'
import { Trilho } from './Trilho'
import styles from './Proposta.module.css'

/*
 * Proposta gerada, versão 2 do modelo novo (só local, dados de exemplo). Endereço: #proposta-v3/<número>?cenario=<etapa>.
 * Segue o visual da proposta final do fluxo: cabeçalho centralizado acima do carro, card principal sobre o carro,
 * compartilhar e detalhes em cards recolhíveis. As informações são as mesmas do primeiro modelo (#proposta-v2).
 */

const lerCenario = (): Cenario => {
  const c = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('cenario')
  return isCenario(c) ? c : 'nova'
}

const parcelaEmFoco = (p: Proposta) => p.pagamento.parcelas.find((x) => x.status === 'vencida' || x.status === 'aberta')?.id ?? null

/** proporção do vídeo da proposta (1920×814), igual à proposta final do fluxo */
const VIDEO_RATIO = 1920 / 814

type Doc = { titulo: string; conteudo: ReactNode }
type Detalhe = 'investidor' | 'licenciado'

export function PropostaV3() {
  const id = useId()
  const [cenario, setCenario] = useState<Cenario>(lerCenario)
  const [p, setP] = useState(() => montarProposta(cenario))
  const lista = useMemo(() => etapas(p), [p])
  const passo = useMemo(() => proximoPasso(p), [p])
  const [sel, setSel] = useState<EtapaId>(() => etapaEmFoco(etapas(p)))
  const [parcelaAberta, setParcelaAberta] = useState<string | null>(() => parcelaEmFoco(p))
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null)
  const [recusando, setRecusando] = useState(false)
  const [doc, setDoc] = useState<Doc | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const principalRef = useRef<HTMLElement>(null)
  const andamentoRef = useRef<HTMLElement>(null)
  const [principalVisivel, setPrincipalVisivel] = useState(true)

  // Vídeo do carro como na proposta final (imagem parada em rede ruim ou com movimento reduzido)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [neededWidth] = useState(() => {
    const w = Math.min(window.innerWidth, 1180)
    const h = window.matchMedia('(max-width: 767px)').matches ? w / 1.45 : w / 2.178
    return Math.round(h * VIDEO_RATIO * Math.min(window.devicePixelRatio || 1, 2))
  })
  const dark = useTheme() === 'dark'
  const video = useAdaptiveVideo(dark ? VIDEOS.propostaDark : VIDEOS.proposta, { enabled: !reducedMotion, neededWidth })
  const heroImage = dark
    ? video.status === 'image' && video.lite ? IMAGES.propostaHeroDarkLite : IMAGES.propostaHeroDark
    : video.status === 'image' && video.lite ? IMAGES.propostaHeroLite : IMAGES.propostaHero

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(t)
  }, [toast])

  // Barra fixa com a ação principal quando o card principal sai da tela
  useEffect(() => {
    const el = principalRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setPrincipalVisivel(e.isIntersecting), { threshold: 0 })
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

  useEffect(() => {
    const onHash = () => aplicarCenario(lerCenario())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [aplicarCenario])

  const trocarCenario = (c: Cenario) => {
    const [base] = window.location.hash.split('?')
    window.history.replaceState(null, '', `${base || '#proposta-v3'}?cenario=${c}`)
    aplicarCenario(c)
  }

  const irPara = useCallback((etapa: EtapaId) => {
    setSel(etapa)
    requestAnimationFrame(() => andamentoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
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
  const copiar = async (texto: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(texto)
      setToast(msg)
    } catch {
      setToast('Não foi possível copiar')
    }
  }

  const primeiroNome = p.licenciado.nome.split(' ')[0]
  const whatsapp = `https://wa.me/${p.licenciado.whatsapp}?text=${encodeURIComponent(`Olá, ${primeiroNome}! Sobre a proposta nº ${p.numero}:`)}`

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
    proposta: <FolhaProposta p={p} onAceitar={onAceitar} onRecusar={() => setRecusando(true)} />,
    contrato: (
      <FolhaContrato p={p} onAceitar={onAceitar} onAssinar={onAssinar} onTelaCheia={() => setDoc({ titulo: `Contrato nº ${p.numero}`, conteudo: <ContratoTexto p={p} /> })} />
    ),
    pagamento: (
      <FolhaPagamento
        p={p}
        aberta={parcelaAberta}
        onAbrir={setParcelaAberta}
        onCopiar={copiar}
        onPagar={onPagar}
        onCartao={() => setToast('Na versão final, abre o pagamento com cartão.')}
      />
    ),
    vistoria: (
      <FolhaVistoria
        p={p}
        onAditivo={() => setDoc({ titulo: `Aditivo nº ${p.vistoria.aditivo?.numero}`, conteudo: <AditivoTexto p={p} /> })}
        onAssinarAditivo={() => {
          setP(assinarAditivo(p))
          setToast('Aditivo assinado. A instalação foi agendada.')
        }}
      />
    ),
    instalacao: <FolhaInstalacao p={p} />,
    entrega: (
      <FolhaEntrega
        p={p}
        onDoc={abrirDocEntrega}
        onAceite={() => {
          setP(aceitarEntrega(p))
          setToast('Aceite registrado. Seu eletroposto está ativo.')
        }}
      />
    ),
  }

  const aguardando = p.resposta.status === 'aguardando'
  const recusada = p.resposta.status === 'recusada'
  const concluida = p.entrega.status === 'aceita'
  const situacao = recusada
    ? { texto: 'Proposta recusada', tom: 'erro' }
    : aguardando
      ? { texto: 'Aguardando sua resposta', tom: 'acao' }
      : concluida
        ? { texto: 'Concluída', tom: 'ok' }
        : { texto: 'Em andamento', tom: 'ok' }
  const faltam = Math.max(0, diasEntre(new Date(), p.validaAte))
  const etapaNum = ETAPAS.indexOf(passo.etapa) + 1
  const link = `${window.location.origin}${window.location.pathname}#proposta-v3/${p.numero}`

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

      {/* ---------- Cabeçalho centralizado ---------- */}
      <header className={styles.header}>
        <ThemeToggle className={styles.themeToggle} />
        <img src={ICONS.logoEnergy} width={88} height={28} alt="iGreen Energy" />
        <div className={styles.numero}>
          <span className={styles.numeroRotulo}>Proposta nº</span>
          <span className={styles.numeroValor}>{p.numero}</span>
          <button type="button" className={styles.numeroCopiar} onClick={() => copiar(p.numero, 'Número da proposta copiado')} aria-label="Copiar número da proposta">
            <Icon src={ICONS.link} size={14} />
          </button>
        </div>
        <h1 className={styles.titulo}>
          Sua proposta de
          <br />
          <span className={styles.destaque}>{p.produto.nome.toLowerCase()}</span>
        </h1>
        <p className={styles.subtitulo}>
          {p.carregadores[0].quantidade} eletroposto de {p.produto.potencia} em {p.local.cidade}/{p.local.uf}
        </p>
        <span className={cn(styles.status, styles[`status_${situacao.tom}`])}>
          <span className={styles.statusPonto} aria-hidden />
          {situacao.texto}
        </span>
      </header>

      <div className={styles.hero} aria-hidden>
        {video.status === 'video' ? (
          <PlayOnceVideo src={video.src} className={styles.heroImg} />
        ) : video.status === 'image' ? (
          <img src={heroImage} alt="" className={styles.heroImg} />
        ) : (
          <div className={styles.heroImg} />
        )}
      </div>

      <div className={styles.content}>
        {/* ---------- Card principal (sobre o carro) ---------- */}
        <section ref={principalRef} className={styles.principal} aria-labelledby={`${id}-passo`}>
          <p className={styles.principalRotulo}>{concluida ? 'Tudo pronto' : 'Próximo passo'}</p>
          <h2 id={`${id}-passo`} className={styles.principalTitulo}>
            {passo.titulo}
          </h2>
          <div className={styles.badges}>
            <span className={cn(styles.badge, styles.badgeVerde)}>{p.produto.nome}</span>
            {aguardando ? (
              <span className={cn(styles.badge, styles.badgeLaranja)}>{faltam === 1 ? 'Falta 1 dia' : `Faltam ${faltam} dias`}</span>
            ) : recusada ? (
              <span className={cn(styles.badge, styles.badgeVermelho)}>Recusada em {dataCurta(p.resposta.em!)}</span>
            ) : (
              <span className={cn(styles.badge, styles.badgeLaranja)}>
                Etapa {etapaNum} de {ETAPAS.length}
              </span>
            )}
          </div>
          <p className={styles.principalTexto}>{passo.texto}</p>
          {aguardando ? (
            <div className={styles.principalAcoes}>
              <Button className={styles.btnCheio} onClick={onAceitar}>
                Aceitar proposta
              </Button>
              <Button variant="secondary" className={styles.btnCheio} onClick={() => setRecusando(true)}>
                Recusar proposta
              </Button>
              <p className={styles.validade}>Válida até {dataLonga(p.validaAte)}</p>
            </div>
          ) : passo.acao ? (
            <div className={styles.principalAcoes}>
              <Button className={styles.btnCheio} onClick={() => agir(passo.acao!)}>
                {passo.acao.label}
              </Button>
            </div>
          ) : null}
        </section>

        <section className={styles.compartilhar} aria-label="Compartilhar proposta">
          <Compartilhar icon={ICONS.whatsapp} label="WhatsApp" href={`https://wa.me/?text=${encodeURIComponent(`Proposta iGreen Mob nº ${p.numero}: ${link}`)}`} />
          <Compartilhar
            icon={ICONS.mailShare}
            label="E-mail"
            href={`mailto:?subject=${encodeURIComponent(`Proposta iGreen Mob nº ${p.numero}`)}&body=${encodeURIComponent(link)}`}
          />
          <Compartilhar icon={ICONS.link} label="Copiar link" onClick={() => copiar(link, 'Link da proposta copiado')} />
        </section>

        {/* ---------- Andamento: trilho e folha no mesmo card ---------- */}
        <section ref={andamentoRef} className={styles.grupo} aria-labelledby={`${id}-andamento`}>
          <h2 id={`${id}-andamento`} className={styles.grupoTitulo}>
            Andamento da proposta
          </h2>
          <div className={styles.andamento}>
            <Trilho etapas={lista} selected={sel} onSelect={setSel} idBase={id} />
            <div id={`${id}-folha`} role="tabpanel" aria-labelledby={`${id}-tab-${sel}`} className={styles.folha}>
              <div key={sel} className={styles.folhaConteudo}>
                {folha[sel]}
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Detalhes (cards recolhíveis, como na proposta final) ---------- */}
        <section className={styles.grupo} aria-labelledby={`${id}-detalhes`}>
          <h2 id={`${id}-detalhes`} className={styles.grupoTitulo}>
            Detalhes
          </h2>
          <Recolhivel
            aberto={detalhe === 'investidor'}
            onToggle={() => setDetalhe(detalhe === 'investidor' ? null : 'investidor')}
            icone={<FancyIcon src={ICONS.idWhite} bg="var(--bg-fill)" multicolor />}
            titulo={p.investidor.nome}
            meta={['Investidor', p.investidor.documento]}
          >
            <dl className={styles.linhas}>
              <div className={styles.linha}>
                <dt>CPF</dt>
                <dd>{p.investidor.documento}</dd>
              </div>
              <div className={styles.linha}>
                <dt>E-mail</dt>
                <dd>{p.investidor.email}</dd>
              </div>
            </dl>
          </Recolhivel>
          <Recolhivel
            aberto={detalhe === 'licenciado'}
            onToggle={() => setDetalhe(detalhe === 'licenciado' ? null : 'licenciado')}
            icone={<FancyIcon src={ICONS.userWhite} bg="var(--bg-primary)" multicolor />}
            titulo={p.licenciado.nome}
            meta={['Sua licenciada iGreen', p.licenciado.telefone]}
          >
            <p className={styles.recolhivelTexto}>Tira dúvidas e acompanha cada etapa da sua proposta.</p>
            <div className={styles.contato}>
              <a className={styles.btnContato} href={whatsapp} target="_blank" rel="noreferrer">
                <Img src={ICONS.whatsapp} size={18} />
                WhatsApp
              </a>
              <a className={styles.btnContato} href={`tel:+${p.licenciado.whatsapp}`}>
                <Img src={ICONS.phone} size={18} />
                Ligar
              </a>
            </div>
          </Recolhivel>
        </section>
      </div>

      {(aguardando || passo.acao) && !principalVisivel ? (
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

      <RecusarModal open={recusando} onClose={() => setRecusando(false)} onConfirmar={onRecusar} p={p} />

      <Modal open={doc != null} onClose={() => setDoc(null)} label={doc?.titulo ?? 'Documento'} width={640} padding="compact">
        <div className={styles.docModal}>
          {/* o Modal já traz o botão de fechar */}
          <div className={styles.docModalTopo}>
            <h2 className={styles.modalTitulo}>{doc?.titulo}</h2>
          </div>
          <div className={styles.docModalCorpo}>{doc?.conteudo}</div>
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

function Compartilhar({ icon, label, href, onClick }: { icon: string; label: string; href?: string; onClick?: () => void }) {
  const conteudo = (
    <>
      <span className={styles.compartilharIcone}>
        <Icon src={icon} size={20} className={styles.compartilharGlifo} />
      </span>
      <span className={styles.compartilharRotulo}>{label}</span>
    </>
  )
  return href ? (
    <a className={styles.compartilharItem} href={href} target="_blank" rel="noreferrer">
      {conteudo}
    </a>
  ) : (
    <button type="button" className={styles.compartilharItem} onClick={onClick}>
      {conteudo}
    </button>
  )
}

function Recolhivel({
  aberto,
  onToggle,
  icone,
  titulo,
  meta,
  children,
}: {
  aberto: boolean
  onToggle: () => void
  icone: ReactNode
  titulo: string
  meta: string[]
  children: ReactNode
}) {
  return (
    <section className={cn(styles.recolhivel, aberto && styles.recolhivelAberto)}>
      <button type="button" className={styles.recolhivelTopo} aria-expanded={aberto} onClick={onToggle}>
        {icone}
        <span className={styles.recolhivelTextos}>
          <span className={styles.recolhivelTitulo}>{titulo}</span>
          <span className={styles.recolhivelMeta}>
            {meta.map((m, i) => (
              <span key={m} className={styles.recolhivelMetaItem}>
                {i > 0 ? <Img src={ICONS.dotSeparator} size={4} /> : null}
                {m}
              </span>
            ))}
          </span>
        </span>
        <span className={styles.chevronCirculo} aria-hidden>
          <Icon src={ICONS.chevronDown} size={14} />
        </span>
      </button>
      {aberto ? <div className={styles.recolhivelCorpo}>{children}</div> : null}
    </section>
  )
}

/** Recusar exige o CPF do investidor (confere com o da proposta) e o motivo por escrito */
function RecusarModal({ open, onClose, onConfirmar, p }: { open: boolean; onClose: () => void; onConfirmar: (motivo: string) => void; p: Proposta }) {
  const [cpf, setCpf] = useState('')
  const [motivo, setMotivo] = useState('')
  const [tentou, setTentou] = useState(false)
  const SUGESTOES = ['O valor não cabe no meu orçamento agora', 'Prefiro outro modelo de eletroposto', 'O local não vai funcionar']

  const erroCpf = !cpf.trim() ? 'Informe o CPF do investidor' : !cpfConfere(cpf, p.investidor.documento) ? 'O CPF não confere com o da proposta' : null
  const erroMotivo = motivo.trim().length < 10 ? 'Escreva o motivo, com pelo menos 10 caracteres' : null

  const confirmar = () => {
    setTentou(true)
    if (erroCpf || erroMotivo) return
    onConfirmar(motivo.trim())
    setCpf('')
    setMotivo('')
    setTentou(false)
  }

  return (
    <Modal open={open} onClose={onClose} label="Recusar proposta" width={480} padding="compact">
      <div className={styles.recusar}>
        <div className={styles.docModalTopo}>
          <h2 className={styles.modalTitulo}>Recusar proposta</h2>
        </div>
        <p className={styles.recusarTexto}>
          Para recusar, confirme o CPF do investidor e conte o motivo. {p.licenciado.nome.split(' ')[0]} recebe a resposta e pode preparar outra proposta.
        </p>
        <Field
          label="CPF DO INVESTIDOR"
          value={cpf}
          onChange={setCpf}
          mask={maskCpf}
          inputMode="numeric"
          placeholder="000.000.000-00"
          error={tentou ? erroCpf : null}
          helper={`O mesmo da proposta (${p.investidor.documento})`}
        />
        <div className={styles.campoMotivo}>
          <label htmlFor="v3-motivo" className={styles.campoRotulo}>
            MOTIVO DA RECUSA
          </label>
          <textarea
            id="v3-motivo"
            className={cn(styles.textarea, tentou && erroMotivo && styles.textareaErro)}
            rows={4}
            placeholder="Conte por que a proposta não serve agora"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            aria-invalid={tentou && !!erroMotivo}
            aria-describedby="v3-motivo-msg"
          />
          <div className={styles.sugestoes} aria-label="Sugestões de motivo">
            {SUGESTOES.map((s) => (
              <button key={s} type="button" className={styles.sugestao} onClick={() => setMotivo(s)}>
                {s}
              </button>
            ))}
          </div>
          {tentou && erroMotivo ? (
            <p id="v3-motivo-msg" className={styles.erro} role="alert">
              {erroMotivo}
            </p>
          ) : null}
        </div>
        <div className={styles.recusarAcoes}>
          <Button variant="secondary" onClick={onClose}>
            Voltar
          </Button>
          <button type="button" className={styles.btnCritico} onClick={confirmar}>
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
    <article className={styles.texto}>
      <p className={styles.textoAviso}>Texto de exemplo para a prévia.</p>
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
    <article className={styles.texto}>
      <p className={styles.textoAviso}>Documento de exemplo para a prévia.</p>
      <h5>{nome}</h5>
      <p>
        Eletroposto {p.produto.nome} ({p.produto.potencia}) em {p.local.endereco}, {p.local.cidade}/{p.local.uf}. Proposta nº {p.numero}.
      </p>
      <ul className={styles.marcadores}>
        <li>Padrão de entrada {p.local.padrao} conferido</li>
        <li>Cabeamento instalado e testado</li>
        <li>Carregador ativado na plataforma iGreen</li>
        <li>Vaga pintada e sinalizada</li>
      </ul>
    </article>
  )
}
