// seed.js - Jalankan sekali untuk setup awal database
// Cara pakai: node seed.js

const { initializeApp } = require('firebase/app')
const { getFirestore, setDoc, doc } = require('firebase/firestore')

// GANTI dengan config Firebase kamu
const firebaseConfig = {
  apiKey: "GANTI_API_KEY",
  authDomain: "GANTI.firebaseapp.com",
  projectId: "GANTI_PROJECT_ID",
  storageBucket: "GANTI.appspot.com",
  messagingSenderId: "GANTI_SENDER_ID",
  appId: "GANTI_APP_ID"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function seed() {
  console.log('🌱 Seeding database...')

  // Buat akun SPV
  await setDoc(doc(db, 'spv', 'SPV001'), {
    username: 'admin',
    password: 'admin123',
    createdAt: new Date()
  })
  console.log('✅ SPV dibuat: username=admin password=admin123')

  // Buat 3 outlet
  const outlets = [
    { id: 'OTL001', name: 'Outlet Utara' },
    { id: 'OTL002', name: 'Outlet Selatan' },
    { id: 'OTL003', name: 'Outlet Timur' },
  ]
  for (const o of outlets) {
    await setDoc(doc(db, 'outlets', o.id), { name: o.name, createdAt: new Date() })
    console.log(`✅ Outlet dibuat: ${o.name}`)
  }

  // Buat shift types untuk tiap outlet
  const shifts = [
    { name: 'Pagi', startTime: '06:00', endTime: '12:00' },
    { name: 'Siang', startTime: '12:00', endTime: '18:00' },
    { name: 'Malam', startTime: '18:00', endTime: '00:00' },
    { name: 'Dini Hari', startTime: '00:00', endTime: '06:00' },
  ]
  for (const outlet of outlets) {
    for (let i = 0; i < shifts.length; i++) {
      const id = `SHT_${outlet.id}_${i}`
      await setDoc(doc(db, 'shiftTypes', id), { ...shifts[i], outletId: outlet.id })
    }
    console.log(`✅ Shift types dibuat untuk ${outlet.name}`)
  }

  console.log('\n🎉 Seeding selesai!')
  console.log('\nLogin SPV:')
  console.log('  Username: admin')
  console.log('  Password: admin123')
  console.log('\nSelanjutnya tambahkan driver melalui panel SPV.')
  process.exit(0)
}

seed().catch(err => {
  console.error('❌ Error:', err)
  process.exit(1)
})
