import { useMemo, type ReactNode } from 'react'
import { ICONS, IMAGES } from '../assets'
import { Highlight } from '../components/layout/PageShell'
import { FancyIcon } from '../components/ui/Controls'
import { Icon } from '../components/ui/Icon'
import { cn } from '../lib/cn'
import { money, moneyCents, moneyParts } from '../lib/format'
import type { ChargerId } from '../gerador/model'
import { ficha, INCLUSO, plano } from './oferta'
import styles from './CadastroSimplificado.module.css'

/* Peças da oferta da live: modelo escolhido, contrato, Pix e confirmação */

/** Seção que abre e fecha no "+" (fechada por padrão, para a tela ficar enxuta) */
function Expansivel({ titulo, resumo, children }: { titulo: string; resumo: string; children: ReactNode }) {
  return (
    <details className={styles.expansivel}>
      <summary>
        <span className={styles.expTexto}>
          <span className={styles.expTitulo}>{titulo}</span>
          <span className={styles.expResumo}>{resumo}</span>
        </span>
        <span className={styles.mais} aria-hidden />
      </summary>
      <div className={styles.expCorpo}>{children}</div>
    </details>
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

const ICONE: Record<ChargerId, string> = { lento: ICONS.energyCircle, duo: ICONS.eletric, ultra: ICONS.energyLink }

function Dado({ icon, rotulo, valor, unidade }: { icon: string; rotulo: string; valor: string; unidade: string }) {
  return (
    <div className={styles.dado}>
      <span className={styles.dadoIcone} aria-hidden>
        <Icon src={icon} size={20} color="var(--fg-primary)" />
      </span>
      <div className={styles.dadoTexto}>
        <p className={styles.dadoRotulo}>{rotulo}</p>
        <p className={styles.dadoValor}>
          {valor} <small>{unidade}</small>
        </p>
      </div>
    </div>
  )
}

/**
 * Modelo escolhido, no padrão do painel do simulador: nome e valor no topo, card verde com a entrada de hoje
 * (e as parcelas como informação secundária), potência e capacidade em destaque e o detalhamento no "+".
 */
export function Escolhido({ id }: { id: ChargerId }) {
  const f = ficha(id)
  const p = plano(id)
  const entrada = moneyParts(p.entrada)
  return (
    <div className={styles.escolhido} key={id}>
      <div className={styles.escolhidoCorpo}>
        <div className={styles.escolhidoTopo}>
          <FancyIcon src={ICONE[id]} bg="var(--bg-primary)" size={40} iconSize={20} />
          <h3 className={styles.escolhidoNome}>{f.nome}</h3>
          <p className={styles.escolhidoValor}>
            <b>{money(p.total)}</b>
            <span>valor total</span>
          </p>
        </div>

        <div className={styles.hero} style={{ backgroundImage: `url(${IMAGES.greenCard})` }}>
          <p className={styles.overline}>ENTRADA PARA GARANTIR HOJE</p>
          <p className={styles.amount} aria-label={moneyCents(p.entrada)}>
            R$ {entrada.int}
            <span className={styles.cents}>,{entrada.cents}</span>
          </p>
          <p className={styles.heroNota}>
            {p.parcelas ? `+ ${p.parcelas} parcelas de ${moneyCents(p.parcela)}` : 'Pagamento único, sem parcelas'}
          </p>
          <span className={styles.chip}>{f.selo}</span>
        </div>

        <div className={styles.dados}>
          <Dado icon={ICONS.lightning} rotulo="POTÊNCIA" valor={f.kw} unidade="kW" />
          <Dado icon={ICONS.fuel} rotulo="CAPACIDADE" valor={String(f.carrosDia)} unidade="carros/dia" />
        </div>
      </div>

      <div className={styles.expansiveis}>
        <Expansivel titulo="Especificações" resumo="Recarga, taxa do sistema e itens inclusos">
          <Linhas
            itens={[
              ['Potência', f.potencia],
              ['Recarga', f.recarga],
              ['Carros ao mesmo tempo', f.simultaneos],
              ['Capacidade', `Até ${f.carrosDia} carros por dia`],
              ['Sociedade', f.sociedade],
              ['Taxa do sistema', f.taxa],
            ]}
          />
          <ul className={styles.inclusos} aria-label="Incluso">
            {INCLUSO.map((item) => (
              <li key={item}>
                <span className={styles.tick} aria-hidden>
                  <Icon src={ICONS.checkBold} size={8} color="#fff" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </Expansivel>

        <Expansivel titulo="Formas de pagamento" resumo={p.parcelas ? `Entrada hoje e ${p.parcelas} parcelas mensais` : 'A entrada já quita o eletroposto'}>
          <div className={styles.plano} aria-hidden>
            <span className={styles.planoEntrada} style={{ flexGrow: p.entrada }} />
            {Array.from({ length: p.parcelas }, (_, i) => (
              <span key={i} className={styles.planoParcela} style={{ flexGrow: p.parcela }} />
            ))}
          </div>
          <Linhas
            itens={[
              [
                'Entrada, hoje',
                <>
                  <b>{moneyCents(p.entrada)}</b>
                  <small>Cartão de crédito ou Pix</small>
                </>,
              ],
              p.parcelas
                ? [
                    `${p.parcelas} parcelas`,
                    <>
                      <b>{moneyCents(p.parcela)}</b>
                      <small>A cada 30 dias, por Pix, boleto ou cartão</small>
                    </>,
                  ]
                : ['Parcelas', <small key="s">Nenhuma: a entrada quita o eletroposto</small>],
              ['Total', <b key="t">{moneyCents(p.total)}</b>],
            ]}
          />
        </Expansivel>
      </div>
    </div>
  )
}

/** Contrato de exemplo, montado com o modelo e os dados preenchidos */
export function ContratoTexto({ id, nome, cpf, licenciada }: { id: ChargerId; nome: string; cpf: string; licenciada: string }) {
  const f = ficha(id)
  const p = plano(id)
  return (
    <article className={styles.contrato}>
      <p className={styles.contratoAviso}>Texto de exemplo para a prévia.</p>
      <h2>Contrato de participação em eletroposto iGreen Mob</h2>
      <p>
        <b>Investidor:</b> {nome.trim() || 'nome do investidor'}, CPF {cpf || 'a informar'}. <b>iGreen Mob</b>, responsável pela instalação, operação e
        manutenção do eletroposto. <b>Licenciada:</b> {licenciada}.
      </p>
      <h3>1. Objeto</h3>
      <p>
        Instalação e operação de 1 eletroposto {f.nome} ({f.potencia}), com equipamento, instalação, pintura e licença iGreen inclusos, em local definido na
        vistoria técnica.
      </p>
      <h3>2. Preço e pagamento</h3>
      <p>
        Valor total de {moneyCents(p.total)}: entrada de {moneyCents(p.entrada)} no ato, por cartão de crédito ou Pix
        {p.parcelas
          ? `, e ${p.parcelas} parcelas de ${moneyCents(p.parcela)} a cada 30 dias, por Pix, boleto ou cartão. Cada cobrança é gerada 10 dias antes do vencimento.`
          : '. A entrada quita o valor total.'}
      </p>
      <h3>3. Vistoria e aditivos</h3>
      <p>
        Com a entrada paga, a iGreen agenda a vistoria técnica do local. Mudanças de escopo, como cabeamento além do previsto, são formalizadas em aditivo,
        assinado eletronicamente.
      </p>
      <h3>4. Instalação e entrega</h3>
      <p>A instalação acontece em até 30 dias após a vistoria. Ao final, o investidor recebe o termo de entrega com laudos e checklists, para dar o aceite.</p>
      <h3>5. Resultado</h3>
      <p>
        {f.sociedade}, descontada a taxa do sistema de {f.taxa}.
      </p>
    </article>
  )
}

/** Desenho de QR Code só para a prévia (não é um código lido pelo banco) */
export function QrExemplo({ semente }: { semente: string }) {
  const n = 25
  const modulos = useMemo(() => {
    let x = [...semente].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7)
    const aleatorio = () => {
      x = (x * 1103515245 + 12345) >>> 0
      return (x >>> 16) & 1
    }
    const finder = (r: number, c: number) => {
      for (const [r0, c0] of [
        [0, 0],
        [0, n - 7],
        [n - 7, 0],
      ]) {
        const i = r - r0
        const j = c - c0
        if (i >= -1 && i <= 7 && j >= -1 && j <= 7) {
          if (i < 0 || i > 6 || j < 0 || j > 6) return false
          return i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4)
        }
      }
      return null
    }
    const cel: [number, number][] = []
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) {
        const f = finder(r, c)
        if (f ?? aleatorio()) cel.push([r, c])
      }
    return cel
  }, [semente])

  return (
    <svg className={styles.qr} viewBox={`-2 -2 ${n + 4} ${n + 4}`} role="img" aria-label="QR Code do Pix (exemplo)">
      <rect x="-2" y="-2" width={n + 4} height={n + 4} fill="#fff" />
      {modulos.map(([r, c]) => (
        <rect key={`${r}-${c}`} x={c} y={r} width="1.02" height="1.02" fill="#111" />
      ))}
    </svg>
  )
}

/** Pagamento aprovado: resumo do pedido e próximos passos */
export function Confirmado({
  id,
  pedido,
  meio,
  email,
  whatsapp,
  licenciada,
  onVoltar,
}: {
  id: ChargerId
  pedido: string
  meio: string
  email: string
  whatsapp: string
  licenciada: string
  onVoltar: () => void
}) {
  const f = ficha(id)
  const p = plano(id)
  const passos = [
    `${licenciada} fala com você no WhatsApp ${whatsapp} para agendar a vistoria do local.`,
    'Depois da vistoria, a instalação fica pronta em até 30 dias.',
    ...(p.parcelas ? [`As ${p.parcelas} parcelas de ${moneyCents(p.parcela)} vencem a cada 30 dias. Cada cobrança chega 10 dias antes.`] : []),
  ]
  return (
    <section className={styles.confirmado} aria-labelledby="confirmado-titulo">
      <span className={styles.okIcone} aria-hidden>
        <Icon src={ICONS.checkBold} size={26} color="#fff" />
      </span>
      <div className={styles.okTexto}>
        <h1 id="confirmado-titulo" className="t-page-title">
          Eletroposto <Highlight>garantido!</Highlight>
        </h1>
        <p className="t-page-subtitle">
          Recebemos a entrada de {moneyCents(p.entrada)}. O contrato e o comprovante foram enviados para <b>{email}</b>.
        </p>
      </div>

      <div className={styles.recibo}>
        <Linhas
          itens={[
            ['Pedido', <b key="p">nº {pedido}</b>],
            ['Eletroposto', `${f.nome}, ${f.potencia}`],
            ['Pago com', meio],
            ['Valor pago', <b key="v">{moneyCents(p.entrada)}</b>],
          ]}
        />
      </div>

      <div className={styles.passos}>
        <h2 className={cn('t-section-title', styles.passosTitulo)}>Próximos passos</h2>
        <ol>
          {passos.map((t, i) => (
            <li key={i}>
              <span className={styles.passoNum} aria-hidden>
                {i + 1}
              </span>
              {t}
            </li>
          ))}
        </ol>
      </div>

      <button type="button" className={styles.voltar} onClick={onVoltar}>
        Voltar para a oferta (prévia)
      </button>
    </section>
  )
}
