/**
 * No celular, quando um campo recebe foco (toque ou "Próximo" do teclado), garante que ele fique visível
 * acima do teclado. O navegador nem sempre rola sozinho, principalmente dentro de modais e áreas que abrem/fecham.
 */
export function keepFocusedFieldVisible() {
  if (!window.matchMedia('(pointer: coarse)').matches) return
  let timer = 0
  document.addEventListener('focusin', (event) => {
    const field = event.target
    if (!(field instanceof HTMLElement) || !field.matches('input:not([type=checkbox]):not([type=radio]), textarea, select')) return
    window.clearTimeout(timer)
    // espera o teclado abrir e a área visível encolher
    timer = window.setTimeout(() => {
      const viewport = window.visualViewport
      const top = viewport ? viewport.offsetTop : 0
      const bottom = top + (viewport ? viewport.height : window.innerHeight)
      const rect = field.getBoundingClientRect()
      if (rect.top < top + 16 || rect.bottom > bottom - 16) field.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 300)
  })
}
