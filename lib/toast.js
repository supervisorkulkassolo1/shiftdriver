export function showToast(msg, type = 'info') {
  if (typeof window === 'undefined') return
  const wrap = document.getElementById('toast-wrap')
  if (!wrap) return
  const el = document.createElement('div')
  el.className = `toast toast-${type}`
  el.textContent = msg
  wrap.appendChild(el)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.add('show'))
  })
  setTimeout(() => {
    el.classList.remove('show')
    setTimeout(() => el.remove(), 300)
  }, 2800)
}
