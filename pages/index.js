import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from './_app'
import { loginSPV, loginDriver } from '../lib/db'
import { showToast } from '../lib/toast'

export default function Home() {
  const { user, login } = useSession()
  const router = useRouter()
  const [mode, setMode] = useState('driver') // 'driver' | 'spv'
  const [code, setCode] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user?.role === 'spv') router.replace('/spv')
    else if (user?.role === 'driver') router.replace('/driver')
  }, [user])

  async function handleDriverLogin(e) {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    try {
      const result = await loginDriver(code)
      if (!result) { showToast('Kode tidak ditemukan', 'error'); return }
      if (result.blocked) { showToast('Akunmu dinonaktifkan. Hubungi SPV.', 'error'); return }
      login(result)
      router.push('/driver')
    } catch (err) {
      showToast('Terjadi kesalahan. Coba lagi.', 'error')
    } finally { setLoading(false) }
  }

  async function handleSPVLogin(e) {
    e.preventDefault()
    if (!username.trim() || !password.trim()) return
    setLoading(true)
    try {
      const result = await loginSPV(username, password)
      if (!result) { showToast('Username atau password salah', 'error'); return }
      login(result)
      router.push('/spv')
    } catch (err) {
      showToast('Terjadi kesalahan. Coba lagi.', 'error')
    } finally { setLoading(false) }
  }

  return (
    <div className="login-page">
      <div className="login-logo">🚗</div>
      <div className="login-title">ShiftDriver</div>
      <div className="login-sub">Platform Jadwal Shift Driver</div>

      <div className="login-card">
        <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
          <button className={`btn btn-block ${mode === 'driver' ? 'btn-primary' : ''}`} onClick={() => setMode('driver')}>Driver</button>
          <button className={`btn btn-block ${mode === 'spv' ? 'btn-primary' : ''}`} onClick={() => setMode('spv')}>Supervisor</button>
        </div>

        {mode === 'driver' ? (
          <form onSubmit={handleDriverLogin}>
            <div className="field">
              <label className="label">Kode Unik Driver</label>
              <input className="input" placeholder="Contoh: DRV001" value={code} onChange={e => setCode(e.target.value)} autoCapitalize="characters" />
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
              {loading ? 'Memuat...' : 'Masuk sebagai Driver'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSPVLogin}>
            <div className="field">
              <label className="label">Username</label>
              <input className="input" placeholder="Username SPV" value={username} onChange={e => setUsername(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
              {loading ? 'Memuat...' : 'Masuk sebagai SPV'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
