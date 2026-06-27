export function saveSession(user) {
  if (typeof window === 'undefined') return
  localStorage.setItem('shiftdriver_user', JSON.stringify(user))
}

export function getSession() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('shiftdriver_user')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function clearSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('shiftdriver_user')
}
