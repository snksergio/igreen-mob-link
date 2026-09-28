import { useState, type ReactNode } from 'react'
import { ICONS } from '../../assets'
import { Slider } from '../../components/ui/Controls'
import { Icon } from '../../components/ui/Icon'
import { cn } from '../../lib/cn'
import { moneyCents } from '../../lib/format'
import { fixed, hoursLabel, num, pct } from '../format'
import { CONEXOES, TAX_KEYS, taxCustom } from '../guided'
import { CHARGERS, DEFAULTS, TERMS, recurrenceProjection, type SimInputs } from '../model'
import { useGerador } from '../state'
import { ChargerCarousel } from './ChargerCarousel'
import { FormNumber } from './Guided'
import { Segmented } from './Segmented'
import { TributosPanel } from './TributosPanel'
import sim from './Sim.module.css'
import styles from './Guided.module.css'

/* Campos de cada seção do formulário v2 (as seções aparecem conforme as anteriores são preenchidas) */

const INCLUSO = ['Equipamento', 'Instalação', 'Pintura', 'Licença iGreen']
const BATERIAS = [
  { nome: 'Dolphin Mini', kwh: 38, href: 'https://www.byd.com/br/noticias-byd-brasil/BYD-Dolphin-Mini-chega-para-revolucionar-o-mercado-de-carros-no-Brasil' },
  { nome: 'Seal', kwh: 82.56, href: 'https://www.byd.com/material/byd-site/br/fichas-tecnicas-2026/356.1575.7802.6%20-%20FICHA%20TECNICA%20-%20SEAL_V2.pdf' },
  { nome: 'Geely EX2', kwh: 39.4, href: 'https://www.geelybrasil.com.br/geely-ex2-chega-ao-brasil' },
]

function More({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className={styles.more}>
      <summary>
        {label}
        <Icon src={ICONS.chevronDown} size={16} className={styles.moreChevron} />
      </summary>
      {children}
    </details>
  )
}

function useFilled() {
  const { state } = useGerador()
  const set = new Set(state.simulacao.preenchidos)
  return (...keys: string[]) => keys.every((k) => set.has(k))
}

/* ================= Eletroposto ================= */

export function EletropostoFields() {
  const { state, setSim, patch } = useGerador()
  const filled = useFilled()
  const { inputs, preenchidos } = state.simulacao

  const choose = (charger: SimInputs['charger']) => {
    // Carros ainda não informados seguem o padrão do modelo (não aparecem até a pessoa digitar)
    setSim(filled('cars') ? { charger } : { charger, cars: CHARGERS[charger].defaultCars })
    if (!filled('charger')) patch('simulacao', { preenchidos: [...preenchidos, 'charger'] })
  }

  return (
    <>
      <ChargerCarousel inputs={inputs} selected={filled('charger') ? inputs.charger : null} onSelect={choose} />
      <div className={styles.included}>
        <span className={styles.includedTitle}>Incluso em todos os modelos</span>
        <ul className={styles.includedList}>
          {INCLUSO.map((item) => (
            <li key={item}>
              <span className={styles.tick} aria-hidden>
                <Icon src={ICONS.checkBold} size={8} color="#fff" />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

/* ================= Movimento ================= */

export function MovimentoFields() {
  const { state, result } = useGerador()
  const filled = useFilled()
  const s = state.simulacao.inputs
  const cap = result.capacity
  const max = Math.max(1, cap.maxCars)
  const perConnector =
    s.charger === 'duo'
      ? `${cap.acCars} ${cap.acCars === 1 ? 'carro' : 'carros'} em 7 kW (${hoursLabel(cap.acHours)}) e ${cap.dcCars} em 40 kW (${hoursLabel(cap.dcHours)})`
      : `${s.cars} ${s.cars === 1 ? 'carro' : 'carros'} em ${s.charger === 'lento' ? '7' : '80'} kW (${hoursLabel(cap.requiredHours)})`

  return (
    <>
      <div className={sim.row2}>
        <FormNumber field="cars" label="CARROS POR DIA" suffix="carros" min={1} max={max} placeholder="Ex.: 7" helper={`Até ${max} por dia neste modelo`} />
        <FormNumber field="days" label="DIAS DE OPERAÇÃO" suffix="por mês" min={1} max={31} placeholder="Ex.: 30" helper="De 1 a 31 dias" />
      </div>
      <FormNumber
        field="kwh"
        label="ENERGIA POR RECARGA"
        suffix="kWh"
        decimals={1}
        min={0.1}
        max={500}
        placeholder="Ex.: 25"
        helper={
          <>
            Média vendida por carro. Baterias de referência:{' '}
            {BATERIAS.map((b, i) => (
              <span key={b.nome}>
                {i ? ' · ' : ''}
                <a className={styles.link} href={b.href} target="_blank" rel="noreferrer">
                  {b.nome} {num(b.kwh, 2)} kWh
                </a>
              </span>
            ))}
          </>
        }
      />

      {filled('cars', 'kwh') ? (
        <div className={styles.field}>
          <div className={sim.groupHead}>
            <span className={sim.label}>Capacidade usada</span>
            <span className={sim.meterValue}>{pct(cap.utilization * 100)}</span>
          </div>
          <div className={sim.meterTrack} role="meter" aria-label="Capacidade usada" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(cap.utilization * 100)}>
            <span className={cn(sim.meterFill, cap.utilization >= 0.9 && sim.meterHigh)} style={{ width: `${Math.min(100, cap.utilization * 100)}%` }} />
          </div>
          <More label="Como calculamos a capacidade">
            <p>
              Por dia: {perConnector}. <b>Limite estimado: {max} carros/dia.</b>
            </p>
            <p>
              Premissas: {s.powerUse}% da potência nominal e {s.turnoverMinutes} min entre carros.
              {s.charger === 'duo' ? ` Conectores simultâneos; divisão aproximada de ${s.acShare}% em 7 kW.` : ''} Potência efetiva e permanência variam conforme o
              veículo. Capacidade não garante movimento.
            </p>
          </More>
        </div>
      ) : null}
    </>
  )
}

/* ================= Preços ================= */

export function PrecosFields() {
  const { state, setSim } = useGerador()
  const filled = useFilled()
  const s = state.simulacao.inputs
  const margem = s.sale - s.cost

  return (
    <>
      <div className={styles.field}>
        <div className={sim.row2}>
          <FormNumber field="cost" label="CUSTO DA ENERGIA" suffix="R$/kWh" decimals={2} max={100} placeholder="Ex.: 0,80" helper="Com os tributos da fatura" />
          <FormNumber field="sale" label="PREÇO DE VENDA" suffix="R$/kWh" decimals={2} max={100} placeholder="Ex.: 2,20" helper="Cobrado do motorista" />
        </div>
        {filled('cost', 'sale') ? (
          <span className={cn(sim.margin, margem < 0 && sim.marginNegative, styles.alignStart)}>Margem bruta: R$ {fixed(margem)} por kWh</span>
        ) : null}
      </div>

      <div className={styles.field}>
        <div className={sim.groupHead}>
          <span className={sim.label}>Participação do dono do ponto</span>
          <span className={sim.bigValue}>{pct(s.share, 0)}</span>
        </div>
        <Slider value={s.share} min={0} max={20} onChange={(share) => setSim({ share })} label="Participação do dono do ponto" valueText={`${s.share}% do lucro líquido`} />
        <div className={sim.scale}>
          <span>0%</span>
          <span className={sim.scaleLimit}>até 20%</span>
        </div>
        <span className={styles.help}>Opcional. Sobre o lucro líquido positivo, depois dos impostos.</span>
      </div>

      <div className={styles.info}>
        <span className={styles.infoIcon} aria-hidden>
          <Icon src={ICONS.checkBold} size={9} color="#fff" />
        </span>
        <div className={styles.infoText}>
          <span className={styles.infoTitle}>Administração iGreen</span>
          <span className={styles.help}>Fixa, sobre o faturamento: plataforma, atendimento e taxas de cartão.</span>
        </div>
        <span className={styles.infoValue}>{pct(TERMS.administration * 100, 0)}</span>
      </div>
    </>
  )
}

/* ================= Carteira ================= */

export function CarteiraFields() {
  const { state, setSim } = useGerador()
  const filled = useFilled()
  const s = state.simulacao.inputs
  const rec = recurrenceProjection(s)
  const linhas = [
    { titulo: 'No 1º mês', clientes: s.monthlyClients, mensal: rec.firstMonth, acumulado: rec.firstMonth },
    ...rec.periods.map((p, i) => ({ titulo: ['Fim do 1º ano', 'Fim do 5º ano', 'Fim do 10º ano'][i], clientes: p.clients, mensal: p.monthly, acumulado: p.accumulated })),
  ]

  return (
    <>
      <FormNumber field="monthlyClients" label="NOVOS CLIENTES POR MÊS" suffix="clientes" min={0} max={500} placeholder="Ex.: 90" helper="Clientes conectados pelo seu ponto, de 0 a 500 por mês" />

      <div className={styles.field}>
        <span className={sim.label}>Conexões oferecidas</span>
        <div className={styles.group} role="group" aria-label="Conexões oferecidas">
          {CONEXOES.map((c) => {
            const on = s[c.key]
            return (
              <button key={c.key} type="button" role="checkbox" aria-checked={on} className={cn(styles.groupItem, on && styles.groupOn)} onClick={() => setSim({ [c.key]: !on })}>
                <span className={styles.groupTop}>
                  <span className={styles.checkBox} aria-hidden>
                    {on ? <Icon src={ICONS.checkBold} size={9} color="#fff" /> : null}
                  </span>
                  <span className={styles.groupName}>{c.nome}</span>
                </span>
                <span className={styles.groupValue}>{moneyCents(c.valor)}/mês</span>
                <span className={styles.groupDetail}>por cliente · {c.detalhe}</span>
              </button>
            )
          })}
        </div>
      </div>

      {filled('monthlyClients') ? (
        <div className={styles.field}>
          <span className={sim.label}>Quanto a carteira rende por mês</span>
          <dl className={styles.list}>
            {linhas.map((l) => (
              <div key={l.titulo} className={styles.listRow}>
                <div className={styles.listLeft}>
                  <dt>{l.titulo}</dt>
                  <span>{num(l.clientes)} clientes na carteira</span>
                </div>
                <dd className={styles.listRight}>
                  <b>{moneyCents(l.mensal)}/mês</b>
                  <span>acumulado {moneyCents(l.acumulado)}</span>
                </dd>
              </div>
            ))}
          </dl>
          <span className={styles.help}>{moneyCents(rec.perClient)}/mês por cliente nas conexões escolhidas. Entra no resultado do investidor.</span>
        </div>
      ) : null}
    </>
  )
}

/* ================= Tributos ================= */

export function TributosFields() {
  const { state, setSim } = useGerador()
  const s = state.simulacao.inputs
  const [mode, setMode] = useState<'padrao' | 'ajustar'>(() => (taxCustom(s) ? 'ajustar' : 'padrao'))

  const choose = (next: 'padrao' | 'ajustar') => {
    setMode(next)
    // Voltar ao padrão desfaz os ajustes
    if (next === 'padrao') setSim(Object.fromEntries(TAX_KEYS.map((k) => [k, DEFAULTS[k]])) as Partial<SimInputs>)
  }

  return (
    <>
      <Segmented
        label="Premissas de tributos"
        value={mode}
        options={[
          { value: 'padrao', label: 'Usar premissas padrão' },
          { value: 'ajustar', label: 'Ajustar valores' },
        ]}
        onChange={choose}
      />
      {mode === 'padrao' ? (
        <div className={styles.info}>
          <span className={styles.infoIcon} aria-hidden>
            <Icon src={ICONS.checkBold} size={9} color="#fff" />
          </span>
          <div className={styles.infoText}>
            <span className={styles.infoTitle}>Lucro Real · base 2026</span>
            <span className={styles.help}>
              IRPJ 15% + adicional de 10% acima de R$ 20 mil/mês · CSLL 9% · PIS {num(DEFAULTS.pisRate, 2)}% · Cofins {num(DEFAULTS.cofinsRate, 2)}% · tributo local e
              comissões a definir.
            </span>
          </div>
        </div>
      ) : (
        <TributosPanel />
      )}
    </>
  )
}
