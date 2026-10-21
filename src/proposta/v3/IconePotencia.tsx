/**
 * Ícone dos modelos Mob: a quantidade de raios diz a velocidade de recarga.
 * 1 raio = Mob (carga lenta), 2 raios = Mob Fast, 3 raios = Mob Ultra Fast.
 * Raios gordinhos e sobrepostos (cada um passa por cima do anterior): um contorno na cor do fundo do selo
 * (`fundo`, verde por padrão) separa um raio do outro, para o grupo ler como um só.
 */
const RAIO = 'M6.5 0H10.8L8.1 5.9H12.4L4.3 16L5.9 9.7H1.2Z'
const ESCALA = 0.9
const PASSO = 6
const LARGURA = 12.4 * ESCALA

export function IconePotencia({ nivel, size = 18, fundo = 'var(--bg-primary)' }: { nivel: 1 | 2 | 3; size?: number; fundo?: string }) {
  const inicio = (24 - (LARGURA + PASSO * (nivel - 1))) / 2
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      {Array.from({ length: nivel }, (_, i) => (
        <g key={i} transform={`translate(${inicio + i * PASSO} 4.8) scale(${ESCALA})`}>
          {/* contorno na cor do fundo: recorta o raio de trás onde este passa por cima */}
          <path d={RAIO} fill="currentColor" stroke={fundo} strokeWidth="3.4" strokeLinejoin="round" paintOrder="stroke" />
          {/* traço fino da mesma cor arredonda as pontas (deixa o raio "gordinho") */}
          <path d={RAIO} fill="currentColor" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        </g>
      ))}
    </svg>
  )
}
