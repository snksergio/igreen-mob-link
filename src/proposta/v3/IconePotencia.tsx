/**
 * Ícone dos modelos Mob: um velocímetro simples, de traço grosso para ler em tamanho pequeno.
 * Três faixas (lento, médio e rápido) acesas até o nível do modelo e o ponteiro apontando para ela:
 * 1 = Mob (carga lenta), 2 = Mob Fast, 3 = Mob Ultra Fast. Centro (12, 15), raio 8, faixas de 200° a -20°.
 */
const FAIXAS = ['M4.48 17.74A8 8 0 0 1 5.45 10.41', 'M7.41 8.45A8 8 0 0 1 16.59 8.45', 'M18.55 10.41A8 8 0 0 1 19.52 17.74']
const PONTEIRO = { 1: 'M12 15L7.45 14.36', 2: 'M12 15L12 10.4', 3: 'M12 15L16.55 14.36' } as const

export function IconePotencia({ nivel, size = 18 }: { nivel: 1 | 2 | 3; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden>
      {FAIXAS.map((d, i) => (
        <path key={d} d={d} strokeWidth="3.6" opacity={i < nivel ? 1 : 0.3} />
      ))}
      <path d={PONTEIRO[nivel]} strokeWidth="3" />
      <circle cx="12" cy="15" r="2.4" fill="currentColor" stroke="none" />
    </svg>
  )
}
