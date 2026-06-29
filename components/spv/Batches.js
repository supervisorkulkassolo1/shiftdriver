import { useEffect, useState, useRef } from 'react'
import { getOutlets, getShiftTypes, getBatches, createBatch, closeBatch, batchToCSV, parseBatchCSV, parseCSV } from '../../lib/db'
import { showToast } from '../../lib/toast'
import { format, eachDayOfInterval, parseISO } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

const STEPS = ['Info Batch', 'Pilih Shift', 'Kapasitas per Hari']

export default function SpvBatches() {
  const [outlets, setOutlets] = useState([])
  const [selectedOutlet, setSelectedOutlet] = useState('')
  const [batches, setBatches] = useState([])
  const [shiftTypes, setShiftTypes] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [step, setStep] = useState(0)
  const [view, setView] = useState(null)
  const [useCSVImport, setUseCSVImport] = useState(false)
  const [csvImportPreview, setCsvImportPreview] = useState([])
  const [csvImportErrors, setCsvImportErrors] = useState([])
  const fileRef = useRef()

  const [form, setForm] = useState({ outletId: '', label: '', startDate: '', endDate: '', windowOpen: '', windowClose: '' })
  const [selectedShifts, setSelectedShifts] = useState({})
  const [capOverride, setCapOverride] = useState({})
  const [selCapDay, setSelCapDay] = useState(null)

  useEffect(() => { loadOutlets() }, [])
  useEffect(() => { if (selectedOutlet) { loadBatches(); loadShifts() } }, [selectedOutlet])

  async function loadOutlets() {
    const o = await getOutlets()
    setOutlets(o)
    if (o.length) { setSelectedOutlet(o[0].id); setForm(f => ({ ...f, outletId: o[0].id })) }
  }
  async function loadBatches() { setBatches(await getBatches(selectedOutlet)) }
  async function loadShifts() { setShiftTypes(await getShiftTypes(selectedOutlet)) }

  function getDates() {
    if (!form.startDate || !form.endDate) return []
    try { return eachDayOfInterval({ start: parseISO(form.startDate), end: parseISO(form.endDate) }) }
    catch { return [] }
  }

  function toggleShift(id) {
    setSelectedShifts(prev => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = { defaultCap: '' }
      return next
    })
  }

  function setDefaultCap(id, val) {
    setSelectedShifts(prev => ({ ...prev, [id]: { ...prev[id], defaultCap: val } }))
  }

  function getCapVal(date, shiftId) {
    const key = date + '|' + shiftId
    if (capOverride[key] !== undefined) return capOverride[key]
    return selectedShifts[shiftId]?.defaultCap || ''
  }

  function setCapVal(date, shiftId, val) {
    setCapOverride(prev => ({ ...prev, [date + '|' + shiftId]: val }))
  }

  // Handle CSV import for batch slots
  function handleBatchCSVFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const { slots, errors } = parseBatchCSV(ev.target.result, shiftTypes)
      setCsvImportPreview(slots)
      setCsvImportErrors(errors)
    }
    reader.readAsText(file)
  }

  function goStep1() {
    if (!form.label.trim()) { showToast('Isi label batch dulu', 'error'); return }
    if (!form.startDate || !form.endDate) { showToast('Pilih tanggal', 'error'); return }
    if (!form.windowOpen || !form.windowClose) { showToast('Isi window buka dan tutup', 'error'); return }
    setSelectedShifts({})
    setCsvImportPreview([])
    setCsvImportErrors([])
    setUseCSVImport(false)
    setStep(1)
  }

  function goStep2Manual() {
    const active = Object.keys(selectedShifts)
    if (!active.length) { showToast('Pilih minimal 1 shift', 'error'); return }
    const noDefault = active.some(id => !selectedShifts[id].defaultCap || parseInt(selectedShifts[id].defaultCap) < 1)
    if (noDefault) { showToast('Isi kapasitas default semua shift yang dipilih', 'error'); return }
    const dates = getDates()
    if (dates.length) setSelCapDay(format(dates[0], 'yyyy-MM-dd'))
    setCapOverride({})
    setStep(2)
  }

  async function handleCreateManual() {
    const dates = getDates()
    const activeShifts = shiftTypes.filter(s => selectedShifts[s.id])
    const slots = []
    dates.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd')
      activeShifts.forEach(s => {
        const cap = parseInt(getCapVal(dateStr, s.id) || 0)
        if (cap > 0) {
          slots.push({ key: dateStr + '_' + s.id, shiftTypeId: s.id, date: dateStr, capacity: cap, filled: 0, drivers: [], driverNames: [], bookings: [] })
        }
      })
    })
    if (!slots.length) { showToast('Tidak ada slot aktif', 'error'); return }
    await submitBatch(slots)
  }

  async function handleCreateFromCSV() {
    if (!csvImportPreview.length) { showToast('Upload CSV dulu', 'error'); return }
    if (csvImportErrors.length) { showToast('Ada error di CSV, perbaiki dulu', 'error'); return }
    await submitBatch(csvImportPreview)
  }

  async function submitBatch(slots) {
    try {
      await createBatch({ ...form, outletId: selectedOutlet, slots })
      showToast('Batch berhasil dibuat! 🚀', 'success')
      setShowCreate(false); setStep(0); setSelectedShifts({}); setCapOverride({})
      setCsvImportPreview([]); setCsvImportErrors([])
      setForm(f => ({ ...f, label: '', startDate: '', endDate: '', windowOpen: '', windowClose: '' }))
      await loadBatches()
    } catch (err) { showToast('Gagal: ' + err.message, 'error') }
  }

  function getSummary() {
    const dates = getDates()
    const active = shiftTypes.filter(s => selectedShifts[s.id])
    let totalSlots = 0, totalDriverSlots = 0
    active.forEach(s => {
      dates.forEach(date => {
        const cap = parseInt(getCapVal(format(date, 'yyyy-MM-dd'), s.id) || 0)
        if (cap > 0) { totalSlots++; totalDriverSlots += cap }
      })
    })
    return { totalSlots, totalDriverSlots, activeShifts: active.length }
  }

  async function handleClose(id) {
    if (!confirm('Tutup batch ini?')) return
    try { await closeBatch(id); await loadBatches(); showToast('Batch ditutup', 'success') }
    catch { showToast('Gagal', 'error') }
  }

  function downloadCSV(batch) {
    const csv = batchToCSV(batch, outlets, shiftTypes)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jadwal_${batch.label.replace(/\s+/g, '_')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast('CSV didownload', 'success')
  }

  // ─── DETAIL VIEW ─────────────────────────────────────────────────────────────
  if (view) {
    const slotsByDate = {}
    view.slots.forEach(s => {
      if (!slotsByDate[s.date]) slotsByDate[s.date] = []
      slotsByDate[s.date].push(s)
    })
    return (
      <>
        <button className="btn" style={{ marginBottom: 12 }} onClick={() => setView(null)}>← Kembali</button>
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">{view.label}</div><div className="card-sub">{view.startDate} – {view.endDate}</div></div>
            <span className={`badge ${view.status === 'open' ? 'badge-green' : 'badge-gray'}`}>{view.status === 'open' ? 'Aktif' : 'Tutup'}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {view.status === 'open' && <button className="btn btn-danger btn-sm" onClick={() => { handleClose(view.id); setView(null) }}>Tutup Batch</button>}
            <button className="btn btn-success btn-sm" onClick={() => downloadCSV(view)}>⬇️ Export CSV</button>
          </div>
        </div>
        {Object.entries(slotsByDate).sort().map(([date, slots]) => (
          <div className="card" key={date}>
            <div className="card-title" style={{ marginBottom: 10 }}>{date}</div>
            {slots.map(s => {
              const st = shiftTypes.find(t => t.id === s.shiftTypeId)
              const pct = s.capacity ? Math.round(s.filled / s.capacity * 100) : 0
              return (
                <div key={s.key} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{st?.name} ({st?.startTime}–{st?.endTime})</div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{s.filled}/{s.capacity} driver</div>
                    </div>
                    <span className={`badge ${pct >= 100 ? 'badge-green' : pct > 0 ? 'badge-amber' : 'badge-red'}`}>{pct}%</span>
                  </div>
                  {(s.bookings || []).map(b => (
                    <div key={b.driverId} style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>
                      • {b.driverName} {b.driverNip ? `(${b.driverNip})` : ''} <span style={{ color: 'var(--text-3)' }}>({new Date(b.timestamp).toLocaleTimeString('id-ID')})</span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        ))}
      </>
    )
  }

  // ─── CREATE FORM ─────────────────────────────────────────────────────────────
  if (showCreate) {
    const dates = getDates()
    const activeShiftList = shiftTypes.filter(s => selectedShifts[s.id])

    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <button className="btn btn-sm" onClick={() => { if (step === 0) setShowCreate(false); else setStep(s => s - 1) }}>
            ← {step === 0 ? 'Batal' : 'Kembali'}
          </button>
          <div style={{ display: 'flex', gap: 6, flex: 1, alignItems: 'center' }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: i < 2 ? 1 : 'none' }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 500, flexShrink: 0,
                  background: i < step ? '#EAF3DE' : i === step ? '#185FA5' : 'var(--bg)',
                  color: i < step ? '#27500A' : i === step ? 'white' : 'var(--text-2)',
                  border: i > step ? '1px solid var(--border)' : 'none'
                }}>{i < step ? '✓' : i + 1}</div>
                {i < 2 && <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />}
              </div>
            ))}
          </div>
        </div>

        {/* STEP 0: INFO */}
        {step === 0 && (
          <>
            <div className="card">
              <div className="card-title" style={{ marginBottom: 12 }}>Info Batch</div>
              <div className="field">
                <label className="label">Outlet</label>
                <select className="select" value={selectedOutlet} onChange={e => { setSelectedOutlet(e.target.value); setForm(f => ({ ...f, outletId: e.target.value })) }}>
                  {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label">Label Batch</label>
                <input className="input" placeholder="Minggu 29 Jun – 5 Jul" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div className="field"><label className="label">Tgl Mulai</label><input className="input" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
                <div className="field"><label className="label">Tgl Selesai</label><input className="input" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></div>
                <div className="field"><label className="label">Window Buka</label><input className="input" type="datetime-local" value={form.windowOpen} onChange={e => setForm(f => ({ ...f, windowOpen: e.target.value }))} /></div>
                <div className="field"><label className="label">Window Tutup</label><input className="input" type="datetime-local" value={form.windowClose} onChange={e => setForm(f => ({ ...f, windowClose: e.target.value }))} /></div>
              </div>
            </div>
            <button className="btn btn-primary btn-block" onClick={goStep1}>Lanjut: Pilih Shift →</button>
          </>
        )}

        {/* STEP 1: PILIH SHIFT atau IMPORT CSV */}
        {step === 1 && (
          <>
            {/* Toggle manual / CSV */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button className={`btn ${!useCSVImport ? 'btn-primary' : ''}`} style={{ flex: 1 }} onClick={() => setUseCSVImport(false)}>
                ✋ Setup Manual
              </button>
              <button className={`btn ${useCSVImport ? 'btn-primary' : ''}`} style={{ flex: 1 }} onClick={() => setUseCSVImport(true)}>
                📥 Import CSV
              </button>
            </div>

            {!useCSVImport ? (
              <>
                <div className="alert alert-blue" style={{ marginBottom: 10 }}>
                  Pilih shift aktif untuk batch ini, lalu isi kapasitas default per hari.
                </div>
                <div className="card">
                  <div className="card-header">
                    <div><div className="card-title">Shift Tersedia</div><div className="card-sub">{outlets.find(o => o.id === selectedOutlet)?.name}</div></div>
                  </div>
                  {shiftTypes.length === 0 && <div className="empty-state"><div className="empty-icon">🕐</div>Belum ada shift. Setup di tab Shift dulu.</div>}
                  {shiftTypes.map(s => {
                    const isSelected = !!selectedShifts[s.id]
                    return (
                      <div key={s.id} onClick={() => toggleShift(s.id)} style={{
                        border: `1px solid ${isSelected ? '#185FA5' : 'var(--border)'}`,
                        borderRadius: 8, padding: '10px 12px', marginBottom: 8, cursor: 'pointer',
                        background: isSelected ? '#E6F1FB' : 'var(--surface)', transition: 'all .15s'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{s.startTime} – {s.endTime}</div>
                          </div>
                          <span style={{ fontSize: 18 }}>{isSelected ? '✅' : '⬜'}</span>
                        </div>
                        {isSelected && (
                          <div onClick={e => e.stopPropagation()} style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #B5D4F4' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <label style={{ fontSize: 12, color: '#0C447C', flex: 1 }}>Kapasitas default (driver/hari)</label>
                              <input className="input" type="number" min="1" placeholder="3" style={{ width: 64, textAlign: 'center', margin: 0 }}
                                value={selectedShifts[s.id]?.defaultCap || ''}
                                onChange={e => setDefaultCap(s.id, e.target.value)} />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                <button className="btn btn-primary btn-block" onClick={goStep2Manual}>Lanjut: Atur Kapasitas per Hari →</button>
              </>
            ) : (
              <>
                <div className="card">
                  <div className="card-title" style={{ marginBottom: 4 }}>Import Slot dari CSV</div>
                  <div className="card-sub" style={{ marginBottom: 12 }}>Format kolom: <strong>tanggal, nama_shift, kapasitas</strong></div>
                  <div className="alert alert-blue" style={{ marginBottom: 10 }}>
                    <span>Contoh:<br />
                      <code style={{ fontSize: 10 }}>tanggal,nama_shift,kapasitas<br />
                      2025-06-29,Pagi,3<br />
                      2025-06-29,Siang,5<br />
                      2025-06-30,Pagi,3</code><br /><br />
                      ⚠️ nama_shift harus sama persis dengan shift yang sudah disetup di outlet ini.
                    </span>
                  </div>
                  <div className="field">
                    <label className="label">Upload file CSV</label>
                    <input ref={fileRef} type="file" accept=".csv" className="input" style={{ padding: 6 }} onChange={handleBatchCSVFile} />
                  </div>

                  {csvImportErrors.length > 0 && (
                    <div className="alert alert-red" style={{ marginBottom: 10, flexDirection: 'column', gap: 4 }}>
                      <strong>❌ {csvImportErrors.length} error ditemukan:</strong>
                      {csvImportErrors.map((e, i) => <div key={i} style={{ fontSize: 11 }}>• {e}</div>)}
                    </div>
                  )}

                  {csvImportPreview.length > 0 && !csvImportErrors.length && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, color: 'var(--text-2)' }}>Preview ({csvImportPreview.length} slot):</div>
                      {csvImportPreview.slice(0, 6).map((s, i) => {
                        const st = shiftTypes.find(t => t.id === s.shiftTypeId)
                        return (
                          <div key={i} className="row-item">
                            <div><div className="row-title">{s.date} — {st?.name}</div><div className="row-sub">Kapasitas: {s.capacity} driver</div></div>
                            <span className="badge badge-green">✓</span>
                          </div>
                        )
                      })}
                      {csvImportPreview.length > 6 && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 6 }}>...dan {csvImportPreview.length - 6} slot lainnya</div>}
                    </div>
                  )}
                </div>
                <button className="btn btn-primary btn-block" onClick={handleCreateFromCSV}
                  disabled={!csvImportPreview.length || csvImportErrors.length > 0}>
                  🚀 Buat Batch dari CSV ({csvImportPreview.length} slot)
                </button>
              </>
            )}
          </>
        )}

        {/* STEP 2: KAPASITAS PER HARI (manual only) */}
        {step === 2 && (
          <>
            <div className="alert alert-blue" style={{ marginBottom: 10 }}>
              Ubah jika hari tertentu beda kebutuhannya. Ketik 0 = slot tutup hari itu.
            </div>
            <div className="card">
              <div className="card-title" style={{ marginBottom: 10 }}>Kapasitas per Hari</div>
              <div className="day-row">
                {dates.map(date => {
                  const ds = format(date, 'yyyy-MM-dd')
                  return (
                    <div key={ds} className={`day-chip ${selCapDay === ds ? 'active' : ''}`} onClick={() => setSelCapDay(ds)}>
                      {format(date, 'EEE dd', { locale: idLocale })}
                    </div>
                  )
                })}
              </div>
              {selCapDay && activeShiftList.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{s.startTime} – {s.endTime}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-2)' }}>driver:</span>
                    <input className="input" type="number" min="0" style={{ width: 64, textAlign: 'center', margin: 0 }}
                      value={getCapVal(selCapDay, s.id)}
                      onChange={e => setCapVal(selCapDay, s.id, e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="card-title" style={{ marginBottom: 10 }}>Ringkasan</div>
              {(() => { const { totalSlots, totalDriverSlots, activeShifts } = getSummary(); return (
                <>
                  <div className="row-item"><span style={{ fontSize: 13 }}>Outlet</span><span style={{ fontWeight: 500 }}>{outlets.find(o => o.id === selectedOutlet)?.name}</span></div>
                  <div className="row-item"><span style={{ fontSize: 13 }}>Shift aktif</span><span>{activeShifts} shift</span></div>
                  <div className="row-item"><span style={{ fontSize: 13 }}>Total slot dibuka</span><strong>{totalSlots}</strong></div>
                  <div className="row-item"><span style={{ fontSize: 13 }}>Total kapasitas</span><strong>{totalDriverSlots} driver-slot</strong></div>
                </>
              )})()}
            </div>
            <button className="btn btn-primary btn-block" onClick={handleCreateManual}>🚀 Buat Batch Jadwal</button>
          </>
        )}
      </>
    )
  }

  // ─── BATCH LIST ───────────────────────────────────────────────────────────────
  return (
    <>
      <div className="card">
        <div className="card-title" style={{ marginBottom: 10 }}>Pilih Outlet</div>
        <div className="day-row">
          {outlets.map(o => (
            <div key={o.id} className={`day-chip ${selectedOutlet === o.id ? 'active' : ''}`} onClick={() => setSelectedOutlet(o.id)}>{o.name}</div>
          ))}
        </div>
        <button className="btn btn-primary btn-block" onClick={() => { setShowCreate(true); setStep(0) }}>+ Buat Batch Jadwal</button>
      </div>
      {batches.length === 0 && <div className="empty-state"><div className="empty-icon">📅</div>Belum ada batch</div>}
      {batches.map(b => {
        const total = b.slots.length
        const filled = b.slots.filter(s => s.filled >= s.capacity).length
        return (
          <div className="card" key={b.id}>
            <div className="card-header">
              <div><div className="card-title">{b.label}</div><div className="card-sub">{b.startDate} – {b.endDate}</div></div>
              <span className={`badge ${b.status === 'open' ? 'badge-green' : 'badge-gray'}`}>{b.status === 'open' ? 'Aktif' : 'Tutup'}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>{filled}/{total} slot penuh kapasitas</div>
            <div className="progress" style={{ marginBottom: 10 }}><div className="progress-fill" style={{ width: total ? `${Math.round(filled / total * 100)}%` : '0%' }} /></div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-sm" onClick={() => setView(b)}>👁️ Detail</button>
              {b.status === 'open' && <button className="btn btn-sm btn-danger" onClick={() => handleClose(b.id)}>Tutup</button>}
              <button className="btn btn-sm btn-success" onClick={() => downloadCSV(b)}>⬇️ CSV</button>
            </div>
          </div>
        )
      })}
    </>
  )
}
