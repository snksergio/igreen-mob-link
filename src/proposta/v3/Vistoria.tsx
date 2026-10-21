import { useId, useState, type ReactNode } from 'react'
import { ICONS } from '../../assets'
import { AddressSection } from '../../components/address/AddressSection'
import { Button } from '../../components/ui/Button'
import { Checkbox } from '../../components/ui/Controls'
import { Field, FieldRow } from '../../components/ui/Field'
import { Icon } from '../../components/ui/Icon'
import { cn } from '../../lib/cn'
import { maskCnpj, maskCpf, maskPhone, money, moneyCents, onlyDigits } from '../../lib/format'
import { focusFirstError } from '../../lib/focusFirstError'
import {
  alternarUnidade,
  definirQuantidade,
  gruposPorPonto,
  dataCurta,
  dataLonga,
  enderecoCurto,
  errosPonto,
  juntarNomes,
  nomePonto,
  novoPonto,
  pendencias,
  pontoInicial,
  porModelo,
  resumoCompra,
  semPonto,
  type ContatoPonto,
  type ErrosPonto,
  type Ponto,
  type Proposta,
  type Unidade,
} from '../data'
import { Aviso, Cabecalho, LinhaDoc, Linhas, Secao, type Tom } from './Blocos'
import { IconePotencia } from './IconePotencia'
import ctl from '../../components/ui/Controls.module.css'
import styles from './Proposta.module.css'
import v from './Vistoria.module.css'

/*
 * Etapa de vistoria (versão 2). Na compra com vários carregadores, a pessoa primeiro monta os pontos:
 * em cada ponto, os carregadores que vão ali, o endereço e o contato no local. A vistoria é feita por ponto.
 */

/** nível do medidor de potência de cada modelo */
const NIVEL: Record<Unidade['modelo'], 1 | 2 | 3> = { mob: 1, fast: 2, ultra: 3 }

const temEndereco = (pt: Ponto) => Boolean(pt.endereco.logradouro || pt.endereco.cidade)
const completo = (pt: Ponto) => Object.keys(errosPonto(pt)).length === 0

export function FolhaVistoria({
  p,
  onAditivo,
  onAssinarAditivo,
  onEnviarPontos,
  onSimularAgendamento,
}: {
  p: Proposta
  onAditivo: () => void
  onAssinarAditivo: () => void
  onEnviarPontos: (pontos: Ponto[]) => void
  onSimularAgendamento: () => void
}) {
  const [li, setLi] = useState(false)
  const [editando, setEditando] = useState(false)
  const vi = p.vistoria
  const ad = vi.aditivo
  const unidades = p.unidades

  if (unidades && (vi.status === 'distribuir' || editando)) {
    return (
      <Distribuir
        p={p}
        unidades={unidades}
        editando={editando}
        onEnviar={(pontos) => {
          onEnviarPontos(pontos)
          setEditando(false)
        }}
        onCancelar={editando ? () => setEditando(false) : undefined}
      />
    )
  }

  if (vi.status === 'aguardando') {
    return (
      <>
        <Cabecalho titulo="Vistoria técnica" status="Depois da entrada" tom="espera" />
        {unidades ? (
          <>
            <Aviso titulo="Você indica os pontos depois da entrada" icone="relogio">
              Com a entrada paga, você diz onde fica cada um dos seus {unidades.length} carregadores. A vistoria é agendada por ponto.
            </Aviso>
            <Secao titulo="Seus carregadores">
              <Frota unidades={unidades} />
            </Secao>
          </>
        ) : (
          <Aviso titulo="Agendada assim que a entrada for paga">Um técnico iGreen confere o local e combina a data com você pelo WhatsApp.</Aviso>
        )}
        <OQueConfere />
      </>
    )
  }

  const blocoAditivo = ad ? (
    <Secao titulo={`Aditivo nº ${ad.numero}: ${ad.titulo}`}>
      {/* o motivo já diz em qual ponto a vistoria pediu o aditivo */}
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
  ) : null

  if (unidades && p.pontos?.length) {
    return (
      <PontosEnviados p={p} pontos={p.pontos} unidades={unidades} onEditar={() => setEditando(true)} onSimular={onSimularAgendamento}>
        {blocoAditivo}
      </PontosEnviados>
    )
  }

  if (vi.status === 'agendada') {
    return (
      <>
        <Cabecalho titulo="Vistoria técnica" status={`Em ${dataCurta(vi.data!)}`} tom="ok">
          Um técnico iGreen vai até o local em {dataLonga(vi.data!)}.
        </Cabecalho>
        <OQueConfere />
      </>
    )
  }
  return (
    <>
      <Cabecalho
        titulo="Vistoria técnica"
        status={ad?.status === 'aguardando' ? 'Aditivo para assinar' : `Feita em ${dataCurta(vi.data!)}`}
        tom={ad?.status === 'aguardando' ? 'acao' : 'ok'}
      >
        Vistoria feita em {dataLonga(vi.data!)}. O laudo fica no envelope de entrega.
      </Cabecalho>
      {blocoAditivo ?? <p className={styles.parcelaTexto}>Tudo conforme a proposta. Nenhum aditivo foi necessário.</p>}
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

/* ================= Carregadores comprados ================= */

function IconeModelo({ u, tamanho = 32 }: { u: Pick<Unidade, 'modelo'>; tamanho?: number }) {
  return (
    <span className={v.modeloIcone} style={{ width: tamanho, height: tamanho }} aria-hidden>
      <IconePotencia nivel={NIVEL[u.modelo]} size={Math.round(tamanho * 0.7)} />
    </span>
  )
}

/** Lista dos carregadores da compra; com `pontos`, mostra onde cada um está; com `comValor`, o valor de cada um */
export function Frota({ unidades, pontos, comValor = false }: { unidades: Unidade[]; pontos?: Ponto[]; comValor?: boolean }) {
  const [todos, setTodos] = useState(false)
  // Na distribuição, a lista fica compacta: só o nome e o ponto de cada carregador (os detalhes estão nos quadros do ponto).
  // Com muitos carregadores, mostra os primeiros e um botão para ver o resto (os sem ponto vêm antes)
  if (pontos) {
    const ordem = gruposPorPonto(unidades, pontos)
    const visiveis = todos || ordem.length <= LIMITE_CHIPS ? ordem : ordem.slice(0, LIMITE_CHIPS - 1)
    const resto = ordem.slice(visiveis.length).reduce((n, g) => n + g.qtd, 0)
    return (
      <ul className={v.chipsFrota}>
        {visiveis.map((g) => {
          const i = g.ponto
          return (
            <li key={`${g.modelo}-${i}`} className={cn(v.chipFrota, i < 0 && v.chipFrotaSolto)}>
              <IconeModelo u={g} tamanho={22} />
              <b>
                {g.qtd > 1 ? `${g.qtd}× ` : ''}
                {g.nome}
              </b>
              <span className={v.chipFrotaOnde}>
                {i >= 0 ? (
                  <>
                    <Icon src={ICONS.addressPin} size={11} />
                    {nomePonto(pontos[i], i)}
                  </>
                ) : (
                  'Sem ponto'
                )}
              </span>
            </li>
          )
        })}
        {resto > 0 || (todos && ordem.length > LIMITE_CHIPS) ? (
          <li>
            <button type="button" className={v.chipMais} onClick={() => setTodos(!todos)} aria-expanded={todos}>
              {todos ? 'Mostrar menos' : `+${resto} carregadores`}
            </button>
          </li>
        ) : null}
      </ul>
    )
  }
  // Lista da proposta: um item por modelo (com a quantidade), para não crescer com a compra
  return (
    <ul className={v.frota}>
      {porModelo(unidades).map((g) => (
        <li key={g.modelo} className={v.frotaItem}>
          <IconeModelo u={g} />
          <span className={v.modeloTexto}>
            <b>
              {g.qtd > 1 ? `${g.qtd}× ` : ''}
              {g.nome}
            </b>
            <small>
              {g.potencia} {g.corrente}
            </small>
          </span>
          {comValor ? (
            <span className={v.valorBloco}>
              <b className={v.valor}>{money(g.valor * g.qtd)}</b>
              {g.qtd > 1 ? <small>{g.qtd} × {money(g.valor)}</small> : null}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

const LIMITE_CHIPS = 6

/* ================= Distribuir os carregadores em pontos ================= */

function Distribuir({
  p,
  unidades,
  editando,
  onEnviar,
  onCancelar,
}: {
  p: Proposta
  unidades: Unidade[]
  editando: boolean
  onEnviar: (pontos: Ponto[]) => void
  onCancelar?: () => void
}) {
  const [pontos, setPontos] = useState<Ponto[]>(() => structuredClone(p.pontos?.length ? p.pontos : [pontoInicial(unidades)]))
  const [aberto, setAberto] = useState<string | null>(() => pontos.find((pt) => !completo(pt))?.id ?? (pontos.length === 1 ? pontos[0].id : null))
  const [conferir, setConferir] = useState<Record<string, boolean>>({})
  const um = unidades.length === 1
  const pend = pendencias(unidades, pontos)
  const distribuidos = unidades.length - semPonto(unidades, pontos).length

  const atualizar = (id: string, patch: Partial<Ponto>) => setPontos((pts) => pts.map((pt) => (pt.id === id ? { ...pt, ...patch } : pt)))

  // Um ponto novo já recebe os carregadores que estão sem ponto
  const adicionar = () => {
    const n = {
      ...novoPonto(pontos),
      unidades: semPonto(unidades, pontos).map((u) => u.id),
    }
    setPontos([...pontos, n])
    setAberto(n.id)
  }

  const remover = (id: string) => {
    setPontos((pts) => pts.filter((pt) => pt.id !== id))
    setAberto(null)
  }

  const revisar = (pt: Ponto) => {
    setAberto(pt.id)
    setConferir((c) => ({ ...c, [pt.id]: true }))
    focusFirstError()
  }

  // Concluir fecha o ponto (se estiver completo) e abre o próximo que falta
  const concluir = (pt: Ponto) => {
    if (!completo(pt)) return revisar(pt)
    setAberto(pontos.find((x) => x.id !== pt.id && !completo(x))?.id ?? null)
  }

  const enviar = () => {
    const incompleto = pontos.find((pt) => !completo(pt))
    if (incompleto) return revisar(incompleto)
    if (pend.length) return
    onEnviar(pontos)
  }

  return (
    <>
      <Cabecalho titulo="Vistoria técnica" status={editando ? 'Editando os pontos' : 'Indique os pontos'} tom="acao">
        {um
          ? 'Diga onde o seu carregador vai ficar. Com o envio, agendamos a vistoria técnica.'
          : 'Diga onde fica cada carregador. Com o envio, agendamos a vistoria técnica de cada ponto.'}
      </Cabecalho>

      {um ? null : (
        <Secao titulo="Seus carregadores">
          <div className={v.contador}>
            <span>
              <b>
                {distribuidos} de {unidades.length}
              </b>{' '}
              em um ponto
            </span>
            <span className={v.contadorBarra} aria-hidden>
              <span style={{ width: `${(distribuidos / unidades.length) * 100}%` }} />
            </span>
          </div>
          <Frota unidades={unidades} pontos={pontos} />
        </Secao>
      )}

      <Secao titulo={um ? 'Local de instalação' : 'Pontos de instalação'}>
        <div className={v.pontos}>
          {pontos.map((pt, i) =>
            aberto === pt.id ? (
              <PontoEditor
                key={pt.id}
                p={p}
                pt={pt}
                i={i}
                pontos={pontos}
                unidades={unidades}
                um={um}
                erros={conferir[pt.id] ? errosPonto(pt) : undefined}
                onChange={(patch) => atualizar(pt.id, patch)}
                onAlternar={(u) => setPontos((pts) => alternarUnidade(pts, pt.id, u))}
                onQuantidade={(modelo, n) => setPontos((pts) => definirQuantidade(pts, unidades, pt.id, modelo, n))}
                onRemover={pontos.length > 1 ? () => remover(pt.id) : undefined}
                onConcluir={() => concluir(pt)}
              />
            ) : (
              <PontoFechado key={pt.id} pt={pt} i={i} unidades={unidades} um={um} onAbrir={() => setAberto(pt.id)} />
            ),
          )}
          {!um && pontos.length < unidades.length ? (
            <button type="button" className={v.adicionar} onClick={adicionar}>
              <span className={v.mais} aria-hidden />
              Adicionar ponto
            </button>
          ) : null}
        </div>
      </Secao>

      <div className={v.enviar}>
        {pend.length ? (
          <p className={v.pendencias}>Para enviar, falta {juntarNomes(pend)}.</p>
        ) : (
          <p className={cn(styles.feito, v.pronto)}>
            <span className={styles.feitoIcone} aria-hidden>
              <Icon src={ICONS.checkBold} size={10} color="#fff" />
            </span>
            {pontos.length === 1 ? 'Ponto completo. Tudo pronto para enviar.' : `Os ${pontos.length} pontos estão completos. Tudo pronto para enviar.`}
          </p>
        )}
        <div className={cn(v.enviarAcoes, onCancelar && v.enviarAcoesDupla)}>
          {onCancelar ? (
            <Button variant="secondary" onClick={onCancelar}>
              Cancelar
            </Button>
          ) : null}
          <Button onClick={enviar}>
            {editando ? 'Salvar pontos' : pontos.length === 1 ? 'Enviar para a vistoria' : `Enviar ${pontos.length} pontos para a vistoria`}
          </Button>
        </div>
      </div>
    </>
  )
}

/** Ponto fechado: um resumo que abre ao tocar */
function PontoFechado({ pt, i, unidades, um, onAbrir }: { pt: Ponto; i: number; unidades: Unidade[]; um: boolean; onAbrir: () => void }) {
  const ok = completo(pt)
  const doPonto = unidades.filter((u) => pt.unidades.includes(u.id))
  return (
    <button type="button" className={cn(v.fechado, ok && v.fechadoOk)} onClick={onAbrir} aria-expanded={false}>
      <span className={cn(v.num, ok && v.numOk)} aria-hidden>
        {ok ? <Icon src={ICONS.checkBold} size={11} color="#fff" /> : i + 1}
      </span>
      <span className={v.fechadoTextos}>
        <span className={v.fechadoTopo}>
          <span className={v.fechadoTitulo}>{nomePonto(pt, i)}</span>
          {ok ? <span className={cn(styles.pill, styles.pillMini, styles.pill_ok)}>Completo</span> : null}
        </span>
        {um ? null : (
          <span className={cn(v.fechadoMeta, !doPonto.length && v.metaPendente)}>{doPonto.length ? resumoCompra(doPonto) : 'Nenhum carregador'}</span>
        )}
        <span className={cn(v.fechadoMeta, !temEndereco(pt) && v.metaPendente)}>{temEndereco(pt) ? enderecoCurto(pt.endereco) : 'Falta o endereço'}</span>
      </span>
      <span className={styles.chevronCirculo} aria-hidden>
        <Icon src={ICONS.chevronDown} size={14} />
      </span>
    </button>
  )
}

const CONTATO_VAZIO: ContatoPonto = {
  nome: '',
  telefone: '',
  email: '',
  documento: '',
}
const maskDocumento = (x: string) => (onlyDigits(x).length > 11 ? maskCnpj(x) : maskCpf(x))

/** Ponto aberto: apelido, carregadores, endereço e contato no local */
function PontoEditor({
  p,
  pt,
  i,
  pontos,
  unidades,
  um,
  erros,
  onChange,
  onAlternar,
  onQuantidade,
  onRemover,
  onConcluir,
}: {
  p: Proposta
  pt: Ponto
  i: number
  pontos: Ponto[]
  unidades: Unidade[]
  um: boolean
  erros?: ErrosPonto
  onChange: (patch: Partial<Ponto>) => void
  onAlternar: (unidade: string) => void
  onQuantidade: (modelo: Unidade['modelo'], n: number) => void
  onRemover?: () => void
  onConcluir: () => void
}) {
  const id = useId()
  const c = pt.contato
  const soltos = semPonto(unidades, pontos)
  const setContato = (patch: Partial<ContatoPonto>) => onChange({ contato: { ...(c ?? CONTATO_VAZIO), ...patch } })

  return (
    <div className={v.editor}>
      <div className={v.editorTopo}>
        <span className={v.num} aria-hidden>
          {i + 1}
        </span>
        <p className={v.editorTitulo}>{nomePonto(pt, i)}</p>
        {onRemover ? (
          <button type="button" className={v.remover} onClick={onRemover}>
            Remover ponto
          </button>
        ) : null}
      </div>

      <Field
        label="APELIDO DO LOCAL (OPCIONAL)"
        value={pt.nome}
        onChange={(nome) => onChange({ nome })}
        placeholder="Ex.: Casa, Loja do centro"
        maxLength={40}
      />

      {um ? null : (
        <div className={v.campo}>
          <div className={v.rotuloLinha}>
            <p className={v.rotulo} id={`${id}-unidades`}>
              Carregadores deste ponto
            </p>
            {soltos.length > 1 ? (
              <button type="button" className={v.atalho} onClick={() => soltos.forEach((u) => onAlternar(u.id))}>
                Marcar os {soltos.length} sem ponto
              </button>
            ) : null}
          </div>
          <div className={v.unidades} role="group" aria-labelledby={`${id}-unidades`} tabIndex={-1} data-invalid={erros?.unidades ? true : undefined}>
            {porModelo(unidades).map((g) => {
              if (g.qtd > 1) {
                const ids = unidades.filter((u) => u.modelo === g.modelo).map((u) => u.id)
                const aqui = ids.filter((x) => pt.unidades.includes(x)).length
                const livres = ids.filter((x) => !pontos.some((o) => o.unidades.includes(x))).length
                const fora = g.qtd - aqui - livres
                return (
                  <div key={g.modelo} className={cn(v.unidade, v.unidadeQtd, aqui > 0 && v.unidadeOn)}>
                    <IconeModelo u={g} tamanho={30} />
                    <span className={v.modeloTexto}>
                      <b>{g.nome}</b>
                      <small>{`${g.potencia} ${g.corrente}`.replace(/ \+ /g, '+')}</small>
                      <small className={v.qtdLinha}>
                        {g.qtd} na compra
                        {livres ? (
                          <span className={v.qtdSolto}>, {livres} sem ponto</span>
                        ) : fora ? (
                          <>, {fora === 1 ? '1 em outro ponto' : `${fora} em outros pontos`}</>
                        ) : null}
                      </small>
                    </span>
                    <Contador valor={aqui} max={g.qtd} rotulo={`Quantos ${g.nome} neste ponto`} onChange={(n) => onQuantidade(g.modelo, n)} />
                  </div>
                )
              }
              const u = unidades.find((x) => x.modelo === g.modelo)!
              const marcado = pt.unidades.includes(u.id)
              const outro = pontos.findIndex((o) => o.id !== pt.id && o.unidades.includes(u.id))
              return (
                <button
                  key={u.id}
                  type="button"
                  role="checkbox"
                  aria-checked={marcado}
                  className={cn(v.unidade, marcado && v.unidadeOn)}
                  onClick={() => onAlternar(u.id)}
                >
                  <span className={cn(v.caixa, marcado && v.caixaOn)} aria-hidden>
                    {marcado ? <Icon src={ICONS.checkSmall} size={14} color="#fff" /> : null}
                  </span>
                  <IconeModelo u={u} tamanho={30} />
                  <span className={v.modeloTexto}>
                    <b>{g.nome}</b>
                    {/* compacto ("7+40 kW AC+DC") para caber ao lado do ponto no celular */}
                    <small>{`${u.potencia} ${u.corrente}`.replace(/ \+ /g, '+')}</small>
                  </span>
                  {!marcado && outro >= 0 ? (
                    <span className={v.unidadeOnde} title={`Está no ${nomePonto(pontos[outro], outro)}`}>
                      <Icon src={ICONS.addressPin} size={11} />
                      {nomePonto(pontos[outro], outro)}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
          {erros?.unidades ? (
            <p className={v.erro} role="alert">
              {erros.unidades}
            </p>
          ) : pontos.length > 1 ? (
            <p className={v.ajuda}>Ao marcar ou aumentar, o carregador sai do outro ponto e vem para este.</p>
          ) : null}
        </div>
      )}

      <div className={v.campo}>
        <p className={v.rotulo}>Endereço do ponto</p>
        <AddressSection
          value={pt.endereco}
          onChange={(endereco) => onChange({ endereco })}
          withMap
          errors={erros ? { cep: erros.cep, numero: erros.numero } : undefined}
          modal={{
            title: 'Endereço do ponto',
            subtitle: 'Edite de forma livre o endereço onde o carregador vai ficar',
            icon: ICONS.pin,
          }}
          cepSubtitle="Encontre o CEP pelo endereço do ponto"
        />
      </div>

      <div className={v.campo}>
        <p className={v.rotulo}>Contato no local</p>
        {/* caixa própria: fundo de card sobre o ponto tingido, e o ✓ não bloqueia o toque */}
        <label className={cn(v.opcao, c == null && v.opcaoOn)} htmlFor={`${id}-contato`}>
          <span className={cn(ctl.checkbox, c == null && ctl.checkboxOn, v.opcaoCaixa)}>
            <input
              id={`${id}-contato`}
              type="checkbox"
              className={ctl.checkInput}
              checked={c == null}
              onChange={(e) => onChange({ contato: e.target.checked ? null : CONTATO_VAZIO })}
            />
            {c == null ? <Icon src={ICONS.checkSmall} size={14} color="var(--fg-on-primary)" /> : null}
          </span>
          <span className={v.contatoTexto}>
            <b>Usar o mesmo contato da proposta</b>
            <span>
              {p.investidor.nome}, {p.investidor.telefone}, {p.investidor.email}
            </span>
          </span>
        </label>
        {c ? (
          <div className={v.contatoCampos}>
            <Field
              label="NOME DO CONTATO"
              value={c.nome}
              onChange={(nome) => setContato({ nome })}
              autoComplete="name"
              placeholder="Quem recebe a equipe no local"
              error={erros?.contatoNome}
            />
            <FieldRow stackOnMobile>
              <Field
                label="TELEFONE"
                value={c.telefone}
                onChange={(telefone) => setContato({ telefone })}
                mask={maskPhone}
                inputMode="tel"
                placeholder="(00) 00000-0000"
                error={erros?.contatoTelefone}
              />
              <Field
                label="E-MAIL (OPCIONAL)"
                type="email"
                value={c.email}
                onChange={(email) => setContato({ email })}
                inputMode="email"
                placeholder="contato@email.com"
                error={erros?.contatoEmail}
              />
            </FieldRow>
            <Field
              label="CPF OU CNPJ (OPCIONAL)"
              value={c.documento}
              onChange={(documento) => setContato({ documento })}
              mask={maskDocumento}
              inputMode="numeric"
              placeholder="000.000.000-00"
              error={erros?.contatoDocumento}
            />
          </div>
        ) : null}
      </div>

      <div className={v.editorAcoes}>
        <Button onClick={onConcluir}>Concluir ponto</Button>
      </div>
    </div>
  )
}

/* ================= Pontos enviados e vistoria de cada ponto ================= */

function PontosEnviados({
  p,
  pontos,
  unidades,
  onEditar,
  onSimular,
  children,
}: {
  p: Proposta
  pontos: Ponto[]
  unidades: Unidade[]
  onEditar: () => void
  onSimular: () => void
  children?: ReactNode
}) {
  const vi = p.vistoria
  const ad = vi.aditivo
  const n = pontos.length
  const cab: { status: string; tom: Tom; texto: string } =
    vi.status === 'agendando'
      ? {
          status: 'Em agendamento',
          tom: 'espera',
          texto: `Vamos combinar a data da vistoria de ${n === 1 ? 'o seu ponto' : `cada um dos ${n} pontos`} com você pelo WhatsApp.`,
        }
      : vi.status === 'agendada'
        ? {
            status: `A partir de ${dataCurta(vi.data!)}`,
            tom: 'ok',
            texto: 'Um técnico iGreen vai a cada ponto na data combinada.',
          }
        : ad?.status === 'aguardando'
          ? {
              status: 'Aditivo para assinar',
              tom: 'acao',
              texto: 'Vistorias feitas. Um dos pontos precisa de um aditivo para seguir.',
            }
          : {
              status: `Feita em ${dataCurta(vi.data!)}`,
              tom: 'ok',
              texto: 'Vistorias feitas. Os laudos ficam no envelope de entrega.',
            }

  return (
    <>
      <Cabecalho titulo="Vistoria técnica" status={cab.status} tom={cab.tom}>
        {cab.texto}
      </Cabecalho>

      {vi.status === 'agendando' ? (
        <div className={styles.feito}>
          <span className={styles.feitoIcone} aria-hidden>
            <Icon src={ICONS.checkBold} size={10} color="#fff" />
          </span>
          <p>Pontos enviados! Vamos agendar a vistoria de cada ponto e avisar você.</p>
        </div>
      ) : null}

      <Secao titulo={n === 1 ? 'Seu ponto' : `Seus ${n} pontos`}>
        <div className={v.pontos}>
          {pontos.map((pt, i) => {
            const st = statusPonto(pt, ad?.status === 'aguardando' && ad.ponto === pt.id)
            return (
              <article key={pt.id} className={v.info} aria-label={nomePonto(pt, i)}>
                <div className={v.infoTopo}>
                  <span className={v.num} aria-hidden>
                    {i + 1}
                  </span>
                  <h5 className={v.infoTitulo}>{nomePonto(pt, i)}</h5>
                  <span className={cn(styles.pill, styles.pillMini, styles[`pill_${st.tom}`])}>{st.texto}</span>
                </div>
                <ul className={v.chips} aria-label="Carregadores">
                  {porModelo(unidades.filter((u) => pt.unidades.includes(u.id))).map((g) => (
                    <li key={g.modelo}>
                      <span className={v.chipIcone}>
                        <IconePotencia nivel={NIVEL[g.modelo]} size={14} />
                      </span>
                      <b>
                        {g.qtd > 1 ? `${g.qtd}× ` : ''}
                        {g.nome}
                      </b>{' '}
                      {g.potencia}
                    </li>
                  ))}
                </ul>
                <p className={v.infoLinha}>
                  <Icon src={ICONS.addressPin} size={14} />
                  {enderecoCurto(pt.endereco)}
                </p>
                <p className={v.infoLinha}>
                  <Icon src={ICONS.user} size={14} />
                  {pt.contato ? `${pt.contato.nome}, ${pt.contato.telefone}` : `${p.investidor.nome} (contato da proposta)`}
                </p>
              </article>
            )
          })}
        </div>
        {vi.status === 'agendando' ? (
          <div className={v.enviadoAcoes}>
            <Button variant="secondary" onClick={onEditar}>
              <span className={v.btnIcone}>
                <Icon src={ICONS.edit} size={14} />
                Editar pontos
              </span>
            </Button>
            <button type="button" className={styles.simular} onClick={onSimular}>
              Simular vistorias agendadas (prévia)
            </button>
          </div>
        ) : null}
      </Secao>

      {children}
      {vi.status === 'concluida' ? null : <OQueConfere />}
    </>
  )
}

function statusPonto(pt: Ponto, aditivoPendente: boolean): { texto: string; tom: Tom } {
  const s = pt.vistoria
  if (aditivoPendente) return { texto: 'Aditivo para assinar', tom: 'acao' }
  if (s?.status === 'concluida') return { texto: `Feita em ${dataCurta(s.data!)}`, tom: 'ok' }
  if (s?.status === 'agendada') return { texto: `Vistoria em ${dataCurta(s.data!)}`, tom: 'ok' }
  return { texto: 'Em agendamento', tom: 'espera' }
}

/** − 2 + : quantos carregadores daquele modelo ficam no ponto */
function Contador({ valor, max, rotulo, onChange }: { valor: number; max: number; rotulo: string; onChange: (n: number) => void }) {
  return (
    <div className={v.contador2} role="group" aria-label={rotulo}>
      <button type="button" onClick={() => onChange(valor - 1)} disabled={valor <= 0} aria-label="Diminuir">
        −
      </button>
      <output aria-live="polite">{valor}</output>
      <button type="button" onClick={() => onChange(valor + 1)} disabled={valor >= max} aria-label="Aumentar">
        +
      </button>
    </div>
  )
}
