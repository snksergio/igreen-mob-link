/**
 * Ícone dos modelos Mob: um velocímetro. As três marcas dividem o mostrador em lento, médio e rápido;
 * o arco acende até o ponteiro (1 = Mob, carga lenta; 2 = Mob Fast; 3 = Mob Ultra Fast, quase no fim).
 * Geometria: centro (12, 14.5), raio 8, mostrador de 210° a -30°.
 */
const MOSTRADOR = 'M5.07 18.5A8 8 0 1 1 18.93 18.5'
const NIVEIS = {
  1: { arco: 'M5.07 18.5A8 8 0 0 1 5.07 10.5', ponteiro: 'M12 14.5L7.5 11.9' },
  2: { arco: 'M5.07 18.5A8 8 0 0 1 12 6.5', ponteiro: 'M12 14.5L12 9.3' },
  3: { arco: 'M5.07 18.5A8 8 0 1 1 19.88 13.11', ponteiro: 'M12 14.5L17.12 13.6' },
} as const
/** marcas de lento | médio | rápido, por fora do mostrador */
const MARCAS = ['M3.51 9.6L2.21 8.85', 'M12 4.7L12 3.2', 'M20.49 9.6L21.79 8.85']

export function IconePotencia({ nivel, size = 18 }: { nivel: 1 | 2 | 3; size?: number }) {
  const n = NIVEIS[nivel]
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden>
      <path d={MOSTRADOR} strokeWidth="2.2" opacity={0.3} />
      <path d={n.arco} strokeWidth="2.2" />
      {MARCAS.map((d) => (
        <path key={d} d={d} strokeWidth="1.6" opacity={0.75} />
      ))}
      <path d={n.ponteiro} strokeWidth="2" />
      <circle cx="12" cy="14.5" r="1.7" fill="currentColor" stroke="none" />
    </svg>
  )
}
