/**
 * Ícone dos modelos Mob: um medidor de potência com o ponteiro no nível do carregador
 * (1 = Mob, carga lenta; 2 = Mob Fast; 3 = Mob Ultra Fast). As faixas até o nível ficam acesas.
 */
const FAIXAS = ['M5.07 18A8 8 0 0 1 6.34 8.34', 'M7.41 7.45A8 8 0 0 1 16.59 7.45', 'M17.66 8.34A8 8 0 0 1 18.93 18']
const PONTEIRO: Record<1 | 2 | 3, [number, number]> = { 1: [6.69, 12.58], 2: [12, 8.5], 3: [17.31, 12.58] }

export function IconePotencia({ nivel, size = 18 }: { nivel: 1 | 2 | 3; size?: number }) {
  const [x, y] = PONTEIRO[nivel]
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
      {FAIXAS.map((d, i) => (
        <path key={d} d={d} opacity={i < nivel ? 1 : 0.35} />
      ))}
      <path d={`M12 14L${x} ${y}`} />
      <circle cx="12" cy="14" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  )
}
