import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { ICONS } from '../assets'
import { Highlight, ResponsavelBadge, ThemeToggle } from '../components/layout/PageShell'
import { Button } from '../components/ui/Button'
import { Field, FieldRow } from '../components/ui/Field'
import { Icon } from '../components/ui/Icon'
import { Modal } from '../components/ui/Modal'
import { ChargerCarousel } from '../gerador/components/ChargerCarousel'
import { FormSection } from '../gerador/components/Guided'
import { GeradorPageHeader } from '../gerador/components/Shell'
import { defaultsFor, NOMES_V2 } from '../gerador/guided'
import type { ChargerId } from '../gerador/model'
import { cn } from '../lib/cn'
import { maskCpf, maskPhone, moneyCents, onlyDigits } from '../lib/format'
import { focusFirstError } from '../lib/focusFirstError'
import { isFullName, isValidCpf, isValidEmail, isValidPhone } from '../lib/validators'
import { getResponsavel } from '../services/responsavel'
import { bandeira, cvvOk, ENTRADA, ficha, luhn, maskCartao, maskValidade, novoPedido, pixCopiaECola, validadeOk } from './oferta'
import { Confirmado, ContratoTexto, Escolhido, QrExemplo } from './Partes'
import ctl from '../components/ui/Controls.module.css'
import styles from './CadastroSimplificado.module.css'

type Meio = 'cartao' | 'pix'
type Etapa = 'form' | 'processando' | 'pix' | 'pago'

const BASE = defaultsFor('v2')
const DADOS = { nome: '', cpf: '', email: '', whatsapp: '' }
const CARTAO = { numero: '', nome: '', validade: '', cvv: '' }

/**
 * Oferta da live (#cadastro-simplificado): o link que a licenciada manda durante a live.
 * Tudo numa tela: escolher o eletroposto (com preço), ver os detalhes se quiser, informar os dados,
 * aceitar o contrato e pagar a entrada de R$ 9.997 no cartão ou no Pix. Prévia: o pagamento é simulado.
 */
export function CadastroSimplificado() {
  const { nome: licenciada } = getResponsavel()
  const idAceite = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const pagarRef = useRef<HTMLDivElement>(null)

  const [modelo, setModelo] = useState<ChargerId | null>(null)
  const [dados, setDados] = useState(DADOS)
  const [cartao, setCartao] = useState(CARTAO)
  const [meio, setMeio] = useState<Meio>('cartao')
  const [aceite, setAceite] = useState(false)
  const [mostrarErros, setMostrarErros] = useState(false)
  const [contrato, setContrato] = useState(false)
  const [etapa, setEtapa] = useState<Etapa>('form')
  const [pedido, setPedido] = useState(novoPedido)
  const [copiado, setCopiado] = useState(false)
  const [pagarVisivel, setPagarVisivel] = useState(false)

  const b = bandeira(cartao.numero)
  const erros = {
    nome: !isFullName(dados.nome) ? 'Informe nome e sobrenome' : null,
    cpf: !dados.cpf ? 'Informe o CPF' : !isValidCpf(dados.cpf) ? 'CPF inválido' : null,
    email: !isValidEmail(dados.email) ? 'Informe um e-mail válido' : null,
    whatsapp: !isValidPhone(dados.whatsapp) ? 'Informe um WhatsApp com DDD' : null,
    ...(meio === 'cartao'
      ? {
          numero: !luhn(cartao.numero) ? 'Confira o número do cartão' : null,
          titular: cartao.nome.trim().length < 3 ? 'Informe o nome impresso no cartão' : null,
          validade: !validadeOk(cartao.validade) ? 'Validade inválida' : null,
          cvv: !cvvOk(cartao.cvv, b) ? `Informe os ${b === 'Amex' ? 4 : 3} dígitos` : null,
        }
      : {}),
    aceite: !aceite ? 'Aceite o contrato para continuar' : null,
  }
  const valido = !Object.values(erros).some(Boolean)
  const mostra = (e: string | null | undefined) => (mostrarErros ? e : undefined)

  // A barra fixa do celular some quando o botão de pagar está na tela
  useEffect(() => {
    const el = pagarRef.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setPagarVisivel(entry.isIntersecting), { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [modelo, etapa])

  useEffect(() => {
    if (etapa === 'pago') window.scrollTo({ top: 0 })
  }, [etapa])

  const trocarMeio = (m: Meio) => {
    setMeio(m)
    if (etapa === 'pix') setEtapa('form')
  }

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    if (!valido) {
      setMostrarErros(true)
      focusFirstError()
      return
    }
    if (meio === 'pix') {
      setEtapa('pix')
      return
    }
    setEtapa('processando')
    window.setTimeout(() => setEtapa('pago'), 1400)
  }

  // Barra do celular: leva ao primeiro campo vazio; com tudo preenchido, ao botão de pagar
  const continuar = () => {
    const campos = [...(formRef.current?.querySelectorAll<HTMLInputElement>('input[required]') ?? [])]
    const vazio = campos.find((i) => (i.type === 'checkbox' ? !i.checked : !i.value.trim()))
    const alvo: HTMLElement | null | undefined = vazio ?? pagarRef.current?.querySelector('button')
    alvo?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    alvo?.focus({ preventScroll: true })
  }

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(pixCopiaECola(pedido))
    } catch {
      /* sem acesso à área de transferência: o código continua visível para copiar à mão */
    }
    setCopiado(true)
    window.setTimeout(() => setCopiado(false), 2000)
  }

  const recomecar = () => {
    setModelo(null)
    setDados(DADOS)
    setCartao(CARTAO)
    setMeio('cartao')
    setAceite(false)
    setMostrarErros(false)
    setPedido(novoPedido())
    setEtapa('form')
    window.scrollTo({ top: 0 })
  }

  const meioPago = meio === 'pix' ? 'Pix' : `Cartão ${b ?? ''} final ${onlyDigits(cartao.numero).slice(-4)}`.replace('  ', ' ')

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <span className={styles.isotipo}>
            <img src={ICONS.logoIsotipo} width={14.787} height={20.571} alt="iGreen Mob" />
          </span>
          <div className={styles.headerRight}>
            <ThemeToggle />
            <ResponsavelBadge />
          </div>
        </header>

        {etapa === 'pago' && modelo ? (
          <Confirmado id={modelo} pedido={pedido} meio={meioPago} email={dados.email} whatsapp={dados.whatsapp} licenciada={licenciada} onVoltar={recomecar} />
        ) : (
          <>
            <div className={styles.intro}>
              <p className={styles.live}>
                <span className={styles.liveDot} aria-hidden />
                <b>Ao vivo</b>
                <span className={styles.liveTexto}>Oferta da live, link de {licenciada}</span>
              </p>
              <GeradorPageHeader
                className={styles.titulo}
                title={
                  <>
                    Garanta seu <Highlight>eletroposto</Highlight>
                  </>
                }
                subtitle={`Escolha o modelo, preencha seus dados e pague a entrada de ${moneyCents(ENTRADA)}.`}
              />
            </div>

            <form ref={formRef} className={styles.form} noValidate onSubmit={enviar}>
              <FormSection title="Escolha seu eletroposto" description="Equipamento, instalação, pintura e licença iGreen inclusos em todos.">
                <ChargerCarousel inputs={BASE} selected={modelo} showPrice names={NOMES_V2} onSelect={setModelo} />
                {modelo ? <Escolhido id={modelo} /> : null}
              </FormSection>

              {modelo ? (
                <>
                  <FormSection title="Seus dados" description="Para o contrato e para a licenciada falar com você.">
                    <div className={styles.campos}>
                      <Field
                        label="NOME COMPLETO"
                        value={dados.nome}
                        onChange={(nome) => setDados({ ...dados, nome })}
                        autoComplete="name"
                        placeholder="Seu nome e sobrenome"
                        required
                        valid={!erros.nome}
                        error={mostra(erros.nome)}
                      />
                      <FieldRow stackOnMobile>
                        <Field
                          label="CPF"
                          value={dados.cpf}
                          onChange={(cpf) => setDados({ ...dados, cpf })}
                          mask={maskCpf}
                          inputMode="numeric"
                          placeholder="000.000.000-00"
                          required
                          valid={!erros.cpf}
                          error={mostra(erros.cpf)}
                        />
                        <Field
                          label="WHATSAPP"
                          value={dados.whatsapp}
                          onChange={(whatsapp) => setDados({ ...dados, whatsapp })}
                          mask={maskPhone}
                          inputMode="tel"
                          autoComplete="tel-national"
                          placeholder="(00) 00000-0000"
                          required
                          valid={!erros.whatsapp}
                          error={mostra(erros.whatsapp)}
                        />
                      </FieldRow>
                      <Field
                        label="E-MAIL"
                        type="email"
                        value={dados.email}
                        onChange={(email) => setDados({ ...dados, email })}
                        inputMode="email"
                        autoComplete="email"
                        placeholder="seuemail@mail.com.br"
                        required
                        valid={!erros.email}
                        error={mostra(erros.email)}
                      />
                    </div>
                  </FormSection>

                  <FormSection title="Pagamento da entrada" description={`${moneyCents(ENTRADA)} agora, no cartão ou no Pix, para garantir o seu eletroposto.`}>
                    <div className={styles.campos}>
                      <div className={ctl.tabs} role="radiogroup" aria-label="Forma de pagamento">
                        {(
                          [
                            ['cartao', 'Cartão de crédito', <IconeCartao key="c" />],
                            ['pix', 'Pix', <IconePix key="p" />],
                          ] as const
                        ).map(([valor, rotulo, icone]) => (
                          <button
                            key={valor}
                            type="button"
                            role="radio"
                            aria-checked={meio === valor}
                            className={cn(ctl.tab, 't-body-md-semibold', meio === valor && ctl.tabActive)}
                            onClick={() => trocarMeio(valor)}
                          >
                            {icone}
                            {rotulo}
                          </button>
                        ))}
                      </div>

                      {meio === 'cartao' ? (
                        <>
                          <Field
                            label="NÚMERO DO CARTÃO"
                            value={cartao.numero}
                            onChange={(numero) => setCartao({ ...cartao, numero })}
                            mask={maskCartao}
                            inputMode="numeric"
                            autoComplete="cc-number"
                            placeholder="0000 0000 0000 0000"
                            required
                            error={mostra(erros.numero)}
                            trailing={b ? <span className={styles.bandeira}>{b}</span> : undefined}
                          />
                          <Field
                            label="NOME IMPRESSO NO CARTÃO"
                            value={cartao.nome}
                            onChange={(nome) => setCartao({ ...cartao, nome: nome.toUpperCase() })}
                            autoComplete="cc-name"
                            placeholder="COMO ESTÁ NO CARTÃO"
                            required
                            error={mostra(erros.titular)}
                          />
                          <FieldRow>
                            <Field
                              label="VALIDADE"
                              value={cartao.validade}
                              onChange={(validade) => setCartao({ ...cartao, validade })}
                              mask={maskValidade}
                              inputMode="numeric"
                              autoComplete="cc-exp"
                              placeholder="MM/AA"
                              required
                              error={mostra(erros.validade)}
                            />
                            <Field
                              label="CVV"
                              value={cartao.cvv}
                              onChange={(cvv) => setCartao({ ...cartao, cvv })}
                              mask={(v) => onlyDigits(v).slice(0, 4)}
                              inputMode="numeric"
                              autoComplete="cc-csc"
                              placeholder={b === 'Amex' ? '0000' : '000'}
                              required
                              error={mostra(erros.cvv)}
                            />
                          </FieldRow>
                        </>
                      ) : etapa === 'pix' ? (
                        <div className={styles.pix}>
                          <QrExemplo semente={pedido} />
                          <div className={styles.pixLado}>
                            <p className={styles.pixTitulo}>Pague {moneyCents(ENTRADA)} pelo app do seu banco</p>
                            <p className={styles.pixTexto}>Escaneie o QR Code ou copie o código abaixo. O código vale por 30 minutos.</p>
                            <div className={styles.codigo}>
                              <span className={styles.codigoTexto}>
                                <span>{pixCopiaECola(pedido)}</span>
                              </span>
                              <button type="button" className={styles.copiar} onClick={copiar}>
                                {copiado ? 'Copiado' : 'Copiar'}
                              </button>
                            </div>
                            <p className={styles.aguardando} role="status">
                              <span className={styles.spinner} aria-hidden />
                              Aguardando o pagamento
                            </p>
                            <button type="button" className={styles.simular} onClick={() => setEtapa('pago')}>
                              Simular pagamento confirmado (prévia)
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className={styles.pixInfo}>Ao continuar, geramos o QR Code e o código copia e cola. O pagamento é confirmado na hora.</p>
                      )}

                      <div className={cn(styles.aceite, mostrarErros && erros.aceite && styles.aceiteErro)}>
                        <span className={cn(ctl.checkbox, aceite && ctl.checkboxOn)}>
                          <input
                            id={idAceite}
                            type="checkbox"
                            required
                            checked={aceite}
                            onChange={(e) => setAceite(e.target.checked)}
                            className={ctl.checkInput}
                            aria-invalid={mostrarErros && !aceite ? true : undefined}
                            aria-describedby={mostrarErros && !aceite ? `${idAceite}-msg` : undefined}
                          />
                          {aceite ? <Icon src={ICONS.checkSmall} size={14} color="var(--fg-on-primary)" /> : null}
                        </span>
                        <label htmlFor={idAceite} className={cn(ctl.checkLabel, 't-caption')}>
                          Li e aceito o{' '}
                          <button
                            type="button"
                            className={styles.linkContrato}
                            onClick={(e) => {
                              e.preventDefault()
                              setContrato(true)
                            }}
                          >
                            contrato de participação
                          </button>{' '}
                          do eletroposto.
                        </label>
                      </div>
                      {mostrarErros && erros.aceite ? (
                        <p id={`${idAceite}-msg`} className={styles.erroAceite} role="alert">
                          {erros.aceite}
                        </p>
                      ) : null}

                      {etapa === 'pix' ? null : (
                        <div ref={pagarRef} className={styles.pagar}>
                          <Button type="submit" loading={etapa === 'processando'}>
                            {meio === 'pix' ? `Gerar Pix de ${moneyCents(ENTRADA)}` : `Pagar ${moneyCents(ENTRADA)}`}
                          </Button>
                          <p className={styles.previa}>
                            <Cadeado />
                            Prévia: nenhum valor é cobrado de verdade.
                          </p>
                        </div>
                      )}
                    </div>
                  </FormSection>
                </>
              ) : null}
            </form>
          </>
        )}
      </div>

      {modelo && etapa !== 'pago' ? (
        <div className={cn(styles.barra, (pagarVisivel || etapa === 'pix') && styles.barraOculta)} aria-hidden={pagarVisivel || etapa === 'pix'}>
          <div className={styles.barraTexto}>
            <b>{moneyCents(ENTRADA)}</b>
            <span>Entrada da {ficha(modelo).nome}</span>
          </div>
          <Button className={styles.barraBotao} onClick={continuar} tabIndex={pagarVisivel ? -1 : 0}>
            Pagar
          </Button>
        </div>
      ) : null}

      {modelo ? (
        <Modal open={contrato} onClose={() => setContrato(false)} label="Contrato de participação" width={640} padding="compact">
          <ContratoTexto id={modelo} nome={dados.nome} cpf={dados.cpf} licenciada={licenciada} />
          <div className={styles.contratoAcoes}>
            <Button
              onClick={() => {
                setAceite(true)
                setContrato(false)
              }}
            >
              Li e aceito o contrato
            </Button>
          </div>
        </Modal>
      ) : null}
    </main>
  )
}

function IconeCartao() {
  return (
    <svg className={styles.tabIcone} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 10h19M6.5 15h4" />
    </svg>
  )
}

function IconePix() {
  return (
    <svg className={styles.tabIcone} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <path d="M12 2.8 21.2 12 12 21.2 2.8 12z" />
      <path d="m7.4 12 4.6-4.6 4.6 4.6-4.6 4.6z" />
    </svg>
  )
}

function Cadeado() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="11" width="16" height="10" rx="2.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}
