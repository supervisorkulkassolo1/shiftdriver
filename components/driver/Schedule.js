import { useEffect, useState, useRef } from 'react'
import { getActiveBatch, getShiftTypes, subscribeBatch, bookSlot, unbookSlot, getDriverSubmission, lockDriverSchedule, getOutlets } from '../../lib/db'
import { showToast } from '../../lib/toast'
import { format, parseISO } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

export default function DriverSchedule({ user }) {
  const [batch, setBatch] = useState(null)
  const [shiftTypes, setShiftTypes] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [submission, setSubmission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [locking, setLocking] = useState(false)
  const [outletName, setOutletName] = useState('')
  const unsubRef = useRef(null)

  useEffect(() => {
    init()
    return () => { if (unsubRef.current) unsubRef.current() }
  }, [])

  async function init() {
    setLoading(true)
    try {
      const outlets = await getOutlets()
      const outlet = outlets.find(o => o.id === user.outletId)
      setOutletName(outlet?.name || '')

      const activeBatch = await getActiveBatch(user.outletId)
      if (!activeBatch) { setLoading(false); return }

      const st = await getShiftTypes(user.outletId)
      setShiftTypes(st)

      // Check submission/lock status
      const sub = await getDriverSubmission(activeBatch.id, user.id)
      setSubmission(sub)

      // Check window
      const now = new Date()
      const open = new Date(activeBatch.windowOpen)
      const close = new Date(activeBatch.windowClose)
      if (now < open || now > close) {
        setBatch({ ...activeBatch, windowClosed: true })
        setLoading(false)
        return
      }

      // Subscribe real-time
      setBatch(activeBatch)
      const dates = getUniqueDates(activeBatch.slots)
      if (dates.length) setSelectedDate(dates[0])

      unsubRef.current = subscribeBatch(activeBatch.id, (updated) => {
        setBatch(prev => ({ ...updated, windowClosed: prev?.windowClosed }))
      })
    } catch (err) {
      showToast('Gagal memuat batch: ' + err.message, 'error')
    }
    setLoading(false)
  }

  function getUniqueDates(slots) {
    return [...new Set(slots.map(s => s.date))].sort()
  }

  function mySlots() {
    if (!batch) return []
    return batch.slots.filter(s => s.drivers.includes(user.id))
  }

  function isWindowOpen() {
    if (!batch) return false
    const now = new Date()
    return now >= new Date(batch.windowOpen) && now <= new Date(batch.windowClose)
  }

  async function handleBook(slot) {
    if (submission?.locked) return
    if (booking) return
    setBooking(true)
    try {
      await bookSlot(batch.id, slot.key, user.id, user.name, user.nip || "")
      showToast('Shift berhasil dipilih! ✅', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    }
    setBooking(false)
  }

  async function handleUnbook(slot) {
    if (submission?.locked) return
    if (booking) return
    setBooking(true)
    try {
      await unbookSlot(batch.id, slot.key, user.id, user.name)
      showToast('Shift dibatalkan', 'info')
    } catch (err) {
      showToast(err.message, 'error')
    }
    setBooking(false)
  }

  async function handleLock() {
    const mine = mySlots()
    if (mine.length === 0) { showToast('Pilih minimal 1 shift dulu', 'error'); return }
    if (!confirm(`Kunci jadwal? Total ${mine.length} shift dipilih. Kamu tidak bisa mengubah lagi sampai batch berikutnya.`)) return
    setLocking(true)
    try {
      await lockDriverSchedule(batch.id, user.id)
      const sub = await getDriverSubmission(batch.id, user.id)
      setSubmission(sub)
      showToast('Jadwal berhasil dikunci! 🔒', 'success')
    } catch { showToast('Gagal mengunci jadwal', 'error') }
    setLocking(false)
  }

  if (loading) return <div className="empty-state">Memuat batch jadwal...</div>

  if (!batch) return (
    <div className="empty-state">
      <div className="empty-icon">📅</div>
      <div>Tidak ada batch jadwal aktif saat ini.</div>
      <div className="text-sm text-muted" style={{ marginTop: 8 }}>Tunggu SPV membuka jadwal minggu depan.</div>
    </div>
  )

  if (batch.windowClosed) {
    const now = new Date()
    const open = new Date(batch.windowOpen)
    const close = new Date(batch.windowClose)
    const belumBuka = now < open
    return (
      <div className="empty-state">
        <div className="empty-icon">{belumBuka ? '⏳' : '🔒'}</div>
        <div>{belumBuka ? 'Window pengisian belum dibuka' : 'Window pengisian sudah ditutup'}</div>
        <div className="text-sm text-muted" style={{ marginTop: 8 }}>
          {belumBuka ? `Dibuka: ${open.toLocaleString('id-ID')}` : `Ditutup: ${close.toLocaleString('id-ID')}`}
        </div>
      </div>
    )
  }

  const dates = getUniqueDates(batch.slots)
  const mine = mySlots()
  const isLocked = submission?.locked
  const slotsForDate = batch.slots.filter(s => s.date === selectedDate)

  return (
    <>
      {isLocked ? (
        <div className="alert alert-green">🔒 Jadwalmu sudah dikunci. Menunggu batch berikutnya.</div>
      ) : (
        <div className="alert alert-blue">
          📋 <span>Batch: <strong>{batch.label}</strong> · Tutup: {new Date(batch.windowClose).toLocaleString('id-ID')}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span className="text-sm text-muted">{mine.length}/7 shift dipilih</span>
        {!isLocked && mine.length > 0 && (
          <button className="btn btn-success btn-sm" onClick={handleLock} disabled={locking}>
            {locking ? 'Mengunci...' : '🔒 Kunci Jadwal'}
          </button>
        )}
      </div>

      <div className="day-row">
        {dates.map(date => {
          const hasMySlot = batch.slots.some(s => s.date === date && s.drivers.includes(user.id))
          return (
            <div
              key={date}
              className={`day-chip ${selectedDate === date ? 'active' : ''}`}
              onClick={() => setSelectedDate(date)}
              style={{ position: 'relative' }}
            >
              {format(parseISO(date), 'EEE dd', { locale: idLocale })}
              {hasMySlot && <span style={{ position: 'absolute', top: 2, right: 4, fontSize: 8 }}>✅</span>}
            </div>
          )
        })}
      </div>

      {selectedDate && (
        <div>
          <div className="card-title" style={{ marginBottom: 10 }}>
            {format(parseISO(selectedDate), 'EEEE, dd MMMM yyyy', { locale: idLocale })}
          </div>
          {slotsForDate.length === 0 && <div className="empty-state"><div>Tidak ada shift di hari ini</div></div>}
          {slotsForDate.map(slot => {
            const st = shiftTypes.find(t => t.id === slot.shiftTypeId)
            const isMine = slot.drivers.includes(user.id)
            const isFull = slot.filled >= slot.capacity && !isMine
            const pct = Math.round(slot.filled / slot.capacity * 100)
            const fillClass = pct < 50 ? 'fill-low' : pct < 80 ? 'fill-mid' : 'fill-high'

            return (
              <div
                key={slot.key}
                className={`slot ${isFull ? 'full' : ''} ${isMine ? 'mine' : ''}`}
                onClick={() => {
                  if (isLocked || booking) return
                  if (isMine) handleUnbook(slot)
                  else if (!isFull) handleBook(slot)
                  else showToast('Slot ini sudah penuh', 'error')
                }}
              >
                <div>
                  <div className="slot-time">{st?.name || '-'}</div>
                  <div className="slot-label">{st?.startTime}–{st?.endTime}</div>
                  <div style={{ fontSize: 12, color: isMine ? 'var(--green)' : 'var(--text-2)', marginTop: 2 }}>
                    {isMine ? '✅ Kamu sudah pilih (tap untuk batal)' : isFull ? '❌ Penuh' : `${slot.filled}/${slot.capacity} driver`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="slot-bar">
                    <div className={`slot-fill ${fillClass}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{pct}%</div>
                  <div style={{ fontSize: 18, marginTop: 4 }}>{isMine ? '✅' : isFull ? '🚫' : '➕'}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {mine.length > 0 && !isLocked && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="card-title" style={{ marginBottom: 8 }}>Shift yang dipilih ({mine.length})</div>
          {mine.map(s => {
            const st = shiftTypes.find(t => t.id === s.shiftTypeId)
            return (
              <div className="row-item" key={s.key}>
                <div>
                  <div className="row-title">{format(parseISO(s.date), 'EEE dd MMM', { locale: idLocale })}</div>
                  <div className="row-sub">{st?.name} · {st?.startTime}–{st?.endTime}</div>
                </div>
                <span className="badge badge-green">Dipilih</span>
              </div>
            )
          })}
          <button className="btn btn-success btn-block" style={{ marginTop: 10 }} onClick={handleLock} disabled={locking || isLocked}>
            {locking ? 'Mengunci...' : '🔒 Kunci & Kirim Jadwal'}
          </button>
        </div>
      )}
    </>
  )
}
