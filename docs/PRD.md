# PRD — Bible Jeopardy

**Status:** Draft final untuk implementasi
**Versi:** 1.0
**Tanggal:** 14 September 2026
**Stack:** Astro + React island + Tailwind CSS + Framer Motion
**Backend:** Tidak ada (client-side only)

---

## 1. Product Overview

**Bible Jeopardy** adalah web-based quiz game bergaya Jeopardy yang dioperasikan oleh seorang **moderator** untuk memainkan kuis Alkitab bersama beberapa tim.

Game terdiri dari **12 kartu pertanyaan** dalam 3 kategori:

| Kategori | Slug | Isi |
| --- | --- | --- |
| Perjanjian Lama | `old_testament` | Tokoh-tokoh dari Perjanjian Lama |
| Perjanjian Baru | `new_testament` | Tokoh-tokoh dari Perjanjian Baru |
| Tokoh Rasul | `apostle` | Tokoh-tokoh rasul |

Setiap kategori memiliki 4 kartu bernilai **1 poin → 3 poin → 5 poin → 10 poin**. Semakin besar nilai poin, semakin sulit pertanyaannya atau semakin tidak dikenal tokohnya.

Aplikasi **tidak membutuhkan backend maupun authentication**. Seluruh game state dikelola client-side.

### 1.1 Model penggunaan

Game ini dimainkan pada **satu layar tunggal** (laptop moderator, atau laptop yang tersambung ke proyektor/TV). Moderator dan pemain melihat layar yang sama. Tidak ada sinkronisasi antar-device.

Implikasi penting: **tidak ada informasi rahasia di layar.** Jawaban disembunyikan lewat state machine, bukan lewat pemisahan tampilan moderator dan pemain.

---

## 2. Product Goals

### Primary Goals

1. Menyediakan permainan Bible Jeopardy yang sederhana dan mudah dioperasikan moderator.
2. Membuat pengalaman bermain terasa seperti game show, dengan nuansa visual yang soft dan elegan.
3. Memudahkan moderator membuka kartu, menampilkan pertanyaan, reveal jawaban, dan memberikan poin.
4. Menampilkan ranking akhir dengan visual yang menyenangkan.

### Non-Goals

Untuk MVP, aplikasi **tidak** perlu:

- Login / register / user account
- Database persistence
- Online multiplayer antar-device
- Timer pertanyaan
- Chat
- Leaderboard global
- Sound effects
- Animasi berlebihan
- Buzzer elektronik (pemain menjawab secara verbal, moderator menilai)

---

## 3. Target User

### 3.1 Moderator (primary user)

Orang yang mengendalikan seluruh permainan. Moderator dapat:

- Menentukan jumlah tim
- Memulai game
- Membuka kartu
- Melihat pertanyaan
- Reveal jawaban
- Memberikan poin kepada tim
- Menandai tidak ada yang menjawab
- Mengakhiri game kapan saja

### 3.2 Pemain / Tim (passive viewer)

Pemain mengikuti game dan melihat board, pertanyaan, jawaban, score sementara, dan ranking akhir. **Tidak ada interaksi dari sisi pemain pada MVP.**

---

## 4. Game Rules

### 4.1 Board

```text
┌────────────────────┬────────────────────┬────────────────────┐
│   PERJANJIAN LAMA  │   PERJANJIAN BARU  │    TOKOH RASUL     │
├────────────────────┼────────────────────┼────────────────────┤
│         1          │         1          │         1          │
├────────────────────┼────────────────────┼────────────────────┤
│         3          │         3          │         3          │
├────────────────────┼────────────────────┼────────────────────┤
│         5          │         5          │         5          │
├────────────────────┼────────────────────┼────────────────────┤
│        10          │        10          │        10          │
└────────────────────┴────────────────────┴────────────────────┘
```

**3 kategori × 4 kartu = 12 kartu.** Setiap kartu hanya dapat dimainkan **satu kali**.

### 4.2 Aturan interaksi inti

Tiga aturan ini adalah inti dari produk dan **tidak boleh diinterpretasikan ulang**:

> 1. **Single click** pada kartu tertutup → buka pertanyaan.
> 2. **Double click** pada active card → reveal jawaban.
> 3. **Click di luar card** → hanya menutup card **setelah** jawaban di-reveal.

Ditambah: **"Selesai"** adalah kontrol moderator yang dapat mengakhiri game kapan saja, sedangkan menyelesaikan seluruh 12 kartu mengakhiri game secara otomatis.

---

## 5. Home Screen

### 5.1 Komponen

**Title:** `Bible Jeopardy`
**Subtitle (opsional):** `Uji pengetahuanmu tentang Alkitab`

**Team Count Input** — stepper dengan tombol `[-]` dan `[+]`:

```text
Jumlah Tim

[ − ]   2   [ + ]
```

| Properti | Nilai |
| --- | --- |
| Minimum | 2 |
| Maximum | 10 |
| Default | 2 |

Tombol `−` disabled saat nilai 2. Tombol `+` disabled saat nilai 10. Disabled state harus terlihat jelas (opacity turun + `cursor: not-allowed` + `aria-disabled`).

**Start Button:** `Mulai`

Ketika ditekan:

1. Validasi jumlah tim (2–10).
2. Generate game state — 12 kartu, semua `opened: false`; N tim dengan `score: 0`.
3. Transisi ke game board.

Tidak ada confirmation dialog.

### 5.2 Nama tim

Nama tim di-generate otomatis: `Tim 1`, `Tim 2`, `Tim 3`, … `Tim N`.

Input nama tim kustom **tidak termasuk MVP.** Struktur data `Team.name` sudah berupa string bebas, jadi fitur ini bisa ditambahkan nanti tanpa mengubah skema.

---

## 6. Game State

### 6.1 Tipe data

```typescript
type CategorySlug = "old_testament" | "new_testament" | "apostle";
type CardPoints = 1 | 3 | 5 | 10;
type ActiveCardState = "question" | "answer";
type GameStatus = "home" | "playing" | "finished";

interface Team {
  id: string;        // "team-1", "team-2", ...
  name: string;      // "Tim 1", "Tim 2", ...
  score: number;     // selalu >= 0 pada MVP
}

interface JeopardyCard {
  id: string;              // "ot-1", "nt-2", "ap-5", ...
  category: CategorySlug;
  points: CardPoints;
  question: string;
  image?: string;          // opsional, path relatif ke /public
  imageAlt?: string;       // wajib diisi jika `image` ada
  answer: string;
  opened: boolean;         // true setelah kartu selesai dimainkan
  awardedTeamId: string | null;  // tim penerima poin, null = tidak ada yang menjawab
}

interface GameState {
  status: GameStatus;
  teams: Team[];
  cards: JeopardyCard[];
  activeCardId: string | null;
  activeCardState: ActiveCardState | null;  // null saat tidak ada active card
  pendingAward: string | null;              // pilihan dropdown sebelum di-commit
}
```

### 6.2 Catatan perubahan dari draft awal

Tiga penyesuaian terhadap draft awal, masing-masing dengan alasan:

**a. `scores` dihapus, skor disimpan di `Team.score`.**
Draft awal punya `scores: Record<string, number>` **dan** `Team.score` — dua sumber kebenaran untuk data yang sama, yang pasti akan desinkron. Satu sumber saja: `Team.score`.

**b. `activeCardState: "closed"` dihapus.**
"Closed" bukan state dari *active card* — itu berarti *tidak ada* active card. Direpresentasikan sebagai `activeCardId === null`. Menyimpan `"closed"` sebagai nilai `activeCardState` menciptakan state ganda yang ambigu (`activeCardId` terisi tapi state `"closed"`).

**c. `awardedTeamId` dan `pendingAward` ditambahkan.**
Draft awal tidak mencatat siapa yang mendapat poin dari kartu mana. Ini dibutuhkan untuk mencegah double-award (lihat §12.3) dan berguna untuk debugging.

### 6.3 Invariant

Kondisi berikut harus selalu benar. Pelanggaran = bug.

1. `cards.length === 12` sepanjang permainan.
2. Setiap kombinasi (`category`, `points`) muncul tepat satu kali.
3. `activeCardId !== null` ⟺ `activeCardState !== null`.
4. Jika `activeCardId !== null`, kartu tersebut punya `opened === false`.
5. Kartu dengan `opened === true` tidak bisa menjadi `activeCardId`.
6. Jumlah total skor semua tim = jumlah `points` dari semua kartu yang `opened === true` **dan** `awardedTeamId !== null`.
7. `status === "finished"` bersifat terminal — tidak ada transisi keluar kecuali reload / main baru.

Invariant #6 adalah pemeriksaan integritas yang paling berguna: kalau ini gagal, ada poin yang bocor atau hilang.

---

## 7. Game Board

### 7.1 Layout desktop

```text
┌─────────────────────────────────────────────────────────────┐
│ SCORE                                                       │
│ Tim 1  7    Tim 2  5    Tim 3  2    Tim 4  0                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                      Bible Jeopardy                         │
│                                                             │
│     PERJANJIAN         PERJANJIAN          TOKOH            │
│        LAMA               BARU             RASUL            │
│                                                             │
│      ┌───────┐         ┌───────┐         ┌───────┐          │
│      │   1   │         │   1   │         │   1   │          │
│      └───────┘         └───────┘         └───────┘          │
│                                                             │
│      ┌───────┐         ┌───────┐         ┌───────┐          │
│      │   2   │         │   2   │         │   2   │          │
│      └───────┘         └───────┘         └───────┘          │
│                                                             │
│      ┌───────┐         ┌───────┐         ┌───────┐          │
│      │   5   │         │   5   │         │   5   │          │
│      └───────┘         └───────┘         └───────┘          │
│                                                             │
│                                              [ Selesai ]    │
└─────────────────────────────────────────────────────────────┘
```

Urutan kartu dalam kolom selalu 1 → 2 → 5 dari atas ke bawah.

---

## 8. Score Indicator

Score sementara **selalu terlihat** selama `status === "playing"`, ditempatkan di **ujung kiri atas halaman**.

Persyaratan:

- Compact — tidak mengambil ruang vertikal berlebihan
- Tidak mengganggu board
- Menampilkan nama tim dan skor
- Update segera setelah poin diberikan
- Pada mobile: boleh menjadi baris yang dapat di-scroll horizontal jika tim banyak

### 8.1 Animasi skor

Ketika skor berubah, tampilkan transisi singkat: angka lama → delta → angka baru.

```text
7  →  +2  →  9
```

Durasi total ≤ 600ms. Delta (`+2`) muncul sebentar lalu memudar. Tidak perlu mencolok.

**Batas kasus:** jika moderator mengganti pilihan tim (lihat §12.3), dua tim berubah skor bersamaan — satu berkurang, satu bertambah. Animasi harus menangani delta negatif (`−2`) dengan warna berbeda (muted, bukan merah menyala).

---

## 9. Jeopardy Card — Tampilan Board

Kartu tertutup **hanya** menampilkan nilai poinnya (`1`, `2`, atau `5`). Tidak ada bocoran pertanyaan atau jawaban.

### 9.1 Hover (desktop)

- `scale(1.03)`
- Shadow sedikit menguat
- `cursor: pointer`
- Transisi background halus

### 9.2 Kartu yang sudah dimainkan

- Opacity berkurang (± 40%)
- Hover interaction dimatikan
- `cursor: default`
- **Tetap menempati posisi di grid** — jangan hapus dari layout, karena akan mengubah struktur board
- Tandai dengan checkmark `✓` atau tampilan muted
- `aria-disabled="true"`, dan dikeluarkan dari tab order (`tabindex="-1"`)

---

## 10. Interaction State Machine

Ini adalah bagian paling kritis dari spesifikasi. Implementasikan sebagai state machine eksplisit, bukan sebagai kumpulan boolean flag.

```text
                    ┌───────────────────┐
                    │   BOARD (idle)    │
                    │ activeCardId=null │
                    └─────────┬─────────┘
                              │
                     single click kartu
                     (opened === false)
                              ↓
                    ┌───────────────────┐
         ┌─────────▶│     QUESTION      │
         │          └─────────┬─────────┘
         │                    │
         │            double click card
   click outside              ↓
   → DIABAIKAN      ┌───────────────────┐
   Escape           │      ANSWER       │
   → DIABAIKAN      │ + score dropdown  │
         │          └─────────┬─────────┘
         └────────────────────┤
                              │
                       click outside
                              ↓
                    ┌───────────────────┐
                    │  COMMIT & CLOSE   │
                    │  opened = true    │
                    │  skor final       │
                    └─────────┬─────────┘
                              ↓
                    ┌───────────────────┐
                    │   BOARD (idle)    │
                    │   atau FINISHED   │
                    │ jika 12/12 selesai│
                    └───────────────────┘
```

### 10.1 Tabel transisi

| State saat ini | Aksi | State berikutnya | Efek samping |
| --- | --- | --- | --- |
| BOARD | Single click kartu `opened === false` | QUESTION | `activeCardId` diset, `pendingAward = null` |
| BOARD | Single click kartu `opened === true` | BOARD | Tidak ada (no-op) |
| QUESTION | Double click active card | ANSWER | — |
| QUESTION | Click di luar card | QUESTION | **Tidak ada — diabaikan** |
| QUESTION | Tekan Escape | QUESTION | **Tidak ada — diabaikan** |
| ANSWER | Pilih tim di dropdown | ANSWER | `pendingAward` diperbarui, skor preview diperbarui |
| ANSWER | Click di luar card | BOARD / FINISHED | Commit skor, `opened = true` |
| ANSWER | Tekan Escape | BOARD / FINISHED | Commit skor, `opened = true` |
| Any | Click "Selesai" | FINISHED | Commit active card jika ada di state ANSWER |

**Catatan Escape:** Draft awal menyatakan Escape tidak boleh menutup question card. Itu dipertahankan. Namun pada state ANSWER, Escape **diizinkan** menutup — karena pada titik itu penutupan memang sudah diperbolehkan, dan memblokir Escape di sana justru melanggar ekspektasi keyboard user tanpa memberi manfaat apa pun.

### 10.2 Konflik single-click vs double-click

**Masalah:** Double click juga menghasilkan dua event single click. Jika handler single click dan double click dipasang pada elemen yang sama, akan terjadi perilaku tak terduga.

**Solusi:** Pisahkan target event berdasarkan state.

- Single click handler **hanya** ada pada kartu di board (state BOARD).
- Double click handler **hanya** ada pada active card di modal (state QUESTION).

Kedua elemen ini berbeda secara DOM, jadi tidak pernah bertabrakan. Tidak perlu timer/debounce.

**Larangan:** Jangan gunakan pola "hitung klik dengan `setTimeout`" untuk membedakan single dan double click. Pola itu menambah latensi terasa pada pembukaan kartu dan rapuh.

### 10.3 Guard terhadap klik ganda tak sengaja

- Selama animasi expand kartu berlangsung, abaikan click tambahan pada kartu lain.
- Double click pada state ANSWER tidak melakukan apa-apa (bukan menutup card).
- Setelah commit, `activeCardId` harus diset `null` **sebelum** kartu apa pun bisa dibuka lagi.

---

## 11. Question State

Active card menampilkan:

**Point badge:** `2 POIN`

**Pertanyaan:**

```text
Siapakah tokoh yang membangun bahtera
sebelum datangnya air bah?
```

**Gambar (opsional):** Jika `card.image` ada, tampilkan dengan sudut membulat. Jika tidak ada, layout modal harus tetap terlihat baik — **jangan** sisakan ruang kosong tempat gambar seharusnya berada.

Jawaban **tidak boleh ada di DOM** pada state ini. Menyembunyikan dengan CSS (`display: none`, `visibility: hidden`, `opacity: 0`) tidak cukup — teks jawaban bisa terlihat lewat Inspect Element, Ctrl+F, atau screen reader. Render jawaban secara kondisional hanya setelah masuk state ANSWER.

Ini satu-satunya pengecualian dari §1.1 (tidak ada informasi rahasia): jawaban rahasia untuk sesaat, dan penyembunyiannya harus nyata.

### 11.1 Overlay

- Background overlay: lapisan gelap translusen (± `rgba(23, 63, 53, 0.55)`)
- Board tetap terlihat di belakang overlay — moderator mempertahankan konteks
- Card membesar ke arah tengah
- Shadow lebih kuat, sudut membulat, whitespace lega

---

## 12. Answer State & Score Assignment

### 12.1 Tampilan

```text
┌──────────────────────────────────┐
│                                  │
│             JAWABAN              │
│                                  │
│              Nuh                 │  ← bold
│                                  │
│  Berikan poin kepada:            │
│                                  │
│  [ Tidak ada yang menjawab  ▼ ]  │
│                                  │
└──────────────────────────────────┘
```

Jawaban ditampilkan **bold**. Kontrol score assignment muncul bersamaan.

### 12.2 Dropdown

Opsi, dalam urutan ini:

```text
Tidak ada yang menjawab   ← default, terpilih saat masuk state ANSWER
Tim 1
Tim 2
Tim 3
...
Tim N
```

Default `Tidak ada yang menjawab` mencegah moderator memberi poin secara tidak sengaja.

Dropdown harus punya `aria-label` yang jelas, contoh: `"Berikan 2 poin kepada"`.

### 12.3 Kapan skor di-commit

Draft awal berisi dua pernyataan yang bertabrakan: "score langsung diperbarui" saat dipilih, tapi juga "score assignment should be committed before the card is considered completed". Keduanya tidak bisa benar bersamaan jika moderator mengganti pilihan.

**Aturan yang berlaku:**

Skor yang ditampilkan di score indicator **memperbarui secara langsung** setiap kali pilihan dropdown berubah — ini adalah *preview* yang reaktif, agar moderator melihat hasilnya seketika.

Secara internal, nilai tersimpan di `pendingAward`. Kartu **belum** `opened`.

Ketika card ditutup (click outside / Escape / tombol Selesai), `pendingAward` di-commit ke `awardedTeamId`, dan `opened` menjadi `true`.

**Konsekuensi penting — mengganti pilihan:** Jika moderator memilih Tim 1, lalu berubah pikiran dan memilih Tim 2, maka Tim 1 harus kehilangan poin tersebut dan Tim 2 mendapatkannya. Perhitungan skor untuk kartu aktif harus bersifat *replace*, bukan *accumulate*.

Cara paling aman mengimplementasikan ini: **hitung skor sebagai turunan (derived), bukan sebagai akumulasi.**

```typescript
function computeScore(teamId: string, state: GameState): number {
  // Poin dari kartu yang sudah selesai
  const committed = state.cards
    .filter(c => c.opened && c.awardedTeamId === teamId)
    .reduce((sum, c) => sum + c.points, 0);

  // Poin preview dari kartu aktif yang belum di-commit
  const activeCard = state.cards.find(c => c.id === state.activeCardId);
  const pending =
    activeCard && state.pendingAward === teamId ? activeCard.points : 0;

  return committed + pending;
}
```

Dengan pendekatan ini, mengganti pilihan otomatis benar tanpa logika pembatalan khusus, dan invariant §6.3 #6 mustahil dilanggar. **Jangan** menulis `team.score += points` secara imperatif.

### 12.4 Satu kartu, satu kali poin

Sebuah kartu hanya boleh memberi poin satu kali. Karena skor dihitung sebagai turunan dari `cards`, properti ini otomatis terjamin — tidak perlu guard tambahan.

---

## 13. Penutupan Card & Penyelesaian

### 13.1 Aturan UX

| State | Click di luar card |
| --- | --- |
| QUESTION | **Tidak terjadi apa-apa** |
| ANSWER | Card ditutup |

**Dilarang menampilkan:** toast, hint, tooltip, atau teks seperti `"Klik di luar untuk menutup"` / `"Double click untuk reveal"`. Interaksi harus terasa natural, dan moderator akan mempelajarinya dalam satu kartu pertama.

Pada state QUESTION, klik di luar tidak boleh memberi umpan balik visual apa pun — tanpa getaran, tanpa kedipan, tanpa efek shake. Benar-benar tidak ada respons.

### 13.2 Setelah ditutup

- `opened = true`
- `awardedTeamId` di-commit dari `pendingAward`
- `activeCardId = null`, `activeCardState = null`, `pendingAward = null`
- Kartu tidak dapat dimainkan kembali
- Fokus keyboard kembali ke kartu yang baru saja ditutup di board (lihat §17)

---

## 14. Penyelesaian Game

### 14.1 Kondisi A — Semua kartu selesai

Ketika kartu ke-12 di-commit, `status` otomatis menjadi `"finished"`.

Transisi ke layar hasil terjadi setelah animasi penutupan kartu selesai (± 300ms), bukan seketika — agar tidak terasa mendadak.

### 14.2 Kondisi B — Moderator menekan "Selesai"

Tombol `Selesai` di **kanan bawah**, terlihat selama `status === "playing"`.

Ketika ditekan, game langsung selesai. Tidak ada confirmation modal untuk MVP.

**Batas kasus:** jika ditekan saat ada active card di state ANSWER dengan `pendingAward` terisi, poin tersebut **tetap di-commit** sebelum pindah ke layar hasil. Moderator sudah menyatakan niatnya; membuang pilihan itu akan mengejutkan.

Jika ditekan saat state QUESTION (jawaban belum di-reveal), kartu tersebut **tidak** memberi poin kepada siapa pun dan tetap dihitung belum dimainkan.

---

## 15. Finished State — Final Ranking

Tim diurutkan berdasarkan skor tertinggi.

```text
              FINAL RANKING

                    🏆
                 ✦ WINNER ✦

                  Tim 3
                    12

              ─────────────

          Tim 1              Tim 2
             9                  7
```

### 15.1 Winner treatment

Tim dengan skor tertinggi mendapat perlakuan visual paling menonjol:

- Nama dan angka lebih besar
- Card lebih besar, posisi paling prominent
- Trophy icon
- Glow / shadow lembut dengan warna `accent` (emas)
- Subtle entrance animation
- Confetti sekali jalan

Gaya animasi: **fun tapi tetap soft** — bukan visual arcade yang agresif.

### 15.2 Seri (ties)

Jika beberapa tim berbagi skor tertinggi, **semuanya** dianggap pemenang:

```text
              WINNERS

        🏆 Tim 1        🏆 Tim 2
            10              10

                Tim 3
                  7
```

**Jangan terapkan tie-breaker apa pun.** Jangan menetapkan juara 1/2/3 secara artifisial di antara tim yang seri.

Untuk tim non-pemenang yang seri, tampilkan pada peringkat yang sama (ranking kompetisi standar: 1, 1, 3 — bukan 1, 2, 3).

### 15.3 Batas kasus

**Semua tim berskor 0** (misalnya moderator langsung menekan Selesai): semua tim seri di posisi teratas. Menampilkan 10 trophy terasa aneh. Dalam kasus ini tampilkan layar netral — daftar tim tanpa winner treatment dan tanpa confetti, dengan judul `Tidak ada pemenang`. Ini satu-satunya pengecualian dari aturan §15.2.

**Semua tim seri dengan skor > 0:** aturan §15.2 berlaku normal — semua dapat trophy.

### 15.4 Aksi setelah selesai

Sediakan satu tombol: `Main Lagi` — mereset state ke Home. Tidak ada konfirmasi.

---

## 16. Design System

Arah visual:

> **Soft, clean, elegant Bible-themed game show**

Hindari warna terlalu jenuh atau neon.

### 16.1 Palet warna

| Token | Hex | Penggunaan |
| --- | --- | --- |
| `background` | `#F7F9FC` | Background utama |
| `surface` | `#FFFFFF` | Kartu |
| `primary` | `#1B2A63` | Biru tua |
| `primary-soft` | `#E6ECF8` | Background biru lembut |
| `secondary` | `#2F6F9F` | Biru sedang |
| `secondary-soft` | `#E3F1F9` | Biru lembut |
| `text` | `#1C2438` | Teks utama |
| `text-muted` | `#6B7488` | Teks sekunder |
| `border` | `#D8E0EE` | Garis tepi |
| `accent` | `#C6A15B` | Trophy / highlight |

Emas (`accent`) hanya untuk elemen terkait pemenang. Jangan dipakai sebagai warna aksen umum.

### 16.2 Design tokens

```typescript
const theme = {
  colors: {
    background: "#F7F9FC",
    surface: "#FFFFFF",
    primary: "#1B2A63",
    primarySoft: "#E6ECF8",
    secondary: "#2F6F9F",
    secondarySoft: "#E3F1F9",
    text: "#1C2438",
    textMuted: "#6B7488",
    border: "#D8E0EE",
    accent: "#C6A15B",
  },
  radius: {
    card: "16px",
    button: "12px",
    pill: "999px",
  },
};
```

Definisikan sebagai CSS custom properties dan daftarkan ke Tailwind theme, sehingga tersedia sebagai utility class (`bg-surface`, `text-primary`, `rounded-card`).

### 16.3 Tema

Aplikasi ini **light-mode saja**. Palet di atas adalah satu-satunya tema. Jangan implementasikan dark mode — akan dimainkan di ruangan terang lewat proyektor, dan menambah tema kedua menggandakan pekerjaan desain tanpa manfaat.

---

## 17. Typography

Font: **Inter** (alternatif: **Plus Jakarta Sans**). Hindari font dekoratif.

Muat via `@fontsource` atau font lokal, **bukan** Google Fonts CDN — agar game tetap berfungsi tanpa koneksi internet. Ini penting: game sering dimainkan di aula gereja dengan Wi-Fi tidak dapat diandalkan.

| Elemen | Ukuran | Berat |
| --- | --- | --- |
| Page Title | 32–40px | bold |
| Section Title | 20–24px | semibold |
| Card Points | 32–48px | bold |
| Question | 24–32px | medium |
| Answer | 28–36px | bold |
| Body | 16px | regular |

---

## 18. Card Design

Kartu normal:

```css
background: var(--surface);
border: 1px solid var(--border);
border-radius: 16px;
box-shadow: 0 1px 3px rgb(23 63 53 / 0.08);
```

Nilai poin menggunakan warna `primary` atau `secondary`.

Kartu 10 poin boleh terasa sedikit lebih *premium* secara halus, **tetapi jangan sampai tingkat kesulitan menjadi jelas secara visual**. Perbedaannya harus sangat halus — misalnya border sedikit lebih hangat, bukan ukuran atau warna yang berbeda mencolok.

---

## 19. Animasi

Filosofi:

> **Elegan dan playful, bukan mencolok.**

### 19.1 Daftar animasi

| # | Animasi | Durasi | Easing |
| --- | --- | --- | --- |
| 1 | Card hover | 150ms | ease-out |
| 2 | Card expand ke modal | 250–400ms | ease-out |
| 3 | Background dim | 250ms | ease-out |
| 4 | Card flip (reveal) | 500–700ms | ease-in-out |
| 5 | Score update | ≤ 600ms | ease-out |
| 6 | Winner reveal | 400ms | ease-out |
| 7 | Confetti | sekali jalan | — |

Gunakan `scale`, `opacity`, dan pergerakan vertikal ringan. **Hindari bouncing dramatis.**

### 19.2 Card flip

```text
Question Card → rotateY(90°) → [ganti konten] → rotateY(0°) → Answer Card
```

Jawaban baru boleh terlihat setelah flip melewati titik 90° — jangan sampai terbaca sebelum kartu berbalik. Karena jawaban di-render kondisional (§11), pergantian konten dilakukan tepat di titik tengah animasi.

### 19.3 `prefers-reduced-motion`

Wajib dihormati. Ketika aktif:

- Flip 3D → cross-fade opacity sederhana
- Card expand → fade in tanpa scale
- Confetti → **tidak ditampilkan sama sekali**
- Score update → langsung ke angka baru, tanpa animasi delta
- Semua durasi dipersingkat ke ≤ 150ms

---

## 20. Responsive Design

Target: desktop, laptop, tablet, mobile.

| Breakpoint | Layout |
| --- | --- |
| Desktop (≥ 1024px) | 3 kolom penuh |
| Tablet (768–1023px) | Tetap 3 kolom, kartu lebih kecil |
| Mobile (< 768px) | Vertikal — kategori bertumpuk |

Layout mobile:

```text
PERJANJIAN LAMA
┌─────────┐  ┌─────────┐  ┌─────────┐
│    1    │  │    2    │  │    5    │
└─────────┘  └─────────┘  └─────────┘

PERJANJIAN BARU
┌─────────┐  ┌─────────┐  ┌─────────┐
│    1    │  │    2    │  │    5    │
└─────────┘  └─────────┘  └─────────┘

TOKOH RASUL
...
```

Active card / modal **harus selalu muat dalam viewport**. Jika konten pertanyaan panjang atau ada gambar, isi modal boleh di-scroll — tapi modal itu sendiri tidak boleh melampaui tinggi layar.

### 20.1 Double click pada perangkat sentuh

Double click adalah interaksi mouse. Pada touch device, `dblclick` memang ada tapi tidak reliabel dan mudah terpicu tanpa sengaja.

**Solusi:** pada layar sentuh (`pointer: coarse`), tampilkan tombol reveal eksplisit di dalam modal question. Tombol ini **tidak muncul** pada perangkat berpointer presisi, sehingga aturan double click di desktop tetap murni sesuai §4.2.

Ini bukan pelanggaran aturan "no hints" (§13.1) — ini kontrol fungsional pada platform yang tidak mendukung interaksi aslinya, bukan teks instruksi.

---

## 21. Aksesibilitas

Persyaratan:

- Kartu dapat difokus dengan keyboard (`<button>` semantik, bukan `<div onClick>`)
- Focus state terlihat jelas — outline dengan warna `primary`, ketebalan ≥ 2px
- Kontras teks/background memenuhi WCAG AA (rasio ≥ 4.5:1 untuk teks normal)
- `aria-label` pada kontrol score assignment
- Modal menggunakan `role="dialog"` dan `aria-modal="true"`
- Focus di-trap di dalam modal selama aktif
- Setelah modal ditutup, fokus kembali ke kartu asalnya di board
- Kartu yang sudah dimainkan: `aria-disabled="true"` dan keluar dari tab order
- Perubahan skor diumumkan lewat `aria-live="polite"` region

### 21.1 Padanan keyboard untuk double click

| State | Tombol | Aksi |
| --- | --- | --- |
| BOARD, kartu terfokus | `Enter` / `Space` | Buka pertanyaan |
| QUESTION | `Enter` / `Space` | Reveal jawaban |
| QUESTION | `Escape` | Tidak ada (diabaikan) |
| ANSWER | `Escape` | Tutup card & commit |
| ANSWER | `Tab` | Fokus ke dropdown |

`Enter` pada state QUESTION setara dengan double click. Ini disengaja: memaksa pengguna keyboard menekan Enter dua kali tidak memberi perlindungan tambahan, dan tidak ada konvensi keyboard untuk "double activate".

---

## 22. Struktur Aplikasi

### 22.1 Arsitektur Astro

Astro adalah static site generator. Game ini pada dasarnya adalah aplikasi client-side dengan state penuh, jadi arsitekturnya:

- **Satu halaman Astro** (`src/pages/index.astro`) sebagai shell — meta tag, font, style global
- **Satu React island** (`<BibleJeopardy client:load />`) berisi seluruh game
- **Tanpa routing** — perpindahan layar diatur oleh `status` di dalam state machine

Alasan tidak memakai route terpisah (`/game`, `/game/finished`): state game hanya ada di memori. Route terpisah berarti refresh atau tombol back akan menghasilkan halaman dengan state kosong — bug yang tidak menyenangkan di tengah permainan. Satu halaman menghindari seluruh kelas masalah ini.

Konsekuensi yang perlu disadari: **refresh browser akan mereset permainan.** Untuk MVP ini diterima. Kalau ternyata mengganggu saat dipakai, persistensi ke `sessionStorage` adalah penambahan kecil di kemudian hari.

### 22.2 Hirarki komponen

```text
index.astro
└── <BibleJeopardy client:load />          ← React island
    │
    ├── HomeScreen
    │   ├── Title
    │   ├── TeamCountInput
    │   └── StartButton
    │
    ├── GameScreen
    │   ├── ScoreIndicator
    │   ├── JeopardyBoard
    │   │   └── CategoryColumn ×3
    │   │       └── JeopardyCard ×3
    │   ├── ActiveCardOverlay
    │   │   ├── QuestionView
    │   │   └── AnswerView
    │   │       └── ScoreAssignment
    │   └── FinishButton
    │
    └── ResultsScreen
        ├── WinnerSection
        ├── RankingList
        └── PlayAgainButton
```

### 22.3 Struktur berkas

```text
src/
├── pages/
│   └── index.astro                 # Shell
├── components/
│   ├── BibleJeopardy.tsx           # Root island, state machine
│   ├── HomeScreen.tsx
│   ├── TeamCountInput.tsx
│   ├── GameScreen.tsx
│   ├── ScoreIndicator.tsx
│   ├── JeopardyBoard.tsx
│   ├── JeopardyCard.tsx
│   ├── ActiveCardOverlay.tsx
│   ├── QuestionView.tsx
│   ├── AnswerView.tsx
│   ├── ScoreAssignment.tsx
│   ├── ResultsScreen.tsx
│   └── WinnerSection.tsx
├── game/
│   ├── types.ts                    # Tipe data (§6.1)
│   ├── machine.ts                   # Reducer state machine
│   ├── scoring.ts                   # computeScore, ranking
│   └── init.ts                      # createGameState()
├── content/
│   └── questions.ts                # 12 kartu — TERPISAH dari UI
└── styles/
    └── global.css                  # Tokens + Tailwind
```

Pemisahan `game/` dari `components/` disengaja: logika state machine dan scoring harus dapat diuji tanpa merender komponen apa pun.

---

## 23. Content Model

Konten 9 pertanyaan **wajib disimpan terpisah dari komponen UI** (`src/content/questions.ts`) agar mudah diganti tanpa menyentuh kode.

```typescript
export const cards: JeopardyCard[] = [
  // Perjanjian Lama
  { id: "ot-1", category: "old_testament", points: 1, question: "...", answer: "..." },
  { id: "ot-2", category: "old_testament", points: 2, question: "...", answer: "..." },
  { id: "ot-5", category: "old_testament", points: 5, question: "...", answer: "..." },

  // Perjanjian Baru
  { id: "nt-1", category: "new_testament", points: 1, question: "...", answer: "..." },
  { id: "nt-2", category: "new_testament", points: 2, question: "...", answer: "..." },
  { id: "nt-5", category: "new_testament", points: 5, question: "...", answer: "..." },

  // Tokoh Rasul
  { id: "ap-1", category: "apostle", points: 1, question: "...", answer: "..." },
  { id: "ap-2", category: "apostle", points: 2, question: "...", answer: "..." },
  { id: "ap-5", category: "apostle", points: 5, question: "...", answer: "..." },
];
```

**Untuk MVP, isi berupa placeholder** — pemilik produk akan mengisi pertanyaan sebenarnya. Placeholder harus berupa teks yang jelas menandakan dirinya placeholder (contoh: `"[Pertanyaan 1 poin — Perjanjian Lama]"`), bukan pertanyaan Alkitab palsu yang bisa tidak sengaja terpakai saat permainan sungguhan.

### 23.1 Panduan tingkat kesulitan

| Poin | Tingkat | Contoh tokoh |
| --- | --- | --- |
| 1 | Sangat dikenal | Adam, Nuh, Musa, Yesus, Petrus |
| 2 | Cukup dikenal, butuh pengetahuan lebih spesifik | — |
| 5 | Kurang dikenal, identifikasi lebih sulit | — |

### 23.2 Dukungan gambar

Setiap pertanyaan boleh punya `image?: string`. Komponen harus menangani kedua kasus (ada / tidak ada gambar) tanpa mengubah struktur modal secara keseluruhan.

Jika `image` diisi, `imageAlt` **wajib** diisi juga — jangan gunakan alt kosong untuk gambar yang membawa makna pertanyaan.

---

## 24. Prinsip UX untuk Implementer

### 24.1 Moderator-first

Sangat sedikit UI yang perlu dioperasikan selama permainan. Moderator harus paham apa yang harus dilakukan tanpa instruksi tertulis.

### 24.2 Tanpa hint yang tidak perlu

Jangan tambahkan toast instruksional seperti `"Tap outside to close"` atau `"Double click to reveal"`. Interaksi harus tetap bersih.

### 24.3 Rasa game show tanpa kebisingan visual

Terasa seperti game, tapi hindari: warna neon, gradien berlebihan, teks raksasa yang menyala, bouncing berlebihan, sound effect agresif.

### 24.4 Pertahankan konteks board

Saat kartu terbuka, board harus tetap terlihat di balik overlay yang diredupkan.

### 24.5 State harus deterministik

Siklus hidup kartu jelas dan tidak bisa dilewati:

```text
belum dimainkan → pertanyaan tampil → jawaban tampil → poin diberikan → selesai
```

Tidak boleh ada cara bagi klik tak sengaja untuk melewati atau merusak siklus ini.

---

## 25. Acceptance Criteria

### Home

- [ ] Menampilkan judul Bible Jeopardy
- [ ] Pengguna dapat memilih jumlah tim
- [ ] Default jumlah tim adalah 2
- [ ] Minimum 2, maksimum 10
- [ ] Tombol `−` disabled saat nilai 2; tombol `+` disabled saat nilai 10
- [ ] Pengguna dapat memulai game
- [ ] Memulai game menginisialisasi semua skor ke 0
- [ ] Memulai game membuat tepat 12 kartu yang dapat dimainkan

### Board

- [ ] Board berisi tepat 3 kategori
- [ ] Setiap kategori berisi tepat 3 kartu
- [ ] Nilai kartu adalah 1, 3, 5, dan 10
- [ ] Setiap kartu menampilkan nilai poinnya
- [ ] Kartu yang sudah dimainkan tidak dapat dipilih lagi
- [ ] Kartu yang sudah dimainkan tetap menempati posisinya di grid
- [ ] Score indicator terlihat di kiri atas
- [ ] Skor diperbarui segera setelah pemberian poin
- [ ] Tombol Selesai berada di kanan bawah

### Question

- [ ] Klik kartu yang belum dimainkan membuka active card
- [ ] Background menjadi redup
- [ ] Kartu membesar dengan animasi
- [ ] Pertanyaan terlihat
- [ ] Gambar opsional dapat ditampilkan; layout tetap baik tanpa gambar
- [ ] Jawaban tidak ada di DOM pada state ini
- [ ] Klik di luar tidak melakukan apa pun saat pertanyaan tampil
- [ ] Escape tidak melakukan apa pun saat pertanyaan tampil
- [ ] Tidak ada toast/hint/tooltip yang muncul

### Answer

- [ ] Double click pada active card me-reveal jawaban
- [ ] Reveal menggunakan animasi flip
- [ ] Jawaban ditampilkan bold
- [ ] Kontrol score assignment muncul
- [ ] Semua tim tersedia sebagai penerima poin
- [ ] Opsi `Tidak ada yang menjawab` tersedia dan menjadi default
- [ ] Memilih tim menambahkan nilai poin kartu ke tim tersebut
- [ ] Memilih `Tidak ada yang menjawab` tidak menambah poin
- [ ] Mengganti pilihan tim memindahkan poin, tidak menggandakannya
- [ ] Klik di luar menutup active card setelah jawaban di-reveal
- [ ] Satu kartu hanya memberi poin satu kali

### Finish

- [ ] Moderator dapat menekan Selesai sebelum semua kartu selesai
- [ ] Menekan Selesai langsung mengakhiri game
- [ ] Menyelesaikan 12 kartu otomatis mengakhiri game
- [ ] Menekan Selesai saat state ANSWER tetap meng-commit poin yang dipilih
- [ ] Layar hasil menampilkan skor akhir setiap tim
- [ ] Tim diurutkan berdasarkan skor
- [ ] Tim dengan skor tertinggi mendapat winner treatment yang menonjol
- [ ] Animasi pemenang ditampilkan
- [ ] Semua tim yang seri di skor tertinggi mendapat winner treatment
- [ ] Tidak ada tie-breaker yang diterapkan
- [ ] Jika semua tim berskor 0, tampilkan layar netral tanpa pemenang
- [ ] Tombol Main Lagi mereset ke Home

### Aksesibilitas & kualitas

- [ ] Semua kartu dapat difokus dan diaktifkan dengan keyboard
- [ ] Focus state terlihat jelas
- [ ] Modal men-trap fokus dan mengembalikannya saat ditutup
- [ ] Kontras teks memenuhi WCAG AA
- [ ] `prefers-reduced-motion` dihormati; confetti tidak tampil
- [ ] Layout berfungsi di desktop, tablet, dan mobile
- [ ] Modal selalu muat dalam viewport
- [ ] Perangkat sentuh punya cara reveal yang berfungsi
- [ ] Invariant §6.3 #6 terpenuhi di seluruh permainan
- [ ] `npm run build` selesai tanpa error

---

## 26. Ringkasan Keputusan Kunci

Untuk implementer — hal-hal yang **tidak boleh** diinterpretasikan ulang:

1. **Single click** → buka pertanyaan. **Double click** → reveal jawaban. **Click di luar** → hanya menutup setelah jawaban di-reveal.
2. Skor dihitung sebagai **turunan** dari `cards`, bukan diakumulasi secara imperatif (§12.3).
3. Jawaban **tidak boleh ada di DOM** sebelum state ANSWER (§11).
4. **Tanpa tie-breaker** — semua tim berskor tertinggi adalah pemenang (§15.2).
5. **Tanpa hint tekstual** untuk interaksi (§13.1, §24.2).
6. Kartu yang sudah dimainkan **tetap di grid** (§9.2).
7. Konten pertanyaan **terpisah** dari komponen UI (§23).
8. **Prioritaskan kebenaran state dan interaksi lebih dulu**, baru visual polish.
