import { ICONS } from '../../assets'
import { CARREGADORES, PERCENTUAL_FATURAMENTO_LIQUIDO, specsLabel, type Carregador, type TipoCarregador } from '../../data/investment'
import { cn } from '../../lib/cn'
import { money } from '../../lib/format'
import { FancyIcon } from '../ui/Controls'
import { Icon } from '../ui/Icon'
import styles from './CategorySelect.module.css'

const TYPE_ICON = {
  energyCircle: ICONS.energyCircle,
  eletric: ICONS.eletric,
  energyLink: ICONS.energyLink,
} as const

type CategorySelectProps = {
  value: TipoCarregador
  /** Lista recolhida: só a categoria escolhida fica visível, com o botão para trocar */
  collapsed: boolean
  error?: string | false | null
  onSelect: (tipo: TipoCarregador) => void
  onEdit: () => void
}

/**
 * AccordionSelect do Design System (node 2532:7496) aplicado aos modelos de carregador.
 * Aberta: nenhuma opção vem marcada. Escolhida: as outras recolhem e a escolhida fica em destaque.
 */
export function CategorySelect({ value, collapsed, error, onSelect, onEdit }: CategorySelectProps) {
  return (
    <div
      className={cn(styles.list, collapsed && styles.collapsed, error && styles.error)}
      role="radiogroup"
      aria-label="Categoria de investimento"
      data-invalid={error ? 'true' : undefined}
      tabIndex={error ? -1 : undefined}
    >
      {CARREGADORES.map((c, index) => {
        const selected = collapsed && c.tipo === value
        const hidden = collapsed && !selected
        return (
          <div key={c.tipo} className={cn(styles.rowWrap, hidden && styles.rowHidden)} aria-hidden={hidden || undefined}>
            <div className={styles.rowInner}>
              {selected ? (
                <div className={cn(styles.row, styles.rowSelected)} role="radio" aria-checked="true" onClick={onEdit}>
                  <Content c={c} />
                  <button
                    type="button"
                    className={styles.editButton}
                    aria-label={`Trocar modelo (${c.nome} selecionado)`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit()
                    }}
                  >
                    <Icon src={ICONS.lineEdit} size={18} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  role="radio"
                  aria-checked="false"
                  tabIndex={hidden ? -1 : 0}
                  className={cn(styles.row, index > 0 && styles.divider)}
                  onClick={() => onSelect(c.tipo)}
                >
                  <Content c={c} />
                  <Icon src={ICONS.circleArrowRight} size={18} className={styles.arrow} />
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Content({ c }: { c: Carregador }) {
  return (
    <>
      <FancyIcon src={TYPE_ICON[c.icon]} bg="var(--bg-primary)" />
      <span className={styles.text}>
        <span className={cn('t-body-md-semibold', styles.title)}>{c.nome}</span>
        <span className={styles.caption}>{specsLabel(c)}</span>
        <span className={styles.caption}>{PERCENTUAL_FATURAMENTO_LIQUIDO}% do faturamento líquido</span>
      </span>
      <span className={styles.price}>
        <span className={cn('t-body-lg-semibold', styles.priceValue)}>{money(c.preco)}</span>
        <span className={styles.caption}>por carregador</span>
      </span>
    </>
  )
}
