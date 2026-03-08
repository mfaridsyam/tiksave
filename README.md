# 🎬 TikSave — TikTok Downloader Tanpa Watermark

Website download video TikTok tanpa watermark, gratis, dihosting di Vercel.

---

## 📁 Struktur Project

```
tiktok-downloader/
├── api/
│   └── download.js       ← Backend (Serverless Function)
├── public/
│   └── index.html        ← Frontend (UI website)
├── vercel.json           ← Konfigurasi Vercel
└── README.md
```

---

## 🚀 Cara Deploy ke Vercel (GRATIS)

### Langkah 1 — Buat Akun Vercel
- Buka https://vercel.com
- Daftar / login menggunakan akun GitHub

### Langkah 2 — Upload Project ke GitHub
1. Buka https://github.com/new
2. Buat repository baru (contoh: `tiksave`)
3. Upload semua file dari folder ini
   - Cara mudah: drag & drop semua file ke halaman GitHub

### Langkah 3 — Deploy di Vercel
1. Buka https://vercel.com/new
2. Klik **"Import Git Repository"**
3. Pilih repository GitHub yang baru dibuat
4. Klik **Deploy** — selesai! ✅

Vercel akan otomatis memberikan URL seperti:
`https://tiksave-namakamu.vercel.app`

---

## ⚙️ Cara Kerja

1. User tempel link TikTok di website
2. Frontend kirim request ke `/api/download`
3. Backend (Vercel Function) panggil API tikwm.com
4. API mengembalikan link video tanpa watermark
5. User klik tombol download

---

## 🆓 Gratis Selamanya?

**Vercel Free Tier** sudah lebih dari cukup untuk penggunaan pribadi:
- ✅ 100GB bandwidth/bulan
- ✅ Unlimited deployments
- ✅ Custom domain support
- ✅ HTTPS otomatis

---

## ⚠️ Catatan Penting

- Gunakan hanya untuk konten milik sendiri atau dengan izin kreator
- Hormati hak cipta kreator konten
- API yang digunakan (tikwm.com) adalah layanan pihak ketiga