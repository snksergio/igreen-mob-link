import { ICONS } from '../../assets'
import { Icon } from '../../components/ui/Icon'
import { cn } from '../../lib/cn'
import type { CommissionMode, LocalMode } from '../model'
import { useGerador } from '../state'
import { NumInput } from './NumInput'
import styles from './Sim.module.css'

const LOCAL: { value: LocalMode; titulo: string; texto: string }[] = [
  { value: 'unset', titulo: 'A definir', texto: 'Prévia sem tributo local adicional.' },
  { value: 'provision', titulo: 'Provisionar carga líquida sobre a receita', texto: 'Informe a provisão efetiva abaixo.' },
  { value: 'included', titulo: 'Regime validado · encargo incluído no custo/kWh', texto: 'Toda a carga da operação já está no custo informado.' },
]

const COMISSOES: { value: CommissionMode; titulo: string; texto: string }[] = [
  { value: 'unset', titulo: 'A definir', texto: 'Mostrar comissões antes de tributos.' },
  { value: 'rate', titulo: 'Informar provisão efetiva sobre comissões', texto: 'Desconta a provisão do recebimento.' },
]

function Options<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; titulo: string; texto: string }[]; onChange: (v: T) => void }) {
  return (
    <div className={styles.group}>
      <span className={styles.label}>{label}</span>
      <div className={styles.options} role="radiogroup" aria-label={label}>
        {options.map((o) => {
          const on = o.value === value
          return (
            <button key={o.value} type="button" role="radio" aria-checked={on} className={cn(styles.option, on && styles.optionOn)} onClick={() => onChange(o.value)}>
              <span className={styles.optionDot} aria-hidden />
              <span className={styles.optionText}>
                <span className={styles.optionTitle}>{o.titulo}</span>
                <span className={styles.optionHint}>{o.texto}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** 05 · Avançado: todas as premissas fiscais da referência, recolhidas por padrão */
export function AdvancedTaxes() {
  const { state, setSim } = useGerador()
  const s = state.simulacao.inputs

  return (
    <details className={cn(styles.section, styles.advanced)}>
      <summary className={styles.advancedSummary}>
        <span className={styles.sectionIndex} aria-hidden>
          05
        </span>
        <span className={styles.sectionText}>
          <span className={cn('t-section-title', styles.sectionTitle)}>Avançado · Tributos</span>
          <span className={cn('t-body-md-medium', styles.sectionSubtitle)}>Lucro Real · base 2026. Ajuste só se tiver os valores validados.</span>
        </span>
        <Icon src={ICONS.chevronDown} size={18} className={styles.advancedChevron} />
      </summary>

      <div className={styles.advancedBody}>
        <p className={styles.hint}>
          Prévia gerencial. As alíquotas, os créditos e a escrituração de cada SCP precisam ser confirmados pela contabilidade.
        </p>
        <div className={styles.taxChips}>
          <span className={styles.taxChip}>
            IRPJ <b>15%</b>
          </span>
          <span className={styles.taxChip}>
            Adicional <b>10%</b>¹
          </span>
          <span className={styles.taxChip}>
            CSLL <b>9%</b>
          </span>
        </div>
        <p className={styles.note}>¹ Sobre o lucro tributável que superar R$ 20 mil/mês, usado aqui como provisão mensal de uma operação constante.</p>

        <div className={styles.row2}>
          <NumInput label="PIS SOBRE A BASE FISCAL" value={s.pisRate} suffix="%" max={100} onChange={(pisRate) => setSim({ pisRate })} />
          <NumInput label="COFINS SOBRE A BASE FISCAL" value={s.cofinsRate} suffix="%" max={100} onChange={(cofinsRate) => setSim({ cofinsRate })} />
          <NumInput label="CRÉDITOS PIS/COFINS POR MÊS" value={s.taxCredit} suffix="R$" max={1e7} onChange={(taxCredit) => setSim({ taxCredit })} />
          <NumInput label="EXCLUSÕES DA BASE PIS/COFINS" value={s.pisExclusion} suffix="R$" max={1e7} onChange={(pisExclusion) => setSim({ pisExclusion })} />
        </div>
        <p className={styles.note}>
          Informe apenas valores validados, incluindo exclusões cabíveis de ICMS. Créditos limitados ao débito do mês; saldo credor não projetado.
        </p>

        <Options label="Tributação local da recarga" value={s.localMode} options={LOCAL} onChange={(localMode) => setSim({ localMode })} />
        {s.localMode === 'provision' ? (
          <NumInput label="PROVISÃO EFETIVA LÍQUIDA LOCAL" value={s.localRate} suffix="%" max={100} onChange={(localRate) => setSim({ localRate })} />
        ) : null}
        <p className={styles.note}>
          ICMS depende da UF e do regime. A opção “incluído” exige confirmar que toda a carga da operação está no custo informado. Não significa isenção.
        </p>

        <NumInput
          label="ADIÇÕES FISCAIS LÍQUIDAS / MÊS"
          value={s.taxAdditions}
          suffix="R$"
          max={1e7}
          onChange={(taxAdditions) => setSim({ taxAdditions })}
          helper="O modelo usa a mesma adição para IRPJ e CSLL, sem compensar prejuízos anteriores."
        />

        <Options label="Tributação das comissões do licenciado" value={s.commissionMode} options={COMISSOES} onChange={(commissionMode) => setSim({ commissionMode })} />
        {s.commissionMode === 'rate' ? (
          <NumInput label="PROVISÃO SOBRE AS COMISSÕES" value={s.commissionRate} suffix="%" max={100} onChange={(commissionRate) => setSim({ commissionRate })} />
        ) : null}
        <p className={styles.note}>
          A projeção mantém as premissas fiscais de 2026 por 36 meses; não prevê a transição futura para CBS/IBS. Distribuições são mostradas antes de eventual IR do
          investidor.
        </p>
      </div>
    </details>
  )
}
