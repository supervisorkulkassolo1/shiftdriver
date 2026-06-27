import { useEffect, useState } from 'react'
import { getOutlets, getBatches, getDrivers } from '../../lib/db'

export default function SpvDashboard() {
  const [outlets, setOutlets] = useState([])
  const [summary, setSummary] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const outs = await getOutlets()
      setOutlets(outs)
      const data = await Promise.all(outs.map(async o => {
        const batches = await getBatches(o.id)
        const active = batches.find(b => b.status === 'open')
        const drivers = await getDrivers(o.id)
        const totalSlots = active ? active.slots.length : 0
        const filledSlots = active ? active.slots.filter(s => s.filled >= s.capacity).length : 0
        return { outlet: o, active, drivers: drivers.length, totalSlots, filledSlots }
      }))
      setSummary(data)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="empty-state">Memuat data...</div>

  return (
    <>
      {summary.map(s => (
        <div className="card" key={s.outlet.id}>
          <div className="card-header">
            <div>
              <div className="card-title">🏪 {s.outlet.name}</div>
              <div className="card-sub">{s.drivers} driver aktif</div>
            </div>
            {s.active
              ? <span className="badge badge-green">Batch Aktif</span>
              : <span className="badge badge-gray">Tidak Ada Batch</span>}
          </div>
          {s.active ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>
                <span>{s.active.label}</span>
                <span>{s.filledSlots}/{s.totalSlots} slot penuh</span>
              </div>
              <div className="progress">
                <div className="progress-fill" style={{ width: s.totalSlots ? `${Math.round(s.filledSlots / s.totalSlots * 100)}%` : '0%' }} />
              </div>
            </>
          ) : (
            <div className="text-sm text-muted">Tidak ada batch aktif saat ini</div>
          )}
        </div>
      ))}
      {outlets.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🏪</div>
          <div>Belum ada outlet. Tambahkan di tab Outlet.</div>
        </div>
      )}
    </>
  )
}
