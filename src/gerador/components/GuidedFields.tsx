import { useState, type ReactNode } from 'react'
import { ICONS } from '../../assets'
import { Slider } from '../../components/ui/Controls'
import { Icon } from '../../components/ui/Icon'
import { cn } from '../../lib/cn'
import { moneyCents } from '../../lib/format'
import { fixed, hoursLabel, num, pct } from '../format'
import { CLIENTES_DIA, CONEXOES, MAX_CLIENTES_DIA, NOMES_V2, TAX_KEYS, clientesPorDia, escolhaModeloV2, taxCustom } from '../guided'
import { DEFAULTS, recurrenceProjection, type SimInputs } from '../model'
import { useGerador } from '../state'
import { ChargerCarousel } from './ChargerCarousel'
import { NumInput } from './NumInput'
import { Segmented } from './Segmented'
import { TributosPanel } from './TributosPanel'
import sim from './Sim.module.css'
import styles from './Guided.module.css'

/* Campos de cada seção do formulário v2 (já preenchidos com as premissas padrão, como no simulador com abas) */

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

/* ================= Eletroposto ================= */

export function EletropostoFields() {
  const { state, setSim } = useGerador()
  const s = state.simulacao.inputs

  return (
    <>
      {/* Trocar o modelo sugere os carros, os clientes por dia e liga as três conexões (dá para ajustar depois) */}
      <ChargerCarousel inputs={s} hideCapital names={NOMES_V2} onSelect={(charger) => setSim(escolhaModeloV2(charger, s.days))} />
      <div className={styles.included}>
        <span className={styles.includedTitle}>Incluso em todos os modelos:</span>
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
      <div className={sim.row2}>
        <NumInput label="CARROS POR DIA" value={s.cars} decimals={0} suffix="carros" min={1} max={max} onChange={(cars) => setSim({ cars })} helper={`Até ${max} por dia neste modelo`} />
        <NumInput
          label="DIAS DE OPERAÇÃO"
          value={s.days}
          decimals={0}
          suffix="por mês"
          min={1}
          max={31}
          onChange={(days) => setSim({ days, monthlyClients: clientesPorDia(s) * days })}
          helper="De 1 a 31 dias"
        />
      </div>
      <NumInput
        label="ENERGIA POR RECARGA"
        value={s.kwh}
        suffix="kWh"
        decimals={1}
        min={0.1}
        max={500}
        onChange={(kwh) => setSim({ kwh })}
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
    </>
  )
}

/* ================= Preços ================= */

export function PrecosFields() {
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
        <span className={cn(sim.margin, margem < 0 && sim.marginNegative, styles.alignStart)}>Margem bruta: R$ {fixed(margem)} por kWh</span>
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
        <span className={styles.infoValue}>{pct(s.adminRate, 0)}</span>
      </div>
    </>
  )
}

/* ================= Carteira ================= */

export function CarteiraFields() {
  const { state, setSim } = useGerador()
  const s = state.simulacao.inputs
  const rec = recurrenceProjection(s)
  const porDia = clientesPorDia(s)
  const linhas = [
    { titulo: 'No 1º mês', clientes: s.monthlyClients, mensal: rec.firstMonth, acumulado: rec.firstMonth },
    ...rec.periods.map((p, i) => ({ titulo: ['Fim do 1º ano', 'Fim do 5º ano', 'Fim do 10º ano'][i], clientes: p.clients, mensal: p.monthly, acumulado: p.accumulated })),
  ]

  return (
    <>
      {/* Slider: arrastar com o dedo para aumentar ou diminuir; o modelo escolhido sugere o valor inicial */}
      <div className={styles.field}>
        <div className={sim.groupHead}>
          <span className={sim.label}>Novos clientes por dia</span>
          <span className={sim.bigValue}>
            {porDia}
            <small>{porDia === 1 ? 'cliente' : 'clientes'} por dia</small>
          </span>
        </div>
        <Slider
          value={porDia}
          min={0}
          max={MAX_CLIENTES_DIA}
          onChange={(n) => setSim({ monthlyClients: n * s.days })}
          label="Novos clientes por dia"
          valueText={`${porDia} ${porDia === 1 ? 'cliente' : 'clientes'} por dia`}
        />
        <div className={sim.scale}>
          <span>0</span>
          <span className={sim.scaleLimit}>até {MAX_CLIENTES_DIA} por dia</span>
        </div>
        <span className={styles.help}>
          Sugestão para este modelo: {CLIENTES_DIA[s.charger]} por dia. São {num(s.monthlyClients)} clientes por mês em {s.days} dias de operação.
        </span>
      </div>

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
