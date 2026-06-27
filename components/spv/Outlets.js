import { useEffect, useState } from 'react'
import { getOutlets, addOutlet, deleteOutlet } from '../../lib/db'
import { showToast } from '../../lib/toast'

export default function SpvOutlets() {
  const [outlets, setOutlets] = useState([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const data = await getOutlets()
    setOutlets(data)
  }

  async function handleAdd() {
    if (!name.trim()) return
    setLoading(true)
    try {
      await addOutlet(name.trim())
      setName('')
      await load()
      showToast('Outlet berhasil ditambahkan', 'success')
    } catch { showToast('Gagal menambahkan outlet', 'error') }
    finally { setLoading(false) }
  }

  async function handleDelete(id, outletName) {
    if (!confirm(`Hapus outlet "${outletName}"? Semua data terkait outlet ini tidak akan terhapus otomatis.`)) return
    try {
      await deleteOutlet(id)
      await load()
      showToast('Outlet dihapus', 'success')
    } catch { showToast('Gagal menghapus', 'error') }
  }

  return (
    <>
      <div className="card">
        <div className="card-title" style={{ marginBottom: 12 }}>Tambah Outlet</div>
        <div className="field">
          <label className="label">Nama Outlet</label>
          <input className="input" placeholder="Contoh: Outlet Barat" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <button className="btn btn-primary btn-block" onClick={handleAdd} disabled={loading || !name.trim()}>
          {loading ? 'Menyimpan...' : '+ Tambah Outlet'}
        </button>
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: 12 }}>Outlet Aktif ({outlets.length})</div>
        {outlets.length === 0 && <div className="empty-state"><div className="empty-icon">🏪</div>Belum ada outlet</div>}
        {outlets.map(o => (
          <div className="row-item" key={o.id}>
            <div>
              <div className="row-title">🏪 {o.name}</div>
              <div className="row-sub">{o.id}</div>
            </div>
            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(o.id, o.name)}>Hapus</button>
          </div>
        ))}
      </div>
    </>
  )
}
