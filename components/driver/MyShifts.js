import { useEffect, useState } from 'react'
import { getActiveBatch, getShiftTypes, getDriverSubmission } from '../../lib/db'
import { format, parseISO } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

export default function DriverMyShifts({ user }) {
  const [batch, setBatch] = useState(null)
  const [shiftTypes, setShiftTypes] = useState([])
  const [submission, setSubmission] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const b = await getActiveBatch(user.outletId)
      if (!b) { setLoading(false); return }
      const st = await getShiftTypes(user.outletId)
      const sub = await getDriverSubmission(b.id, user.id)
      setBatch(b)
      setShiftTypes(st)
      setSubmission(sub)
    } catch {}
    setLoading(false)
  }

  if (loading) return <div className="empty-state">Memuat...</div>
  if (!batch) return <div className="empty-state"><div className="empty-icon">📅</div>Tidak ada batch aktif</div>

  const mySlots = batch.slots.filter(s => s.drivers.includes(user.id)).sort((a, b) => a.date.localeCompare(b.date))

  return (
    <>
      <div className={`alert ${submission?.locked ? 'alert-green' : 'alert-amber'}`}>
        {submission?.locked ? '🔒 Jadwal sudah dikunci dan terkirim ke SPV' : '⚠️ Jadwal belum dikunci. Kunci di tab Isi Jadwal.'}
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">{batch.label}</div>
            <div className="card-sub">{batch.startDate} – {batch.endDate}</div>
          </div>
          <span className="badge badge-blue">{mySlots.length} shift</span>
        </div>

        {mySlots.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📋</div>Belum ada shift yang dipilih</div>
        ) : (
          mySlots.map(s => {
            const st = shiftTypes.find(t => t.id === s.shiftTypeId)
            return (
              <div className="row-item" key={s.key}>
                <div>
                  <div className="row-title">{format(parseISO(s.date), 'EEEE, dd MMM', { locale: idLocale })}</div>
                  <div className="row-sub">{st?.name} · {st?.startTime} – {st?.endTime}</div>
                </div>
                <span className="badge badge-green">✅</span>
              </div>
            )
          })
        )}
      </div>
    </>
  )
}
