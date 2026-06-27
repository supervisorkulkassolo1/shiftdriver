import { useEffect, useState } from 'react'
import { getOutlets, getShiftTypes, addShiftType, updateShiftType, deleteShiftType } from '../../lib/db'
import { showToast } from '../../lib/toast'

export default function SpvShifts() {
  const [outlets, setOutlets] = useState([])
  const [selectedOutlet, setSelectedOutlet] = useState('')
  const [shifts, setShifts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ name: '', startTime: '06:00', endTime: '12:00' })

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
      setShowForm(false)
      setEditId(null)
      await loadShifts()
    } catch { showToast('Gagal menyimpan', 'error') }
  }

  function startEdit(s) {
    setEditId(s.id)
    setForm({ name: s.name, startTime: s.startTime, endTime: s.endTime })
    setShowForm(true)
  }

  async function handleDelete(id, name) {
    if (!confirm(`Hapus shift "${name}"?`)) return
    try { await deleteShiftType(id); await loadShifts(); showToast('Shift dihapus', 'success') }
    catch { showToast('Gagal menghapus', 'error') }
  }

  return (
    <>
      <div className="card">
        <div className="card-title" style={{ marginBottom: 10 }}>Pilih Outlet</div>
        <div className="day-row">
          {outlets.map(o => (
            <div key={o.id} className={`day-chip ${selectedOutlet === o.id ? 'active' : ''}`} onClick={() => setSelectedOutlet(o.id)}>{o.name}</div>
          ))}
        </div>
        <button className="btn btn-primary btn-block" onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ name: '', startTime: '06:00', endTime: '12:00' }) }}>
          {showForm && !editId ? 'Batal' : '+ Tambah Tipe Shift'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>{editId ? 'Edit Shift' : 'Shift Baru'}</div>
          <div className="field">
            <label className="label">Nama Shift</label>
            <input className="input" placeholder="Contoh: Pagi" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="field">
              <label className="label">Jam Mulai</label>
              <input className="input" type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
            </div>
            <div className="field">
              <label className="label">Jam Selesai</label>
              <input className="input" type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}>Simpan</button>
            <button className="btn" style={{ flex: 1 }} onClick={() => { setShowForm(false); setEditId(null) }}>Batal</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title" style={{ marginBottom: 12 }}>Tipe Shift ({shifts.length})</div>
        {shifts.length === 0 && <div className="empty-state"><div className="empty-icon">🕐</div>Belum ada tipe shift</div>}
        {shifts.map(s => (
          <div className="row-item" key={s.id}>
            <div>
              <div className="row-title">{s.name}</div>
              <div className="row-sub">{s.startTime} – {s.endTime}</div>
            </div>
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
