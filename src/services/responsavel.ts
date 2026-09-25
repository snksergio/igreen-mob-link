/**
 * Responsável (consultor/licenciado) que está fazendo o cadastro.
 * Vem pelo link compartilhado: ?responsavel=Nome%20Sobrenome (fica salvo na sessão).
 * MOCK: sem o parâmetro, usa um nome de exemplo — trocar pelo dado do backend.
 */
const KEY = 'igreen-mob-responsavel'
const RESPONSAVEL_MOCK = 'Juliana Martins'

export function getResponsavel() {
  let nome = RESPONSAVEL_MOCK
  try {
    const param = new URLSearchParams(window.location.search).get('responsavel')?.trim()
    if (param) sessionStorage.setItem(KEY, param)
    nome = param || sessionStorage.getItem(KEY) || RESPONSAVEL_MOCK
  } catch {
    /* sessionStorage indisponível */
  }
  const iniciais = nome
    .split(/\s+/)
    .filter(Boolean)
    .filter((_, i, all) => i === 0 || i === all.length - 1)
    .map((p) => p[0]?.toUpperCase())
    .join('')
  return { nome, iniciais }
}
