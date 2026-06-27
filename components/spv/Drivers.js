import { useEffect, useState } from 'react'
import { getDrivers, getOutlets, addDriver, deleteDriver, toggleDriverActive, updateDriver } from '../../lib/db'
import { showToast } from '../../lib/toast'

export default function SpvDrivers() {
  const [drivers, setDrivers] = useState([])
  const [outlets, setOutlets] = useState([])
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', outletId: '', whatsapp: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const [d, o] = await Promise.all([getDrivers(), getOutlets()])
    setDrivers(d)
    setOutlets(o)
    if (o.length && !form.outletId) setForm(f => ({ ...f, outletId: o[0].id }))
  }

  async function handleAdd() {
    if (!form.name.trim() || !form.outletId) { showToast('Isi semua data', 'error'); return }
    setLoading(true)
    try {
      const code = await addDriver(form)
      showToast(`Driver ${form.name} ditambahkan. Kode: ${code}`, 'success')
      setForm({ name: '', outletId: outlets[0]?.id || '', whatsapp: '' })
      setShowForm(false)
      await load()
    } catch { showToast('Gagal menambahkan driver', 'error') }
    finally { setLoading(false) }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Hapus driver ${name}? Aksi ini tidak dapat dibatalkan.`)) return
    try { await deleteDriver(id); await load(); showToast('Driver dihapus', 'success') }
    catch { showToast('Gagal menghapus', 'error') }
  }

  async function handleToggle(id, active) {
    try {
      await toggleDriverActive(id, !active)
      await load()
      showToast(`Driver ${!active ? 'diaktifkan' : 'dinonaktifkan'}`, 'success')
    } catch { showToast('Gagal mengubah status', 'error') }
  }

  function sendWA(driver) {
    const wa = driver.whatsapp.replace(/\D/g, '')
    const msg = encodeURIComponent(`Halo ${driver.name}, mohon segera isi jadwal shift minggu ini di platform ShiftDriver. Terima kasih!`)
    window.open(`https://wa.me/${wa}?text=${msg}`, '_blank')
  }

  const outletName = id => outlets.find(o => o.id === id)?.name || '-'
  const filtered = filter === 'all' ? drivers : drivers.filter(d => d.outletId === filter)

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div className="card-title">Filter Outlet</div>
        </div>
        <div className="day-row">
          <div className={`day-chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Semua</div>
          {outlets.map(o => (
            <div key={o.id} className={`day-chip ${filter === o.id ? 'active' : ''}`} onClick={() => setFilter(o.id)}>{o.name}</div>
          ))}
        </div>
        <button className="btn btn-primary btn-block" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Batal' : '+ Tambah Driver'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>Driver Baru</div>
          <div className="field">
            <label className="label">Nama Lengkap</label>
            <input className="input" placeholder="Nama driver" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="field">
            <label className="label">Nomor WhatsApp</label>
            <input className="input" placeholder="628xxxxxxxxx" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} type="tel" />
          </div>
          <div className="field">
            <label className="label">Outlet</label>
            <select className="select" value={form.outletId} onChange={e => setForm(f => ({ ...f, outletId: e.target.value }))}>
              {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleAdd} disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button className="btn" style={{ flex: 1 }} onClick={() => setShowForm(false)}>Batal</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title" style={{ marginBottom: 12 }}>Driver ({filtered.length})</div>
        {filtered.length === 0 && <div className="empty-state"><div className="empty-icon">👥</div>Tidak ada driver</div>}
        {filtered.map(d => (
          <div key={d.id} style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="row-title">{d.name}</div>
                <div className="row-sub">Kode: <strong>{d.code}</strong> · {outletName(d.outletId)}</div>
                {d.whatsapp && <div className="row-sub">WA: {d.whatsapp}</div>}
              </div>
              <span className={`badge ${d.active ? 'badge-green' : 'badge-red'}`}>{d.active ? 'Aktif' : 'Nonaktif'}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {d.whatsapp && (
                <button className="btn btn-sm btn-success" onClick={() => sendWA(d)}>📲 Notif WA</button>
              )}
              <button className="btn btn-sm" onClick={() => handleToggle(d.id, d.active)}>
                {d.active ? '🔴 Nonaktifkan' : '🟢 Aktifkan'}
              </button>
              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(d.id, d.name)}>🗑️ Hapus</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
