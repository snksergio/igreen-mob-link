import { useState, type ReactNode } from 'react'
import { ICONS } from '../../assets'
import { QuantityStepper, Slider } from '../../components/ui/Controls'
import { Icon } from '../../components/ui/Icon'
import { cn } from '../../lib/cn'
import { moneyCents } from '../../lib/format'
import { fixed, hoursLabel, num, pct } from '../format'
import { CONEXOES, TAX_KEYS, taxCustom } from '../guided'
import { CHARGERS, DEFAULTS, TERMS, recurrenceProjection, type SimInputs } from '../model'
import { useGerador } from '../state'
import { ChargerCarousel } from './ChargerCarousel'
import { NumInput } from './NumInput'
import { Segmented } from './Segmented'
import { TributosPanel } from './TributosPanel'
import sim from './Sim.module.css'
import styles from './Guided.module.css'

/* Campos de cada passo do simulador guiado (v2) e o resumo que aparece quando o passo é concluído */

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

/* ================= 1 · Eletroposto ================= */

export function EletropostoStep() {
  const { state, setSim } = useGerador()
  return (
    <>
      <ChargerCarousel inputs={state.simulacao.inputs} onSelect={(charger) => setSim({ charger, cars: CHARGERS[charger].defaultCars })} />
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

/* ================= 2 · Movimento ================= */

export function MovimentoStep() {
  const { state, setSim, result } = useGerador()
  const s = state.simulacao.inputs
  const cap = result.capacity
  const max = Math.max(1, cap.maxCars)
  const perConnector =
    s.charger === 'duo'
      ? `${cap.acCars} ${cap.acCars === 1 ? 'carro' : 'carros'} em 7 kW (${hoursLabel(cap.acHours)}) e ${cap.dcCars} em 40 kW (${hoursLabel(cap.dcHours)})`
      : `${s.cars} ${s.cars === 1 ? 'carro' : 'carros'} em ${s.charger === 'lento' ? '7' : '80'} kW (${hoursLabel(cap.requiredHours)})`

  return (
    <>
      <div className={styles.field}>
        <div className={sim.groupHead}>
          <span className={sim.label}>Carros por dia</span>
          <span className={sim.bigValue}>
            {s.cars}
            <small>{s.cars === 1 ? 'carro' : 'carros'}</small>
          </span>
        </div>
        <Slider value={Math.min(s.cars, max)} min={1} max={max} onChange={(cars) => setSim({ cars })} label="Carros por dia" valueText={`${s.cars} carros por dia`} />
        <div className={sim.scale}>
          <span>1 carro</span>
          <span className={sim.scaleLimit}>até {max} · limite estimado</span>
        </div>
      </div>

      <div className={sim.row2}>
        <div className={styles.field}>
          <span className={sim.label}>Dias de operação</span>
          <div className={sim.controlBox}>
            <span className={styles.help}>por mês</span>
            <QuantityStepper value={s.days} min={1} max={31} onChange={(days) => setSim({ days })} label="Dias de operação por mês" />
          </div>
        </div>
        <NumInput label="ENERGIA POR RECARGA" value={s.kwh} decimals={1} suffix="kWh" min={0.1} max={500} onChange={(kwh) => setSim({ kwh })} helper="Média vendida por carro" />
      </div>

      <p className={styles.help}>
        Referência de baterias:{' '}
        {BATERIAS.map((b, i) => (
          <span key={b.nome}>
            {i ? ' · ' : ''}
            <a href={b.href} target="_blank" rel="noreferrer">
              {b.nome} {num(b.kwh, 2)} kWh
            </a>
          </span>
        ))}
      </p>

      <div className={styles.field}>
        <div className={sim.groupHead}>
          <span className={sim.label}>Capacidade usada</span>
          <span className={sim.meterValue}>{pct(cap.utilization * 100)}</span>
        </div>
        <div className={sim.meterTrack} role="meter" aria-label="Capacidade usada" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(cap.utilization * 100)}>
          <span className={cn(sim.meterFill, cap.utilization >= 0.9 && sim.meterHigh)} style={{ width: `${Math.min(100, cap.utilization * 100)}%` }} />
        </div>
        <span className={styles.help}>Limite estimado: {max} carros por dia neste modelo.</span>
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
    </>
  )
}

/* ================= 3 · Preços ================= */

export function PrecosStep() {
  const { state, setSim } = useGerador()
  const s = state.simulacao.inputs
  const margem = s.sale - s.cost

  return (
    <>
      <div className={styles.field}>
        <div className={sim.row2}>
          <NumInput label="CUSTO DA ENERGIA" value={s.cost} suffix="R$/kWh" max={100} onChange={(cost) => setSim({ cost })} helper="Com os tributos da fatura" />
          <NumInput label="PREÇO DE VENDA" value={s.sale} suffix="R$/kWh" max={100} onChange={(sale) => setSim({ sale })} helper="Cobrado do motorista" />
        </div>
        <span className={cn(sim.margin, margem < 0 && sim.marginNegative, styles.alignStart)}>
          Margem bruta: R$ {fixed(margem)} por kWh
        </span>
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
        <span className={styles.help}>Sobre o lucro líquido positivo, depois dos impostos.</span>
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

/* ================= 4 · Carteira ================= */

export function CarteiraStep() {
  const { state, setSim } = useGerador()
  const s = state.simulacao.inputs
  const rec = recurrenceProjection(s)
  const [ano1, ano5, ano10] = rec.periods

  return (
    <>
      <div className={styles.field}>
        <div className={sim.groupHead}>
          <span className={sim.label}>Novos clientes por mês</span>
          <QuantityStepper value={s.monthlyClients} min={0} max={500} onChange={(monthlyClients) => setSim({ monthlyClients })} label="Novos clientes por mês" />
        </div>
        <Slider value={s.monthlyClients} min={0} max={500} onChange={(monthlyClients) => setSim({ monthlyClients })} label="Novos clientes por mês" valueText={`${s.monthlyClients} clientes por mês`} />
        <div className={sim.scale}>
          <span>0</span>
          <span>500</span>
        </div>
      </div>

      <div className={styles.field}>
        <span className={sim.label}>Conexões oferecidas</span>
        <div className={styles.checks}>
          {CONEXOES.map((c) => {
            const on = s[c.key]
            return (
              <button key={c.key} type="button" role="checkbox" aria-checked={on} className={cn(styles.checkRow, on && styles.checkOn)} onClick={() => setSim({ [c.key]: !on })}>
                <span className={styles.checkBox} aria-hidden>
                  {on ? <Icon src={ICONS.checkBold} size={9} color="#fff" /> : null}
                </span>
                <span className={styles.checkName}>{c.nome}</span>
                <span className={styles.checkValue}>
                  <b>{moneyCents(c.valor)}/mês</b> por cliente · {c.detalhe}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className={styles.field}>
        <span className={sim.label}>Quanto a carteira rende por mês</span>
        <dl className={styles.projection}>
          {[
            { label: 'No 1º mês', monthly: rec.firstMonth, acc: null },
            { label: 'Fim do 1º ano', monthly: ano1.monthly, acc: ano1.accumulated },
            { label: 'Fim do 5º ano', monthly: ano5.monthly, acc: ano5.accumulated },
            { label: 'Fim do 10º ano', monthly: ano10.monthly, acc: ano10.accumulated },
          ].map((r) => (
            <div key={r.label}>
              <dt>{r.label}</dt>
              <dd>
                {moneyCents(r.monthly)}/mês
                {r.acc != null ? <small>acumulado {moneyCents(r.acc)}</small> : null}
              </dd>
            </div>
          ))}
        </dl>
        <span className={styles.help}>
          {moneyCents(rec.perClient)}/mês por cliente nas conexões escolhidas. Entra no resultado do investidor.
        </span>
      </div>
    </>
  )
}

/* ================= 5 · Tributos ================= */

export function TributosStep() {
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
