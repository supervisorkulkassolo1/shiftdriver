import '../styles/globals.css'
import { createContext, useContext, useState, useEffect } from 'react'
import { getSession, saveSession, clearSession } from '../lib/auth'

const SessionCtx = createContext(null)
export const useSession = () => useContext(SessionCtx)

export default function App({ Component, pageProps }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const s = getSession()
    if (s) setUser(s)
    setReady(true)
  }, [])

  function login(userData) {
    saveSession(userData)
    setUser(userData)
  }

  function logout() {
    clearSession()
    setUser(null)
  }

  if (!ready) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9b9b96', fontSize: 14 }}>
      Memuat...
    </div>
  )

  return (
    <SessionCtx.Provider value={{ user, login, logout }}>
      <div className="app">
        <Component {...pageProps} />
        <div className="toast-wrap" id="toast-wrap" />
      </div>
    </SessionCtx.Provider>
  )
}
