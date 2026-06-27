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

export async function addDriver({ name, outletId, whatsapp }) {
  const drivers = await getDocs(collection(db, 'drivers'))
  const count = drivers.size + 1
  const code = 'DRV' + String(count).padStart(3, '0')
  await setDoc(doc(db, 'drivers', code), {
    name, outletId, whatsapp, code, active: true, createdAt: serverTimestamp()
  })
  return code
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
    slots, // array of { shiftTypeId, date, capacity, filled: 0, drivers: [] }
    status: 'open', createdAt: serverTimestamp()
  })
  return id
}

export async function closeBatch(batchId) {
  await updateDoc(doc(db, 'batches', batchId), { status: 'closed' })
}

// ─── SLOT BOOKING (with Transaction for race condition safety) ────────────────

export async function bookSlot(batchId, slotKey, driverId, driverName) {
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
    // Check driver not already booked same date
    const sameDate = slots.some(s => s.date === slot.date && s.drivers.includes(driverId))
    if (sameDate) throw new Error('Kamu sudah punya shift di hari ini')
    slots[idx] = {
      ...slot,
      filled: slot.filled + 1,
      drivers: [...slot.drivers, driverId],
      driverNames: [...(slot.driverNames || []), driverName],
      bookings: [...(slot.bookings || []), { driverId, driverName, timestamp: Date.now() }]
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

// ─── CSV EXPORT ───────────────────────────────────────────────────────────────

export function batchToCSV(batch, outlets, shiftTypes) {
  const outlet = outlets.find(o => o.id === batch.outletId)
  const rows = [['Outlet', 'Batch', 'Tanggal', 'Shift', 'Jam Mulai', 'Jam Selesai', 'Driver', 'Timestamp Booking']]
  const sortedSlots = [...batch.slots].sort((a, b) => a.date.localeCompare(b.date))
  sortedSlots.forEach(slot => {
    const st = shiftTypes.find(s => s.id === slot.shiftTypeId)
    const bookings = slot.bookings || []
    if (bookings.length === 0) {
      rows.push([outlet?.name || '', batch.label, slot.date, st?.name || '', st?.startTime || '', st?.endTime || '', '(kosong)', ''])
    } else {
      bookings.forEach(b => {
        rows.push([outlet?.name || '', batch.label, slot.date, st?.name || '', st?.startTime || '', st?.endTime || '', b.driverName, new Date(b.timestamp).toLocaleString('id-ID')])
      })
    }
  })
  return rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
}
