# Planning Implementasi — Jeopardy Quiz

**Pendamping:** [PRD.md](PRD.md)
**Target pelaksana:** coding agent (Sonnet 5)
**Tanggal:** 14 September 2026

Dokumen ini memecah PRD menjadi urutan kerja yang dapat dieksekusi. Setiap fase punya definition of done yang dapat diverifikasi.

---

## 0. Kondisi Awal

Yang sudah ada di repo:

- Astro 7.3.2, template minimal, TypeScript strict
- Git sudah diinisialisasi
- `src/pages/index.astro` — halaman default bawaan Astro
- `npm run build` berjalan bersih

Yang belum ada: React, Tailwind, Framer Motion, dan seluruh kode game.

**Catatan lingkungan:** instalasi awal sempat gagal karena bug npm pada optional dependency (binding native rolldown tidak terpasang). Jika error `Cannot find native binding` muncul lagi setelah menambah dependensi, perbaikannya adalah menghapus `node_modules` dan `package-lock.json` lalu `npm install` ulang.

---

## 1. Prinsip Urutan Kerja

> **Kebenaran state dan interaksi lebih dulu, visual polish belakangan.**

Alasannya: aturan interaksi di PRD §4.2 adalah inti produk dan paling mudah rusak. Kalau animasi dikerjakan lebih dulu, setiap perbaikan state machine berarti mengulang penyetelan animasi.

Konsekuensi praktis: sampai akhir Fase 4, aplikasi akan terlihat polos. Itu disengaja dan bukan tanda ada yang salah.

---

## 2. Fase Pekerjaan

### Fase 1 — Fondasi & Tooling

**Tujuan:** dependensi terpasang, design token tersedia sebagai utility Tailwind, React island merender.

Langkah:

1. `npx astro add react` — integrasi React
2. `npx astro add tailwind` — Tailwind CSS
3. `npm install framer-motion`
4. `npm install @fontsource-variable/inter` — font lokal, **bukan** Google Fonts CDN (PRD §17: harus jalan offline)
5. Definisikan design token (PRD §16.2) sebagai CSS custom properties di `src/styles/global.css`, lalu daftarkan ke Tailwind theme
6. Buat `src/components/JeopardyGame.tsx` sebagai stub, mount di `index.astro` dengan `client:load`
7. Bersihkan boilerplate bawaan Astro dari `index.astro`

**Definition of done:**
- `npm run build` bersih
- `npm run dev` menampilkan stub React island
- Utility `bg-surface`, `text-primary`, `rounded-card` berfungsi
- Font Inter termuat dari paket lokal (verifikasi di Network tab: tidak ada request ke `fonts.googleapis.com`)

---

### Fase 2 — Model Domain & State Machine

**Tujuan:** seluruh logika game benar dan teruji, tanpa satu pun komponen UI.

Ini adalah fase paling penting. Kerjakan dengan teliti — semua fase berikutnya bergantung padanya.

Berkas:

| Berkas | Isi |
| --- | --- |
| `src/game/types.ts` | Tipe dari PRD §6.1 |
| `src/game/init.ts` | `createGameState(teamCount)` |
| `src/game/scoring.ts` | `computeScore()`, `computeRanking()` |
| `src/game/machine.ts` | Reducer + tipe action |
| `src/content/questions.json` | Isi permainan (judul, kategori, poin, kartu) |
| `src/content/pack.ts` | Memuat + memvalidasi JSON |
| `src/game/pack.ts` | Parser & validator pack |

Action yang harus didukung reducer:

```typescript
type GameAction =
  | { type: "START_GAME"; teamCount: number }
  | { type: "OPEN_CARD"; cardId: string }
  | { type: "REVEAL_ANSWER" }
  | { type: "SET_PENDING_AWARD"; teamId: string | null }
  | { type: "CLOSE_CARD" }
  | { type: "FINISH_GAME" }
  | { type: "RESET" };
```

Poin kritis:

- **`computeScore` harus derivatif** (PRD §12.3). Jangan pernah menulis `team.score += points`. Ini yang membuat "ganti pilihan tim" otomatis benar tanpa logika pembatalan.
- **Reducer harus menolak transisi ilegal** — kembalikan state tak berubah, jangan lempar exception. Contoh: `REVEAL_ANSWER` saat `activeCardState !== "question"` adalah no-op.
- `CLOSE_CARD` pada state `question` adalah **no-op** (PRD §10.1).
- `CLOSE_CARD` pada state `answer` meng-commit `pendingAward` → `awardedTeamId`, set `opened = true`, dan memicu `FINISHED` jika kartu terakhir.
- `FINISH_GAME` meng-commit active card **hanya** jika sedang di state `answer` (PRD §14.2).
- Placeholder pertanyaan harus jelas terbaca sebagai placeholder — misalnya `"[Pertanyaan 1 poin — Perjanjian Lama]"`, bukan pertanyaan Alkitab palsu yang bisa tak sengaja terpakai saat permainan sungguhan.

**Testing:** pasang Vitest dan tulis unit test untuk reducer dan scoring. Fase ini adalah logika murni tanpa DOM — justru paling murah untuk diuji sekarang, dan menangkap bug yang mahal ditemukan lewat klik manual.

Kasus uji minimum:

- Transisi legal berpindah state dengan benar
- Transisi ilegal tidak mengubah state
- `CLOSE_CARD` saat `question` tidak menutup apa pun
- Ganti pilihan tim memindahkan poin, tidak menggandakan
- Pilih tim lalu balik ke `null` mengembalikan skor ke semula
- Kartu ke-12 memicu status `finished`
- `FINISH_GAME` saat `answer` tetap meng-commit poin
- `FINISH_GAME` saat `question` tidak memberi poin
- Invariant §6.3 #6 bertahan setelah rangkaian action acak

**Definition of done:**
- Semua unit test lulus
- Tidak ada import dari `react` di dalam direktori `game/`

---

### Fase 3 — UI Fungsional (tanpa polish)

**Tujuan:** permainan dapat dimainkan penuh dari awal sampai akhir. Tampilan boleh polos.

Komponen, sesuai PRD §22.2. Bangun dengan HTML semantik sejak awal — `<button>` untuk kartu, bukan `<div onClick>`. Memperbaiki ini belakangan jauh lebih mahal.

Urutan:

1. `HomeScreen` + `TeamCountInput` + tombol Mulai
2. `JeopardyBoard` → `CategoryColumn` → `JeopardyCard`
3. `ScoreIndicator`
4. `ActiveCardOverlay` → `QuestionView` / `AnswerView` → `ScoreAssignment`
5. `FinishButton`
6. `ResultsScreen` → `WinnerSection` + `RankingList` + Main Lagi

Poin kritis:

- **Pemisahan handler single/double click (PRD §10.2).** Single click hanya pada kartu di board; double click hanya pada active card di modal. Elemen DOM-nya berbeda, jadi tidak pernah bertabrakan. **Jangan** pakai pola hitung-klik-dengan-`setTimeout`.
- **Jawaban render kondisional (PRD §11).** Bukan `display: none`. Verifikasi lewat Inspect Element bahwa teks jawaban benar-benar tidak ada di DOM saat state question.
- Klik di luar pada state question harus benar-benar tanpa respons — tanpa shake, tanpa kedip.

**Definition of done:**
- Satu permainan penuh dapat diselesaikan: home → 12 kartu → hasil
- Skor akhir benar dan cocok dengan invariant §6.3 #6
- Mengganti pilihan tim di dropdown memindahkan poin dengan benar
- Jawaban tidak ditemukan di DOM saat state question

---

### Fase 4 — Aksesibilitas & Keyboard

**Tujuan:** seluruh permainan dapat dijalankan dengan keyboard.

Cakupan sesuai PRD §21:

- Focus trap di dalam modal
- Kembalikan fokus ke kartu asal setelah modal ditutup
- Peta tombol keyboard (PRD §21.1) — perhatikan: `Escape` diabaikan di state question, tapi menutup di state answer
- `aria-live="polite"` untuk pengumuman perubahan skor
- Kartu yang sudah dimainkan: `aria-disabled` + keluar dari tab order
- `role="dialog"` + `aria-modal="true"` pada overlay
- Focus state terlihat, outline ≥ 2px

**Definition of done:**
- Permainan penuh selesai tanpa menyentuh mouse
- Fokus tidak pernah lolos dari modal saat aktif
- Fokus kembali ke posisi yang benar setelah kartu ditutup

---

### Fase 5 — Visual Design

**Tujuan:** terapkan design system PRD §16–18.

Cakupan: palet warna, tipografi berjenjang, desain kartu, layout board, styling overlay, layar hasil.

Poin kritis:

- Emas (`accent`) **hanya** untuk elemen pemenang
- Kartu 10 poin boleh terasa sedikit premium, tapi tingkat kesulitan **tidak boleh jelas secara visual** (PRD §18)
- Light mode saja — jangan implementasikan dark mode (PRD §16.3)
- Kontras WCAG AA — verifikasi, jangan asumsikan

**Definition of done:**
- Cocok dengan arah visual "soft, clean, elegant"
- Kontras teks lulus AA
- Tidak ada warna di luar palet PRD §16.1

---

### Fase 6 — Animasi

**Tujuan:** terapkan tujuh animasi PRD §19.1.

Urutan pengerjaan, dari paling sederhana:

1. Card hover (CSS saja — jangan pakai Framer Motion untuk ini, PRD tidak menghendaki dependensi berlebih untuk hover)
2. Background dim
3. Card expand ke modal
4. Score update dengan delta — ingat kasus delta negatif saat ganti pilihan tim (PRD §8.1)
5. Card flip — pergantian konten tepat di titik 90° (PRD §19.2)
6. Winner reveal
7. Confetti

**`prefers-reduced-motion` bukan pekerjaan terakhir.** Tangani bersamaan dengan setiap animasi, bukan sebagai penambahan di akhir — menambal belakangan cenderung meninggalkan celah.

**Definition of done:**
- Ketujuh animasi berjalan sesuai durasi PRD §19.1
- Jawaban tidak terbaca sebelum flip melewati 90°
- Dengan `prefers-reduced-motion` aktif: confetti tidak muncul, flip jadi cross-fade, semua durasi ≤ 150ms

---

### Fase 7 — Responsive & Touch

**Tujuan:** berfungsi di desktop, tablet, dan mobile.

Cakupan PRD §20:

- Layout 3 kolom → bertumpuk pada mobile
- Modal selalu muat dalam viewport; isi boleh scroll, modal tidak boleh melampaui tinggi layar
- Tombol reveal eksplisit pada `pointer: coarse` (PRD §20.1) — tombol ini tidak boleh muncul di desktop

**Definition of done:**
- Permainan penuh dapat diselesaikan di viewport 375px
- Permainan penuh dapat diselesaikan pada perangkat sentuh
- Tombol reveal sentuh tidak terlihat pada desktop

---

### Fase 8 — Verifikasi Akhir

Jalankan seluruh acceptance criteria PRD §25 secara manual.

Perhatian khusus pada batas kasus yang mudah terlewat:

- Semua tim berskor 0 → layar netral tanpa pemenang dan tanpa confetti (PRD §15.3)
- Semua tim seri dengan skor > 0 → semua dapat trophy
- Selesai ditekan saat state answer → poin tetap ter-commit
- Selesai ditekan saat state question → tidak ada poin diberikan
- Ganti pilihan tim berkali-kali → skor tetap konsisten
- 10 tim → score indicator tetap terbaca

**Definition of done:**
- Semua checkbox PRD §25 terpenuhi
- `npm run build` bersih
- Semua unit test lulus

---

## 3. Ringkasan Dependensi

| Paket | Alasan |
| --- | --- |
| `@astrojs/react` | Integrasi React island |
| `react`, `react-dom` | UI runtime |
| `@astrojs/tailwind` + `tailwindcss` | Styling |
| `framer-motion` | Card expand, flip, winner reveal |
| `@fontsource-variable/inter` | Font lokal (wajib offline-capable) |
| `vitest` | Unit test logika game |

Library confetti dipilih saat Fase 6 — pilih yang ringan, atau implementasikan dengan Framer Motion jika memadai. Jangan tambahkan dependensi berat hanya untuk confetti.

---

## 4. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Single/double click bertabrakan | Interaksi inti rusak | Pisahkan berdasarkan elemen DOM, bukan timer (PRD §10.2) |
| Skor diakumulasi imperatif | Poin ganda saat ganti pilihan tim | `computeScore` derivatif, uji di Fase 2 |
| Jawaban bocor di DOM | Pemain bisa Ctrl+F jawabannya | Render kondisional, verifikasi manual |
| Flip terlalu cepat, jawaban terbaca dini | Merusak permainan | Ganti konten tepat di titik 90° |
| Aksesibilitas ditunda ke akhir | Perlu refactor komponen | HTML semantik sejak Fase 3 |
| Bug npm optional dependency | Build gagal | Hapus `node_modules` + lockfile, install ulang |
| Refresh browser mereset permainan | Permainan hilang di tengah jalan | Diterima untuk MVP; `sessionStorage` sebagai penambahan nanti |

---

## 5. Yang Sengaja Ditunda

Bukan bagian MVP, tapi struktur data sudah mengakomodasi:

| Fitur | Kesiapan |
| --- | --- |
| Nama tim kustom | `Team.name` sudah string bebas |
| Persistensi sesi | Cukup serialisasi `GameState` ke `sessionStorage` |
| Bank soal lebih banyak | `questions.json` sudah terpisah dari UI |
| Gambar pada pertanyaan | `image?` + `imageAlt?` sudah ada di tipe |
| Sound effects | Belum ada penopang; butuh perancangan tersendiri |
| Timer pertanyaan | Belum ada penopang; akan mengubah state machine |

---

## 6. Catatan untuk Pelaksana

Delapan hal dari PRD §26 yang **tidak boleh** diinterpretasikan ulang:

1. Single click → buka. Double click → reveal. Click di luar → hanya menutup setelah reveal.
2. Skor **derivatif** dari `cards`, bukan akumulasi imperatif.
3. Jawaban **tidak ada di DOM** sebelum state answer.
4. **Tanpa tie-breaker** — semua tim tertinggi menang.
5. **Tanpa hint tekstual** untuk interaksi.
6. Kartu yang sudah dimainkan **tetap di grid**.
7. Konten pertanyaan **terpisah** dari UI.
8. **Kebenaran state lebih dulu**, visual polish belakangan.

Jika menemukan ambiguitas dalam PRD yang tidak terjawab oleh dokumen ini, **tanyakan** — jangan pilih tafsir sendiri. Aturan interaksi di §4.2 sangat spesifik justru karena tafsir yang berbeda menghasilkan permainan yang terasa rusak bagi moderator.
