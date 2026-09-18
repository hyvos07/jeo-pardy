# 👨‍🏫 Jeopardy Quiz

Permainan kuis bergaya Jeopardy untuk dimainkan bersama di satu layar: laptop moderator, atau laptop yang tersambung ke proyektor.

Temanya bebas. Seluruh isi permainan dibaca dari satu file JSON, jadi judul, kategori, tingkat poin, dan pertanyaan bisa diganti tanpa menyentuh kode ini sama sekali!

## 🏃‍♂️ Get the App Running

```sh
npm install
npm run dev        # buka http://localhost:4321
```

| Perintah | Kegunaan |
| --- | --- |
| `npm run dev` | Server pengembangan |
| `npm run build` | Build statis ke `dist/` |
| `npm run preview` | Pratinjau hasil build |
| `npm test` | Uji logika permainan dan validasi berkas soal |
| `npm run verify` | Uji interaksi di browser sungguhan (butuh `npm run dev` berjalan) |

## 📝 Fill the Questions

Buat file **[`src/content/questions.json`](src/content/questions.json)**, lalu isi dengan pertanyaan yang ingin digunakan. Format lengkap, termasuk contoh prompt untuk membuat soal dengan bantuan LLM ada di **[`docs/QUESTION-FORMAT.md`](docs/QUESTION-FORMAT.md)**.

Contoh:

```json
{
  "title": "Movie Night Jeopardy",
  "subtitle": "Seberapa hafal kamu dengan film?",
  "categories": ["Film Klasik", "Sutradara"],
  "points": [1, 3, 5],
  "cards": [
    {
      "category": "film-klasik",
      "points": 1,
      "question": "Film 1972 tentang keluarga Corleone?",
      "answer": "The Godfather"
    }
    // ...
  ]
}
```

File JSON divalidasi saat aplikasi dimuat, jadi card yang kurang atau salah rujuk akan memblokir permainan untuk dimulai.

## 🤼 Cara Bermain

Moderator mengendalikan games dari satu layar:

1. Pilih jumlah tim (2–10), tekan **Mulai**.
2. **Klik sekali** pada card untuk membuka pertanyaan.
3. **Klik dua kali** pada card untuk membalikkannya dan melihat jawaban.
4. Pilih tim yang menjawab benar, atau biarkan *Tidak ada yang menjawab*.
5. **Klik di luar card** untuk menutup (hanya bisa setelah reveal jawaban).
6. Salah pilih tim? **Klik card yang sudah dijawab** untuk membukanya lagi dan memperbaiki poin.
7. Tekan **Selesai** untuk melihat peringkat akhir. Saat semua card sudah dijawab, tombol ini menyala — tapi permainan tidak berakhir sendiri, jadi poin masih bisa dikoreksi.

Website ini dibuat hanya untuk memfasilitasi moderator game. Pemain menjawab secara lisan dan moderator yang akan menilai.

Tidak ada buzzer, tidak ada timer.

> **Reminder**: Merefresh halaman akan mengulang permainan dari awal!

## 📚 Dokumentasi

- [`docs/QUESTION-FORMAT.md`](docs/QUESTION-FORMAT.md) — format berkas soal dan prompt LLM
- [`docs/PRD.md`](docs/PRD.md) — spesifikasi produk
- [`docs/PLANNING.md`](docs/PLANNING.md) — rencana implementasi

## ⚙️ Tech Stack

Website ini dibuat dengan Astro + React island + Tailwind CSS + Framer Motion
