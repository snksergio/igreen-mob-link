/** Rola até o primeiro campo com erro e foca nele (após o React renderizar os erros). */
export function focusFirstError() {
  requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]')
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.focus({ preventScroll: true })
  })
}
