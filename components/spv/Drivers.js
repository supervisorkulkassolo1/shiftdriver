import { useEffect, useState, useRef } from 'react'
import { getDrivers, getOutlets, addDriver, deleteDriver, toggleDriverActive, updateDriver, importDriversFromCSV, parseCSV } from '../../lib/db'
import { showToast } from '../../lib/toast'
import { downloadTemplate } from '../../lib/csvTemplates'

export default function SpvDrivers() {
  const [drivers, setDrivers] = useState([])
  const [outlets, setOutlets] = useState([])
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [form, setForm] = useState({ name: '', nip: '', outletId: '', whatsapp: '' })
  const [loading, setLoading] = useState(false)
  const [importOutlet, setImportOutlet] = useState('')
  const [importPreview, setImportPreview] = useState([])
  const [importError, setImportError] = useState('')
  const fileRef = useRef()

  useEffect(() => { load() }, [])

  async function load() {
    const [d, o] = await Promise.all([getDrivers(), getOutlets()])
    setDrivers(d)
    setOutlets(o)
    if (o.length) {
      if (!form.outletId) setForm(f => ({ ...f, outletId: o[0].id }))
      if (!importOutlet) setImportOutlet(o[0].id)
    }
  }

  async function handleAdd() {
    if (!form.name.trim() || !form.outletId) { showToast('Isi nama dan pilih outlet', 'error'); return }
    setLoading(true)
    try {
      const code = await addDriver(form)
      showToast(`Driver ${form.name} ditambahkan. Kode: ${code}`, 'success')
      setForm({ name: '', nip: '', outletId: outlets[0]?.id || '', whatsapp: '' })
      setShowForm(false)
      await load()
    } catch { showToast('Gagal menambahkan driver', 'error') }
    finally { setLoading(false) }
  }

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const rows = parseCSV(ev.target.result)
        const required = ['name']
        const missing = required.filter(k => !Object.keys(rows[0] || {}).includes(k))
        if (missing.length) { setImportError(`Kolom wajib tidak ditemukan: ${missing.join(', ')}`); setImportPreview([]); return }
        setImportPreview(rows)
        setImportError('')
      } catch { setImportError('File tidak valid. Pastikan format CSV benar.') }
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    if (!importPreview.length) { showToast('Upload file CSV dulu', 'error'); return }
    if (!importOutlet) { showToast('Pilih outlet dulu', 'error'); return }
    setLoading(true)
    try {
      const results = await importDriversFromCSV(importPreview, importOutlet)
      showToast(`${results.length} driver berhasil diimport`, 'success')
      setImportPreview([])
      setShowImport(false)
      if (fileRef.current) fileRef.current.value = ''
      await load()
    } catch (err) { showToast('Gagal import: ' + err.message, 'error') }
    finally { setLoading(false) }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Hapus driver ${name}?`)) return
    try { await deleteDriver(id); await load(); showToast('Driver dihapus', 'success') }
    catch { showToast('Gagal menghapus', 'error') }
  }

  async function handleToggle(id, active) {
    try { await toggleDriverActive(id, !active); await load(); showToast(`Driver ${!active ? 'diaktifkan' : 'dinonaktifkan'}`, 'success') }
    catch { showToast('Gagal mengubah status', 'error') }
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
        <div className="card-title" style={{ marginBottom: 10 }}>Filter Outlet</div>
        <div className="day-row">
          <div className={`day-chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Semua</div>
          {outlets.map(o => (
            <div key={o.id} className={`day-chip ${filter === o.id ? 'active' : ''}`} onClick={() => setFilter(o.id)}>{o.name}</div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { setShowForm(!showForm); setShowImport(false) }}>
            {showForm ? 'Batal' : '+ Tambah Driver'}
          </button>
          <button className="btn" style={{ flex: 1 }} onClick={() => { setShowImport(!showImport); setShowForm(false) }}>
            {showImport ? 'Batal' : '📥 Import CSV'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>Driver Baru</div>
          <div className="field">
            <label className="label">Nama Lengkap *</label>
            <input className="input" placeholder="Nama driver" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="field">
            <label className="label">NIP</label>
            <input className="input" placeholder="Nomor Induk Pegawai" value={form.nip} onChange={e => setForm(f => ({ ...f, nip: e.target.value }))} />
          </div>
          <div className="field">
            <label className="label">Nomor WhatsApp</label>
            <input className="input" placeholder="628xxxxxxxxx" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} type="tel" />
          </div>
          <div className="field">
            <label className="label">Outlet *</label>
            <select className="select" value={form.outletId} onChange={e => setForm(f => ({ ...f, outletId: e.target.value }))}>
              {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleAdd} disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</button>
            <button className="btn" style={{ flex: 1 }} onClick={() => setShowForm(false)}>Batal</button>
          </div>
        </div>
      )}

      {showImport && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 4 }}>Import Driver dari CSV</div>
          <div className="card-sub" style={{ marginBottom: 12 }}>Format kolom: <strong>name, nip, whatsapp</strong></div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '9px 11px', background: 'var(--blue-light)', border: '1px solid #B5D4F4', borderRadius: 7 }}>
            <span style={{ fontSize: 11, color: 'var(--blue-dark)' }}>Format: <strong>name, nip, whatsapp</strong><br />Kolom wajib: name</span>
            <button className="btn btn-sm" style={{ flexShrink: 0, marginLeft: 10 }} onClick={() => downloadTemplate('driver')}>
              ⬇️ Template
            </button>
          </div>

          <div className="field">
            <label className="label">Outlet tujuan</label>
            <select className="select" value={importOutlet} onChange={e => setImportOutlet(e.target.value)}>
              {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label">Upload file CSV</label>
            <input ref={fileRef} type="file" accept=".csv" className="input" style={{ padding: 6 }} onChange={handleFileChange} />
          </div>

          {importError && <div className="alert alert-red" style={{ marginBottom: 10 }}>❌ {importError}</div>}

          {importPreview.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, color: 'var(--text-2)' }}>Preview ({importPreview.length} driver):</div>
              {importPreview.slice(0, 5).map((r, i) => (
                <div key={i} className="row-item">
                  <div>
                    <div className="row-title">{r.name}</div>
                    <div className="row-sub">NIP: {r.nip || '-'} · WA: {r.whatsapp || '-'}</div>
                  </div>
                  <span className="badge badge-blue">Baru</span>
                </div>
              ))}
              {importPreview.length > 5 && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 6 }}>...dan {importPreview.length - 5} driver lainnya</div>}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleImport} disabled={loading || !importPreview.length}>
              {loading ? 'Mengimport...' : `Import ${importPreview.length} Driver`}
            </button>
            <button className="btn" style={{ flex: 1 }} onClick={() => { setShowImport(false); setImportPreview([]) }}>Batal</button>
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
                {d.nip && <div className="row-sub">NIP: {d.nip}</div>}
                {d.whatsapp && <div className="row-sub">WA: {d.whatsapp}</div>}
              </div>
              <span className={`badge ${d.active ? 'badge-green' : 'badge-red'}`}>{d.active ? 'Aktif' : 'Nonaktif'}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {d.whatsapp && <button className="btn btn-sm btn-success" onClick={() => sendWA(d)}>📲 WA</button>}
              <button className="btn btn-sm" onClick={() => handleToggle(d.id, d.active)}>{d.active ? '🔴 Nonaktifkan' : '🟢 Aktifkan'}</button>
              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(d.id, d.name)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
