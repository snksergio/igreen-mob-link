/**
 * Ícone dos modelos Mob: a quantidade de raios diz a velocidade de recarga.
 * 1 raio = Mob (carga lenta), 2 raios = Mob Fast, 3 raios = Mob Ultra Fast.
 * Raios cheios e todos do mesmo tamanho, para a quantidade ser o que diferencia (e ler em tamanho pequeno).
 */
const RAIO = 'M6.2 0L0.6 9.1H4.6L3.6 16L9.6 6.6H5.5Z'
const ESCALA = 0.85
/** posição x de cada raio (raio de 8,5 × 13,6 no quadro de 24) */
const POSICOES = { 1: [7.75], 2: [3.5, 12], 3: [0, 7.75, 15.5] } as const

export function IconePotencia({ nivel, size = 18 }: { nivel: 1 | 2 | 3; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      {POSICOES[nivel].map((x) => (
        <path key={x} d={RAIO} transform={`translate(${x} 5.2) scale(${ESCALA})`} />
      ))}
    </svg>
  )
}
