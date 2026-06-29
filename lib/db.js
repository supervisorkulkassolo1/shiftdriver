import { db } from './firebase'
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, onSnapshot, runTransaction, serverTimestamp, orderBy
} from 'firebase/firestore'

// ─── OUTLETS ─────────────────────────────────────────────────────────────────

export async function getOutlets() {
  const snap = await getDocs(collection(db, 'outlets'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function addOutlet(name) {
  const id = 'OTL' + Date.now()
  await setDoc(doc(db, 'outlets', id), { name, createdAt: serverTimestamp() })
  return id
}

export async function deleteOutlet(id) {
  await deleteDoc(doc(db, 'outlets', id))
}

// ─── SPV ─────────────────────────────────────────────────────────────────────

export async function loginSPV(username, password) {
  const snap = await getDocs(query(collection(db, 'spv'), where('username', '==', username)))
  if (snap.empty) return null
  const spvDoc = snap.docs[0]
  const data = spvDoc.data()
  if (data.password !== password) return null
  return { id: spvDoc.id, role: 'spv', username: data.username }
}

export async function updateSPVPassword(spvId, oldPassword, newPassword) {
  const ref = doc(db, 'spv', spvId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return { ok: false, error: 'Akun tidak ditemukan' }
  if (snap.data().password !== oldPassword) return { ok: false, error: 'Password lama salah' }
  await updateDoc(ref, { password: newPassword })
  return { ok: true }
}

// ─── DRIVERS ─────────────────────────────────────────────────────────────────

export async function getDrivers(outletId = null) {
  let q = outletId
    ? query(collection(db, 'drivers'), where('outletId', '==', outletId))
    : collection(db, 'drivers')
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function addDriver({ name, nip, outletId, whatsapp }) {
  const drivers = await getDocs(collection(db, 'drivers'))
  const count = drivers.size + 1
  const code = 'DRV' + String(count).padStart(3, '0')
  await setDoc(doc(db, 'drivers', code), {
    name, nip: nip || '', outletId, whatsapp, code, active: true, createdAt: serverTimestamp()
  })
  return code
}

// Import multiple drivers from CSV
export async function importDriversFromCSV(rows, outletId) {
  const existing = await getDocs(collection(db, 'drivers'))
  let count = existing.size
  const results = []
  for (const row of rows) {
    count++
    const code = 'DRV' + String(count).padStart(3, '0')
    await setDoc(doc(db, 'drivers', code), {
      name: row.name,
      nip: row.nip || '',
      outletId,
      whatsapp: row.whatsapp || '',
      code,
      active: true,
      createdAt: serverTimestamp()
    })
    results.push({ ...row, code })
  }
  return results
}

export async function updateDriver(id, data) {
  await updateDoc(doc(db, 'drivers', id), data)
}

export async function deleteDriver(id) {
  await deleteDoc(doc(db, 'drivers', id))
}

export async function toggleDriverActive(id, active) {
  await updateDoc(doc(db, 'drivers', id), { active })
}

export async function loginDriver(code) {
  const upper = code.trim().toUpperCase()
  const ref = doc(db, 'drivers', upper)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  const data = snap.data()
  if (!data.active) return { blocked: true }
  return { id: upper, role: 'driver', ...data }
}

// ─── SHIFT TYPES (per outlet) ─────────────────────────────────────────────────

export async function getShiftTypes(outletId) {
  const snap = await getDocs(
    query(collection(db, 'shiftTypes'), where('outletId', '==', outletId))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function addShiftType(outletId, { name, startTime, endTime }) {
  const id = 'SHT' + Date.now()
  await setDoc(doc(db, 'shiftTypes', id), { outletId, name, startTime, endTime })
  return id
}

// Import shift types from CSV for an outlet
export async function importShiftTypesFromCSV(rows, outletId) {
  const results = []
  for (const row of rows) {
    const id = 'SHT' + Date.now() + Math.random().toString(36).slice(2, 6)
    await setDoc(doc(db, 'shiftTypes', id), {
      outletId,
      name: row.name,
      startTime: row.startTime,
      endTime: row.endTime
    })
    results.push({ id, ...row })
  }
  return results
}

export async function updateShiftType(id, data) {
  await updateDoc(doc(db, 'shiftTypes', id), data)
}

export async function deleteShiftType(id) {
  await deleteDoc(doc(db, 'shiftTypes', id))
}

// ─── BATCHES ─────────────────────────────────────────────────────────────────

export async function getBatches(outletId) {
  const snap = await getDocs(
    query(collection(db, 'batches'), where('outletId', '==', outletId), orderBy('createdAt', 'desc'))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getActiveBatch(outletId) {
  const snap = await getDocs(
    query(collection(db, 'batches'), where('outletId', '==', outletId), where('status', '==', 'open'))
  )
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() }
}

export async function createBatch({ outletId, label, startDate, endDate, windowOpen, windowClose, slots }) {
  const id = 'BCH' + Date.now()
  await setDoc(doc(db, 'batches', id), {
    outletId, label, startDate, endDate, windowOpen, windowClose,
    slots,
    status: 'open', createdAt: serverTimestamp()
  })
  return id
}

export async function closeBatch(batchId) {
  await updateDoc(doc(db, 'batches', batchId), { status: 'closed' })
}

// ─── SLOT BOOKING (with Transaction for race condition safety) ────────────────

export async function bookSlot(batchId, slotKey, driverId, driverName, driverNip) {
  const batchRef = doc(db, 'batches', batchId)
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(batchRef)
    if (!snap.exists()) throw new Error('Batch tidak ditemukan')
    const data = snap.data()
    const slots = [...data.slots]
    const idx = slots.findIndex(s => s.key === slotKey)
    if (idx === -1) throw new Error('Slot tidak ditemukan')
    const slot = slots[idx]
    if (slot.filled >= slot.capacity) throw new Error('Slot sudah penuh')
    if (slot.drivers.includes(driverId)) throw new Error('Kamu sudah ambil shift ini')
    const sameDate = slots.some(s => s.date === slot.date && s.drivers.includes(driverId))
    if (sameDate) throw new Error('Kamu sudah punya shift di hari ini')
    slots[idx] = {
      ...slot,
      filled: slot.filled + 1,
      drivers: [...slot.drivers, driverId],
      driverNames: [...(slot.driverNames || []), driverName],
      bookings: [...(slot.bookings || []), {
        driverId,
        driverName,
        driverNip: driverNip || '',
        timestamp: Date.now()
      }]
    }
    tx.update(batchRef, { slots })
  })
}

export async function unbookSlot(batchId, slotKey, driverId, driverName) {
  const batchRef = doc(db, 'batches', batchId)
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(batchRef)
    if (!snap.exists()) throw new Error('Batch tidak ditemukan')
    const data = snap.data()
    const slots = [...data.slots]
    const idx = slots.findIndex(s => s.key === slotKey)
    if (idx === -1) throw new Error('Slot tidak ditemukan')
    const slot = slots[idx]
    if (!slot.drivers.includes(driverId)) throw new Error('Kamu tidak ada di slot ini')
    slots[idx] = {
      ...slot,
      filled: slot.filled - 1,
      drivers: slot.drivers.filter(d => d !== driverId),
      driverNames: (slot.driverNames || []).filter(n => n !== driverName),
      bookings: (slot.bookings || []).filter(b => b.driverId !== driverId)
    }
    tx.update(batchRef, { slots })
  })
}

// ─── DRIVER SUBMISSION LOCK ────────────────────────────────────────────────────

export async function getDriverSubmission(batchId, driverId) {
  const ref = doc(db, 'submissions', `${batchId}_${driverId}`)
  const snap = await getDoc(ref)
  return snap.exists() ? snap.data() : null
}

export async function lockDriverSchedule(batchId, driverId) {
  const ref = doc(db, 'submissions', `${batchId}_${driverId}`)
  await setDoc(ref, { batchId, driverId, lockedAt: serverTimestamp(), locked: true })
}

// ─── REALTIME LISTENER ────────────────────────────────────────────────────────

export function subscribeBatch(batchId, callback) {
  const ref = doc(db, 'batches', batchId)
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() })
  })
}

// ─── CSV HELPERS ──────────────────────────────────────────────────────────────

// Parse CSV text → array of objects
export function parseCSV(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase())
  return lines.slice(1).map(line => {
    const vals = line.match(/(".*?"|[^,]+)(?=,|$)/g) || []
    const obj = {}
    headers.forEach((h, i) => {
      obj[h] = (vals[i] || '').replace(/^"|"$/g, '').trim()
    })
    return obj
  })
}

// Export batch result as CSV: nip, nama_staff, nama_shift, tanggal
export function batchToCSV(batch, outlets, shiftTypes) {
  const rows = [['nip', 'nama_staff', 'nama_shift', 'tanggal']]
  const sortedSlots = [...batch.slots].sort((a, b) => a.date.localeCompare(b.date))
  sortedSlots.forEach(slot => {
    const st = shiftTypes.find(s => s.id === slot.shiftTypeId)
    const bookings = slot.bookings || []
    if (bookings.length === 0) {
      rows.push(['', '(kosong)', st?.name || '', slot.date])
    } else {
      bookings.forEach(b => {
        rows.push([
          b.driverNip || '',
          b.driverName,
          st?.name || '',
          slot.date
        ])
      })
    }
  })
  return rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
}

// Build slots array from imported CSV batch schedule
// CSV format: tanggal,nama_shift,kapasitas
export function parseBatchCSV(text, shiftTypes) {
  const rows = parseCSV(text)
  const errors = []
  const slots = []
  rows.forEach((row, i) => {
    const lineNum = i + 2
    const date = row['tanggal'] || row['date']
    const shiftName = row['nama_shift'] || row['shift']
    const capacity = parseInt(row['kapasitas'] || row['capacity'] || '0')
    if (!date || !shiftName) { errors.push(`Baris ${lineNum}: kolom tanggal/nama_shift kosong`); return }
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) { errors.push(`Baris ${lineNum}: format tanggal harus YYYY-MM-DD`); return }
    if (!capacity || capacity < 1) { errors.push(`Baris ${lineNum}: kapasitas harus angka > 0`); return }
    const st = shiftTypes.find(s => s.name.toLowerCase() === shiftName.toLowerCase())
    if (!st) { errors.push(`Baris ${lineNum}: shift "${shiftName}" tidak ditemukan di outlet ini`); return }
    const key = date + '_' + st.id
    if (slots.find(s => s.key === key)) { errors.push(`Baris ${lineNum}: duplikat slot ${date} - ${shiftName}`); return }
    slots.push({
      key,
      shiftTypeId: st.id,
      date,
      capacity,
      filled: 0,
      drivers: [],
      driverNames: [],
      bookings: []
    })
  })
  return { slots, errors }
}
