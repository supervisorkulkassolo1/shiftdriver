import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from '../_app'
import DriverSchedule from '../../components/driver/Schedule'
import DriverMyShifts from '../../components/driver/MyShifts'

const TABS = [
  { id: 'schedule', label: 'Isi Jadwal', icon: '📅' },
  { id: 'myshifts', label: 'Jadwalku', icon: '✅' },
]

export default function DriverPage() {
  const { user, logout } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState('schedule')

  useEffect(() => {
    if (!user) router.replace('/')
    else if (user.role !== 'driver') router.replace('/spv')
  }, [user])

  if (!user || user.role !== 'driver') return null

  function handleLogout() {
    logout()
    router.replace('/')
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">{user.name}</div>
          <div className="topbar-sub">{user.code} · {user.outletName || 'Driver'}</div>
        </div>
        <button className="btn btn-sm" onClick={handleLogout}>Keluar</button>
      </div>

      <div className="tab-bar">
        {TABS.map(t => (
          <div key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <span className="tab-icon">{t.icon}</span>
            {t.label}
          </div>
        ))}
      </div>

      <div className="content">
        {tab === 'schedule' && <DriverSchedule user={user} />}
        {tab === 'myshifts' && <DriverMyShifts user={user} />}
      </div>
    </>
  )
}
