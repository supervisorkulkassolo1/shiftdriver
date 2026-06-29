import { useEffect, useState, useRef } from 'react'
import { getOutlets, getShiftTypes, addShiftType, updateShiftType, deleteShiftType, importShiftTypesFromCSV, parseCSV } from '../../lib/db'
import { showToast } from '../../lib/toast'

export default function SpvShifts() {
  const [outlets, setOutlets] = useState([])
  const [selectedOutlet, setSelectedOutlet] = useState('')
  const [shifts, setShifts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ name: '', startTime: '06:00', endTime: '12:00' })
  const [importPreview, setImportPreview] = useState([])
  const [importError, setImportError] = useState('')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()

  useEffect(() => { loadOutlets() }, [])
  useEffect(() => { if (selectedOutlet) loadShifts() }, [selectedOutlet])

  async function loadOutlets() {
    const o = await getOutlets()
    setOutlets(o)
    if (o.length) setSelectedOutlet(o[0].id)
  }

  async function loadShifts() {
    const s = await getShiftTypes(selectedOutlet)
    setShifts(s)
  }

  async function handleSave() {
    if (!form.name.trim()) { showToast('Isi nama shift', 'error'); return }
    try {
      if (editId) {
        await updateShiftType(editId, form)
        showToast('Shift diperbarui', 'success')
      } else {
        await addShiftType(selectedOutlet, form)
        showToast('Shift ditambahkan', 'success')
      }
      setForm({ name: '', startTime: '06:00', endTime: '12:00' })
      setShowForm(false); setEditId(null)
      await loadShifts()
    } catch { showToast('Gagal menyimpan', 'error') }
  }

  function startEdit(s) {
    setEditId(s.id)
    setForm({ name: s.name, startTime: s.startTime, endTime: s.endTime })
    setShowForm(true); setShowImport(false)
  }

  async function handleDelete(id, name) {
    if (!confirm(`Hapus shift "${name}"?`)) return
    try { await deleteShiftType(id); await loadShifts(); showToast('Shift dihapus', 'success') }
    catch { showToast('Gagal menghapus', 'error') }
  }

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const rows = parseCSV(ev.target.result)
        const sample = rows[0] || {}
        const keys = Object.keys(sample)
        const hasRequired = keys.includes('name') && (keys.includes('starttime') || keys.includes('start_time')) && (keys.includes('endtime') || keys.includes('end_time'))
        if (!hasRequired) {
          setImportError('Kolom wajib: name, startTime, endTime')
          setImportPreview([]); return
        }
        const normalized = rows.map(r => ({
          name: r.name,
          startTime: r.starttime || r.start_time || r.startTime,
          endTime: r.endtime || r.end_time || r.endTime,
        }))
        setImportPreview(normalized)
        setImportError('')
      } catch { setImportError('File tidak valid') }
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    if (!importPreview.length) return
    setLoading(true)
    try {
      await importShiftTypesFromCSV(importPreview, selectedOutlet)
      showToast(`${importPreview.length} shift berhasil diimport`, 'success')
      setImportPreview([]); setShowImport(false)
      if (fileRef.current) fileRef.current.value = ''
      await loadShifts()
    } catch (err) { showToast('Gagal: ' + err.message, 'error') }
    finally { setLoading(false) }
  }

  return (
    <>
      <div className="card">
        <div className="card-title" style={{ marginBottom: 10 }}>Pilih Outlet</div>
        <div className="day-row">
          {outlets.map(o => (
            <div key={o.id} className={`day-chip ${selectedOutlet === o.id ? 'active' : ''}`} onClick={() => { setSelectedOutlet(o.id); setShowForm(false); setShowImport(false) }}>{o.name}</div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { setShowForm(!showForm); setShowImport(false); setEditId(null); setForm({ name: '', startTime: '06:00', endTime: '12:00' }) }}>
            {showForm && !editId ? 'Batal' : '+ Tambah Shift'}
          </button>
          <button className="btn" style={{ flex: 1 }} onClick={() => { setShowImport(!showImport); setShowForm(false) }}>
            {showImport ? 'Batal' : '📥 Import CSV'}
          </button>
        </div>
      </div>

      {showImport && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 4 }}>Import Shift dari CSV</div>
          <div className="card-sub" style={{ marginBottom: 12 }}>Format kolom: <strong>name, startTime, endTime</strong></div>
          <div className="alert alert-blue" style={{ marginBottom: 10 }}>
            <span>Contoh:<br />
              <code style={{ fontSize: 10 }}>name,startTime,endTime<br />
              Pagi,06:00,12:00<br />
              Siang,12:00,18:00<br />
              Malam,18:00,00:00</code>
            </span>
          </div>
          <div className="field">
            <label className="label">Upload file CSV</label>
            <input ref={fileRef} type="file" accept=".csv" className="input" style={{ padding: 6 }} onChange={handleFileChange} />
          </div>
          {importError && <div className="alert alert-red" style={{ marginBottom: 10 }}>❌ {importError}</div>}
          {importPreview.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, color: 'var(--text-2)' }}>Preview ({importPreview.length} shift):</div>
              {importPreview.map((r, i) => (
                <div key={i} className="row-item">
                  <div><div className="row-title">{r.name}</div><div className="row-sub">{r.startTime} – {r.endTime}</div></div>
                  <span className="badge badge-blue">Baru</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleImport} disabled={loading || !importPreview.length}>
              {loading ? 'Mengimport...' : `Import ${importPreview.length} Shift`}
            </button>
            <button className="btn" style={{ flex: 1 }} onClick={() => { setShowImport(false); setImportPreview([]) }}>Batal</button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>{editId ? 'Edit Shift' : 'Shift Baru'}</div>
          <div className="field">
            <label className="label">Nama Shift</label>
            <input className="input" placeholder="Contoh: Pagi" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="field"><label className="label">Jam Mulai</label><input className="input" type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} /></div>
            <div className="field"><label className="label">Jam Selesai</label><input className="input" type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}>Simpan</button>
            <button className="btn" style={{ flex: 1 }} onClick={() => { setShowForm(false); setEditId(null) }}>Batal</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title" style={{ marginBottom: 12 }}>Tipe Shift ({shifts.length})</div>
        {shifts.length === 0 && <div className="empty-state"><div className="empty-icon">🕐</div>Belum ada shift</div>}
        {shifts.map(s => (
          <div className="row-item" key={s.id}>
            <div><div className="row-title">{s.name}</div><div className="row-sub">{s.startTime} – {s.endTime}</div></div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-sm" onClick={() => startEdit(s)}>✏️</button>
              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s.id, s.name)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
