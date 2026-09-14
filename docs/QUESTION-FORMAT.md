# Format File Soal

Seluruh isi permainan — judul, bentuk papan, dan pertanyaan — dibaca dari satu berkas:

**[`src/content/questions.json`](../src/content/questions.json)**

Tidak perlu menyentuh kode untuk mengganti tema. Ubah berkas ini, simpan, dan permainan mengikuti.

---

## 1. Struktur Dasar

```json
{
  "title": "Bible Jeopardy",
  "subtitle": "Uji pengetahuanmu tentang Alkitab",
  "categories": ["Perjanjian Lama", "Perjanjian Baru", "Tokoh Rasul"],
  "points": [1, 3, 5, 10],
  "cards": [
    {
      "category": "perjanjian-lama",
      "points": 1,
      "question": "Siapakah yang membangun bahtera sebelum air bah?",
      "answer": "Nuh"
    }
  ]
}
```

| Field | Wajib | Keterangan |
| --- | --- | --- |
| `title` | Ya | Judul permainan. Tampil di layar awal, bar atas, dan tab browser. |
| `subtitle` | Tidak | Kalimat pendek di bawah judul pada layar awal. |
| `categories` | Ya | Kolom papan. 1–6 kategori. |
| `points` | Ya | Tingkat poin, urut dari termurah. 1–8 tingkat. |
| `cards` | Ya | Isi setiap sel papan. |

Jumlah kartu = **jumlah kategori × jumlah tingkat poin**. Contoh di atas: 3 × 4 = **12 kartu**.

---

## 2. `categories`

Dua cara penulisan.

**Cara singkat** — cukup tulis namanya, `id` dibuat otomatis dari nama tersebut:

```json
"categories": ["Perjanjian Lama", "Tokoh Rasul"]
```

`id` yang dihasilkan: `perjanjian-lama`, `tokoh-rasul` (huruf kecil, spasi jadi tanda hubung). Inilah nilai yang dipakai di `cards[].category`.

**Cara eksplisit** — tentukan sendiri `id`-nya. Berguna kalau nama kategori panjang:

```json
"categories": [
  { "id": "pl", "label": "Perjanjian Lama" },
  { "id": "pb", "label": "Perjanjian Baru" }
]
```

Lalu kartunya memakai `"category": "pl"`.

> **Catatan:** kalau Anda mengubah nama kategori pada cara singkat, `id`-nya ikut berubah — jangan lupa perbarui `cards[].category`. Kalau sering berubah, pakai cara eksplisit.

---

## 3. `points`

Bilangan bulat positif, tanpa nilai kembar, ditulis dari termurah ke termahal:

```json
"points": [1, 3, 5, 10]
```

Konvensi Jeopardy: **semakin tinggi poin, semakin sulit soalnya.** Papan tidak menampilkan tingkat kesulitan secara eksplisit — nilai poin itu sendiri yang menjadi petunjuknya.

Jumlah tingkat menentukan tinggi papan. Empat tingkat adalah titik yang nyaman; lebih dari enam membuat kartu mengecil.

---

## 4. `cards`

Satu objek per sel papan. **Setiap kombinasi kategori × poin harus ada tepat satu kali** — kalau ada yang kurang atau dobel, permainan menolak berjalan dan menyebutkan sel mana yang bermasalah.

```json
{
  "category": "perjanjian-lama",
  "points": 5,
  "question": "Nabi mana yang naik ke surga dengan kereta berapi?",
  "answer": "Elia"
}
```

| Field | Wajib | Keterangan |
| --- | --- | --- |
| `category` | Ya | Harus cocok dengan salah satu `id` di `categories`. |
| `points` | Ya | Harus salah satu nilai di `points`. |
| `question` | Ya | Pertanyaan yang tampil saat kartu dibuka. |
| `answer` | Ya | Jawaban, tampil setelah moderator melakukan double click. |
| `image` | Tidak | Path gambar, misalnya `/tokoh.jpg`. Berkasnya taruh di `public/`. |
| `imageAlt` | Wajib jika ada `image` | Deskripsi gambar untuk pembaca layar. |

### Gambar

Simpan berkas di [`public/`](../public/), lalu rujuk dengan garis miring di depan:

```json
{
  "category": "sains",
  "points": 10,
  "question": "Alat apakah ini?",
  "answer": "Spektrometer massa",
  "image": "/spektrometer.jpg",
  "imageAlt": "Alat laboratorium dengan tabung logam panjang dan layar digital"
}
```

`imageAlt` wajib diisi kalau ada gambar — bukan formalitas: gambar yang membawa isi pertanyaan harus bisa dipahami tanpa melihatnya.

---

## 5. Contoh Lengkap: Tema Bebas

Papan 2 kolom × 3 tingkat = 6 kartu, tema film:

```json
{
  "title": "Movie Night Jeopardy",
  "subtitle": "Seberapa hafal kamu dengan film?",
  "categories": ["Film Klasik", "Sutradara"],
  "points": [1, 2, 4],
  "cards": [
    {
      "category": "film-klasik",
      "points": 1,
      "question": "Film 1972 tentang keluarga Corleone?",
      "answer": "The Godfather"
    },
    {
      "category": "film-klasik",
      "points": 2,
      "question": "Film 1941 yang dibuka dengan kata 'Rosebud'?",
      "answer": "Citizen Kane"
    },
    {
      "category": "film-klasik",
      "points": 4,
      "question": "Film bisu 1927 karya Fritz Lang tentang kota masa depan?",
      "answer": "Metropolis"
    },
    {
      "category": "sutradara",
      "points": 1,
      "question": "Siapa sutradara Jurassic Park dan E.T.?",
      "answer": "Steven Spielberg"
    },
    {
      "category": "sutradara",
      "points": 2,
      "question": "Sutradara yang dijuluki 'Master of Suspense'?",
      "answer": "Alfred Hitchcock"
    },
    {
      "category": "sutradara",
      "points": 4,
      "question": "Sutradara Jepang di balik Seven Samurai dan Rashomon?",
      "answer": "Akira Kurosawa"
    }
  ]
}
```

---

## 6. Kalau Ada Yang Salah

Berkas divalidasi saat aplikasi dimuat, jadi kesalahan ketahuan sebelum permainan dimulai — bukan di tengah acara. Pesannya menyebut persis bagian mana yang bermasalah:

```
Kartu berikut belum ada: Sains / 10 poin. Setiap kategori butuh satu kartu untuk tiap nilai poin.
```

```
cards[3].category "sejarah-dunia" tidak ada di daftar "categories".
```

Yang diperiksa:

- `title` tidak kosong
- Jumlah kategori 1–6, tanpa `id` kembar
- Jumlah tingkat poin 1–8, bilangan bulat positif, tanpa nilai kembar
- Setiap kartu merujuk kategori dan nilai poin yang ada
- Setiap sel papan terisi tepat satu kali
- `question` dan `answer` tidak kosong
- Setiap `image` disertai `imageAlt`

Setelah mengedit, jalankan `npm test` untuk memeriksa lebih dulu.

---

## 7. Prompt untuk LLM

Untuk membuat soal dengan bantuan AI, salin prompt berikut dan ganti bagian dalam `<...>`.

````text
Buatkan satu berkas JSON berisi soal untuk permainan kuis bergaya Jeopardy.

TEMA: <misalnya: sejarah Indonesia / astronomi dasar / sepak bola Eropa>
BAHASA: <Indonesia / Inggris>
JUMLAH KATEGORI: <misalnya 3>
NAMA KATEGORI: <kosongkan agar kamu yang menentukan, atau sebutkan sendiri>
TINGKAT POIN: <misalnya 1, 3, 5, 10>
AUDIENS: <misalnya remaja SMA / umum / anak-anak>

Keluarkan HANYA JSON, tanpa penjelasan dan tanpa pagar kode.

FORMAT:

{
  "title": "<judul permainan, singkat dan menarik>",
  "subtitle": "<satu kalimat pendek, boleh dihilangkan>",
  "categories": ["<Nama Kategori 1>", "<Nama Kategori 2>"],
  "points": [1, 3, 5, 10],
  "cards": [
    {
      "category": "<id kategori>",
      "points": 1,
      "question": "<pertanyaan>",
      "answer": "<jawaban>"
    }
  ]
}

ATURAN YANG WAJIB DIPATUHI:

1. `category` pada setiap kartu memakai versi slug dari nama kategori:
   huruf kecil semua, spasi diganti tanda hubung, tanpa tanda baca.
   Contoh: "Sejarah Indonesia" -> "sejarah-indonesia"

2. Buat tepat satu kartu untuk SETIAP kombinasi kategori x tingkat poin.
   Dengan 3 kategori dan 4 tingkat poin, berarti tepat 12 kartu.
   Tidak boleh ada yang terlewat dan tidak boleh ada yang dobel.

3. Tingkat kesulitan naik bersama nilai poin:
   - Poin terendah: hampir semua orang di audiens itu tahu jawabannya.
   - Poin menengah: perlu pengetahuan yang agak spesifik.
   - Poin tertinggi: menantang, tapi tetap wajar untuk audiens tersebut.
     Jangan sekadar mengarang fakta yang tidak bisa diverifikasi.

4. Jawaban harus SINGKAT dan PASTI — satu nama, satu istilah, satu angka,
   atau satu frasa pendek. Moderator menilai jawaban lisan pemain, jadi
   jawaban yang panjang atau bisa ditafsirkan bermacam-macam akan
   menyulitkan. Hindari pertanyaan yang jawabannya bisa diperdebatkan.

5. Pertanyaan berdiri sendiri: jangan merujuk kartu lain, jangan memakai
   "seperti disebutkan tadi", dan jangan bergantung pada gambar.

6. Pastikan setiap fakta benar. Kalau ragu pada suatu soal, ganti dengan
   soal lain yang Anda yakini benar.

7. Keluarkan JSON yang valid: tanda kutip ganda, tanpa koma menggantung,
   tanpa komentar.
````

### Setelah Menerima Hasilnya

1. Salin JSON-nya ke [`src/content/questions.json`](../src/content/questions.json), menimpa seluruh isi.
2. Jalankan `npm test` — validasi akan menangkap kartu yang kurang, slug yang salah, atau nilai poin yang tidak cocok.
3. Jalankan `npm run dev` dan buka papannya.

**Periksa sendiri kebenaran faktanya.** Model bahasa kadang menghasilkan fakta yang terdengar meyakinkan tetapi keliru, dan kesalahan seperti itu baru ketahuan saat permainan berlangsung di depan orang banyak.
