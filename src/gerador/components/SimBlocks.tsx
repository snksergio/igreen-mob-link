import { ICONS } from '../../assets'
import { QuantityStepper, Slider } from '../../components/ui/Controls'
import { Icon } from '../../components/ui/Icon'
import { cn } from '../../lib/cn'
import { money, moneyCents } from '../../lib/format'
import { fixed, hoursLabel, num, pct } from '../format'
import { TERMS, recurrenceProjection } from '../model'
import { useGerador } from '../state'
import { NumInput } from './NumInput'
import { SimSection } from './SimSection'
import styles from './Sim.module.css'

const BATERIAS = [
  { nome: 'BYD Dolphin Mini', kwh: 38, fonte: 'Versão de 38 kWh', href: 'https://www.byd.com/br/noticias-byd-brasil/BYD-Dolphin-Mini-chega-para-revolucionar-o-mercado-de-carros-no-Brasil' },
  { nome: 'BYD Seal', kwh: 82.56, fonte: 'Ficha técnica BYD', href: 'https://www.byd.com/material/byd-site/br/fichas-tecnicas-2026/356.1575.7802.6%20-%20FICHA%20TECNICA%20-%20SEAL_V2.pdf' },
  { nome: 'Geely EX2', kwh: 39.4, fonte: 'Pro / Max', href: 'https://www.geelybrasil.com.br/geely-ex2-chega-ao-brasil' },
]

/* ================= 02 · Movimento e recarga ================= */

export function MovimentoBlock() {
  const { state, setSim, result } = useGerador()
  const s = state.simulacao.inputs
  const cap = result.capacity
  const max = Math.max(1, cap.maxCars)
  const high = cap.utilization >= 0.9

  // Texto do uso por conector, como na referência
  const perConnector =
    s.charger === 'duo'
      ? `${cap.acCars} ${cap.acCars === 1 ? 'carro' : 'carros'} em 7 kW (${hoursLabel(cap.acHours)}) e ${cap.dcCars} em 40 kW (${hoursLabel(cap.dcHours)})`
      : `${s.cars} ${s.cars === 1 ? 'carro' : 'carros'} em ${s.charger === 'lento' ? '7' : '80'} kW (${hoursLabel(cap.requiredHours)})`

  return (
    <SimSection index={2} title="Movimento e recarga" subtitle="Quantos carros recarregam por dia e quanta energia cada um leva.">
      <div className={styles.group}>
        <div className={styles.groupHead}>
          <span className={styles.label}>Carros por dia</span>
          <span className={styles.bigValue}>
            {s.cars}
            <small>{s.cars === 1 ? 'carro' : 'carros'}</small>
          </span>
        </div>
        <Slider value={Math.min(s.cars, max)} min={1} max={max} onChange={(cars) => setSim({ cars })} label="Carros por dia" valueText={`${s.cars} carros por dia`} />
        <div className={styles.scale}>
          <span>1 carro</span>
          <span className={styles.scaleLimit}>{max} carros · limite estimado</span>
        </div>
      </div>

      <div className={styles.row2}>
        <div className={styles.group}>
          <span className={styles.label}>Dias de operação</span>
          <div className={styles.controlBox}>
            <span className={styles.hint}>dias por mês</span>
            <QuantityStepper value={s.days} min={1} max={31} onChange={(days) => setSim({ days })} label="Dias de operação por mês" />
          </div>
        </div>
        <NumInput label="RECARGA MÉDIA POR CARRO" value={s.kwh} decimals={1} suffix="kWh" min={0.1} max={500} onChange={(kwh) => setSim({ kwh })} helper="Energia vendida em cada sessão" />
      </div>

      <div className={styles.group}>
        <span className={styles.label}>Baterias de referência</span>
        <div className={styles.chips}>
          {BATERIAS.map((b) => (
            <a key={b.nome} className={styles.chip} href={b.href} target="_blank" rel="noreferrer" title={b.fonte}>
              {b.nome} <b>{num(b.kwh, 2)} kWh</b>
              <Icon src={ICONS.arrowRight} size={12} className={styles.chipIcon} />
            </a>
          ))}
        </div>
      </div>

      <div className={styles.meter}>
        <div className={styles.meterHead}>
          <span className={styles.label}>Capacidade da operação</span>
          <span className={styles.meterValue}>{pct(cap.utilization * 100)}</span>
        </div>
        <div className={styles.meterTrack} role="meter" aria-label="Capacidade usada" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(cap.utilization * 100)}>
          <span className={cn(styles.meterFill, high && styles.meterHigh)} style={{ width: `${Math.min(100, cap.utilization * 100)}%` }} />
        </div>
        <p className={styles.hint}>
          Por dia: {perConnector}. <b>Limite estimado: {max} carros/dia.</b>
        </p>
        <p className={styles.note}>
          Premissas: {s.powerUse}% da potência nominal e {s.turnoverMinutes} min entre carros.
          {s.charger === 'duo' ? ` Conectores simultâneos; divisão aproximada de ${s.acShare}% em 7 kW.` : ''} Potência efetiva e permanência variam conforme o
          veículo. Capacidade não garante movimento.
        </p>
      </div>
    </SimSection>
  )
}

/* ================= 03 · Preços e participação do ponto ================= */

export function PrecosBlock() {
  const { state, setSim } = useGerador()
  const s = state.simulacao.inputs
  const margem = s.sale - s.cost

  return (
    <SimSection index={3} title="Preços e participação do ponto" subtitle="Quanto custa a energia, por quanto é vendida e a parte do dono do local.">
      <div className={styles.row2}>
        <NumInput label="CUSTO FINAL DA ENERGIA" value={s.cost} suffix="R$/kWh" max={100} onChange={(cost) => setSim({ cost })} />
        <NumInput label="PREÇO DE VENDA" value={s.sale} suffix="R$/kWh" max={100} onChange={(sale) => setSim({ sale })} />
      </div>
      <p className={styles.hint}>Informe o custo final da fatura, com tributos da energia. Demanda fixa entra nas despesas mensais.</p>
      <span className={cn(styles.margin, margem < 0 && styles.marginNegative)}>
        Margem bruta: R$ {fixed(margem)} por kWh vendido
      </span>

      <div className={styles.infoRow}>
        <div className={styles.infoText}>
          <span className={styles.infoTitle}>Administração iGreen</span>
          <span className={styles.hint}>Inclui plataforma, atendimento e taxas de cartão.</span>
        </div>
        <span className={styles.infoValue}>{pct(TERMS.administration * 100, 0)}</span>
      </div>

      <div className={styles.group}>
        <div className={styles.groupHead}>
          <span className={styles.label}>Participação do dono do ponto</span>
          <span className={styles.bigValue}>{pct(s.share, 0)}</span>
        </div>
        <Slider value={s.share} min={0} max={20} onChange={(share) => setSim({ share })} label="Participação do dono do ponto" valueText={`${s.share}% do lucro líquido`} />
        <div className={styles.scale}>
          <span>0%</span>
          <span className={styles.scaleLimit}>20% · limite do ponto</span>
        </div>
        <p className={styles.hint}>
          Até 20% do lucro líquido positivo, após impostos. As comissões do licenciado ficam fora dessa base.
        </p>
      </div>
    </SimSection>
  )
}

/* ================= 04 · Carteira iGreen ================= */

const CONEXOES = [
  { key: 'energyEnabled' as const, nome: 'Energia', valor: TERMS.energyBill * TERMS.energyCommission, detalhe: `${TERMS.energyCommission * 100}% de ${money(TERMS.energyBill)}`, unidade: '/mês' },
  { key: 'insuranceEnabled' as const, nome: 'Seguros', valor: TERMS.insuranceBill * TERMS.insuranceCommission, detalhe: `${TERMS.insuranceCommission * 100}% de ${money(TERMS.insuranceBill)}`, unidade: '/mês' },
  { key: 'telecomEnabled' as const, nome: 'Telecom', valor: TERMS.telecomCommission, detalhe: 'por linha', unidade: '/mês' },
]

export function CarteiraBlock() {
  const { state, setSim } = useGerador()
  const s = state.simulacao.inputs
  const rec = recurrenceProjection(s)
  const [ano1, ano5, ano10] = rec.periods

  return (
    <SimSection
      index={4}
      title="Carteira iGreen"
      subtitle="Clientes de energia, seguros e telecom conectados pelo seu ponto geram comissões todo mês."
    >
      <div className={styles.group}>
        <div className={styles.groupHead}>
          <span className={styles.label}>Novos clientes por mês</span>
          <QuantityStepper value={s.monthlyClients} min={0} max={500} onChange={(monthlyClients) => setSim({ monthlyClients })} label="Novos clientes por mês" />
        </div>
        <Slider value={s.monthlyClients} min={0} max={500} onChange={(monthlyClients) => setSim({ monthlyClients })} label="Novos clientes por mês" valueText={`${s.monthlyClients} clientes por mês`} />
        <div className={styles.scale}>
          <span>0</span>
          <span>500</span>
        </div>
      </div>

      <div className={styles.group}>
        <span className={styles.label}>Escolha as conexões</span>
        <div className={styles.toggles}>
          {CONEXOES.map((c) => {
            const on = s[c.key]
            return (
              <button key={c.key} type="button" role="checkbox" aria-checked={on} className={cn(styles.toggle, on && styles.toggleOn)} onClick={() => setSim({ [c.key]: !on })}>
                <span className={styles.toggleHead}>
                  <span className={styles.toggleName}>{c.nome}</span>
                  <span className={cn(styles.check, on && styles.checkOn)} aria-hidden>
                    {on ? <Icon src={ICONS.checkBold} size={9} color="#fff" /> : null}
                  </span>
                </span>
                <span className={styles.toggleValue}>
                  {moneyCents(c.valor)}
                  {c.unidade}
                </span>
                <span className={styles.hint}>{c.detalhe}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className={styles.group}>
        <span className={styles.label}>Recorrência mensal</span>
        <div className={styles.strip}>
          <div className={cn(styles.stripItem, styles.stripFirst)}>
            <span className={styles.stripLabel}>No primeiro mês</span>
            <span className={styles.stripValue}>
              {moneyCents(rec.firstMonth)}
              <small> /mês</small>
            </span>
          </div>
          {[
            { label: 'Ao fim de 1 ano', p: ano1 },
            { label: 'Ao fim de 5 anos', p: ano5 },
            { label: 'Ao fim de 10 anos', p: ano10 },
          ].map(({ label, p }) => (
            <div key={label} className={styles.stripItem}>
              <span className={styles.stripLabel}>{label}</span>
              <span className={styles.stripValue}>
                {moneyCents(p.monthly)}
                <small> /mês</small>
              </span>
              <span className={styles.stripAcc}>Acumulado: {moneyCents(p.accumulated)}</span>
            </div>
          ))}
        </div>
        <p className={styles.hint}>
          {s.monthlyClients} clientes/mês · {moneyCents(rec.perClient)}/mês por cliente nas soluções selecionadas. Incluída no resultado do investidor.
        </p>
      </div>
    </SimSection>
  )
}
