// CSV template definitions and downloader

const TEMPLATES = {
  driver: {
    filename: 'template_import_driver.csv',
    content: `name,nip,whatsapp\nBudi Santoso,NIP001,628111222333\nCitra Dewi,NIP002,628222333444\nDodi Pratama,NIP003,628333444555`
  },
  shift: {
    filename: 'template_import_shift.csv',
    content: `name,startTime,endTime\nPagi,06:00,12:00\nSiang,12:00,18:00\nMalam,18:00,00:00\nDini Hari,00:00,06:00`
  },
  batch: {
    filename: 'template_import_batch.csv',
    content: `tanggal,nama_shift,kapasitas\n2025-06-29,Pagi,3\n2025-06-29,Siang,5\n2025-06-29,Malam,2\n2025-06-30,Pagi,3\n2025-06-30,Siang,4\n2025-06-30,Malam,2`
  }
}

export function downloadTemplate(type) {
  const tpl = TEMPLATES[type]
  if (!tpl) return
  const blob = new Blob([tpl.content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = tpl.filename
  a.click()
  URL.revokeObjectURL(url)
}
