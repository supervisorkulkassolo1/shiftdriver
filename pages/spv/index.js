import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from '../_app'
import SpvDashboard from '../../components/spv/Dashboard'
import SpvOutlets from '../../components/spv/Outlets'
import SpvDrivers from '../../components/spv/Drivers'
import SpvShifts from '../../components/spv/Shifts'
import SpvBatches from '../../components/spv/Batches'
import SpvSettings from '../../components/spv/Settings'

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'batches', label: 'Batch', icon: '📅' },
  { id: 'drivers', label: 'Driver', icon: '👥' },
  { id: 'shifts', label: 'Shift', icon: '🕐' },
  { id: 'outlets', label: 'Outlet', icon: '🏪' },
  { id: 'settings', label: 'Setelan', icon: '⚙️' },
]

export default function SpvPage() {
  const { user, logout } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState('dashboard')

  useEffect(() => {
    if (!user) router.replace('/')
    else if (user.role !== 'spv') router.replace('/driver')
  }, [user])

  if (!user || user.role !== 'spv') return null

  function handleLogout() {
    logout()
    router.replace('/')
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Panel SPV</div>
          <div className="topbar-sub">Halo, {user.username} 👋</div>
        </div>
        <button className="btn btn-sm" onClick={handleLogout}>Keluar</button>
      </div>

      <div className="tab-bar" style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
        {TABS.map(t => (
          <div key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <span className="tab-icon">{t.icon}</span>
            {t.label}
          </div>
        ))}
      </div>

      <div className="content">
        {tab === 'dashboard' && <SpvDashboard />}
        {tab === 'batches' && <SpvBatches />}
        {tab === 'drivers' && <SpvDrivers />}
        {tab === 'shifts' && <SpvShifts />}
        {tab === 'outlets' && <SpvOutlets />}
        {tab === 'settings' && <SpvSettings user={user} />}
      </div>
    </>
  )
}
