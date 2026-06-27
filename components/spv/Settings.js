import { useState } from 'react'
import { updateSPVPassword } from '../../lib/db'
import { showToast } from '../../lib/toast'
import { useSession } from '../../pages/_app'

export default function SpvSettings({ user }) {
  const { login } = useSession()
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirm: '' })
  const [loading, setLoading] = useState(false)

  async function handleChange() {
    if (!form.oldPassword || !form.newPassword) { showToast('Isi semua field', 'error'); return }
    if (form.newPassword !== form.confirm) { showToast('Konfirmasi password tidak cocok', 'error'); return }
    if (form.newPassword.length < 6) { showToast('Password minimal 6 karakter', 'error'); return }
    setLoading(true)
    try {
      const result = await updateSPVPassword(user.id, form.oldPassword, form.newPassword)
      if (!result.ok) { showToast(result.error, 'error'); return }
      showToast('Password berhasil diubah', 'success')
      setForm({ oldPassword: '', newPassword: '', confirm: '' })
    } catch { showToast('Gagal mengubah password', 'error') }
    finally { setLoading(false) }
  }

  return (
    <>
      <div className="card">
        <div className="card-title" style={{ marginBottom: 4 }}>Info Akun</div>
        <div className="card-sub" style={{ marginBottom: 12 }}>Username: <strong>{user.username}</strong></div>
        <div className="alert alert-blue">🔐 Ganti password secara berkala untuk keamanan akun.</div>
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: 12 }}>Ganti Password</div>
        <div className="field">
          <label className="label">Password Lama</label>
          <input className="input" type="password" placeholder="Password saat ini" value={form.oldPassword} onChange={e => setForm(f => ({ ...f, oldPassword: e.target.value }))} />
        </div>
        <div className="field">
          <label className="label">Password Baru</label>
          <input className="input" type="password" placeholder="Minimal 6 karakter" value={form.newPassword} onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))} />
        </div>
        <div className="field">
          <label className="label">Konfirmasi Password Baru</label>
          <input className="input" type="password" placeholder="Ulangi password baru" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} />
        </div>
        <button className="btn btn-primary btn-block" onClick={handleChange} disabled={loading}>
          {loading ? 'Menyimpan...' : 'Simpan Password'}
        </button>
      </div>
    </>
  )
}
