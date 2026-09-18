# Arus — Aplikasi Pencatatan & Manajemen Keuangan Pribadi 🌊

**Arus** adalah aplikasi *mobile* pencatatan dan pengelolaan keuangan pribadi berbasis **Offline-First** dengan arsitektur **Hybrid AI (Lokal Lexicon + Gemini LLM)**. Arus dirancang untuk memberikan kemudahan pencatatan finansial ultra-cepat (< 5 detik), menjaga privasi pengguna, serta memberikan wawasan keuangan yang cerdas tanpa mengandalkan koneksi internet secara penuh.

---

## 📚 Dokumentasi Diátaxis

Dokumentasi ini disusun berdasarkan **Diátaxis Framework** yang terbagi menjadi 4 kuadran:

- [1. Gambaran Umum & Konsep Ringkas (Explanation)](#1-gambaran-umum--konsep-ringkas-explanation)
- [2. Panduan Memulai Cepat (Tutorials)](#2-panduan-memulai-cepat-tutorials)
- [3. Panduan Penggunaan & Operasional (How-To Guides)](#3-panduan-penggunaan--operasional-how-to-guides)
- [4. Acuan Teknis & Arsitektur (Reference)](#4-acuan-teknis--arsitektur-reference)

---

## 1. Gambaran Umum & Konsep Ringkas (Explanation)

### 💡 Mengapa Arus?

Banyak pengguna menghadapi masalah "pengeluaran tak sadar" (*invisible spending*) karena pencatatan manual yang rumit dan membutuhkan banyak sentuhan (*clicks*). Arus menyelesaikan masalah ini dengan pendekatan **Hybrid AI**:

1. **Fast Local Parsing:** Input teks sederhana seperti `warteg 25rb` langsung dikenali secara instan (0 milidetik, tanpa jaringan) oleh *parser lexicon* lokal.
2. **LLM Fallback & Struk OCR:** Untuk deskripsi kompleks atau pemindaian struk fisik, Arus menggunakan model **Gemini 3.5 Flash API** (`@google/genai`).
3. **Isolasi Saldo Tabungan (Physical Separation):** Dana operasional (*Active Wallets*) dipisahkan secara ketat dari dana tabungan (*Savings & Goals*), mencegah pengguna secara tidak sengaja membelanjakan tabungan.
4. **Kebijakan Saldo Negatif:** Pengguna dapat mencatat pengeluaran melebihi saldo dompet aktif untuk mencerminkan kondisi realitas finansial (misal: kasbon/utang sementara) tanpa diblokir oleh sistem.

---

## 2. Panduan Memulai Cepat (Tutorials)

### 📋 Prasyarat Sistem

- **Node.js**: v18.x atau v20.x+
- **npm**: v9.x+ atau **yarn**
- **Expo Go** (di perangkat seluler) atau **Android Studio Emulator** / **iOS Simulator**

### 🚀 Langkah Instalasi & Pengoperasian

#### 1. Clone Repository & Install Dependensi

```bash
git clone https://github.com/Ando2341/Arus.git
cd Arus
npm install
```

#### 2. Konfigurasi Environment Variables

Buat berkas `.env` di direktori utama (*root*) project dengan menyalin dari `.env.example`:

```bash
cp .env.example .env
```

Buka `.env` dan masukkan **Gemini API Key** Anda:

```env
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

#### 3. Jalankan Server Pengembang (Expo Dev Server)

```bash
npm start
```

Pilih opsi jalur eksekusi:
- Tekan `a` untuk membuka di **Android Emulator**.
- Tekan `i` untuk membuka di **iOS Simulator**.
- Tekan `w` untuk membuka di **Web Browser**.
- Pindai kode QR yang muncul menggunakan aplikasi **Expo Go** pada ponsel Android/iOS Anda.

---

## 3. Panduan Penggunaan & Operasional (How-To Guides)

### 🗣️ Panduan Format Input Teks Cepat (Smart Lexicon Parser)

Anda dapat menulis pengeluaran/pemasukan secara alami di tab **Chat AI**:

| Contoh Input | Hasil Ekstraksi | Eksekusi |
| :--- | :--- | :--- |
| `warteg 25rb` | Nominal: 25.000 \| Kategori: Makanan & Minuman | Modifikasi instan via modal konfirmasi lokal (Offline) |
| `gajian 5jt ke gopay` | Nominal: 5.000.000 \| Tipe: Income \| Dompet: GoPay | Ekstraksi dompet & tipe pemasukan otomatis |
| `rokok 30rb` (dengan kategori kustom "Rokok") | Nominal: 30.000 \| Kategori: Rokok | Mengenali nama kategori kustom pengguna |

### 📸 Pemindaian Struk Belanja (OCR)

1. Buka tab **Chat AI**.
2. Ketuk ikon **Lampiran / Kamera** di samping kolom input chat.
3. Ambil foto struk belanja atau pilih gambar dari galeri.
4. Gemini AI akan mengekstraksi toko, total nominal, tanggal, dan daftar item secara otomatis untuk dikonfirmasi.

### 🧪 Menjalankan Automated Test Suites

Project ini dilengkapi skrip pengujian bawaan untuk memvalidasi komponen-komponen kritis:

```bash
# Pengujian parser lexicon lokal & penanganan format teks
npm run test:parser

# Pengujian skema database SQLite, query, dan database triggers
npm run test:db

# Pengujian prompt generator & skenario Monthly AI Financial Insight
npm run test:insight

# Pengujian siklus backup & restore data (JSON export/import)
npm run test:backup

# Pengujian utilitas format tanggal dan konversi waktu
npm run test:date

# Pengujian format angka dan mata uang
npm run test:format
```

---

## 4. Acuan Teknis & Arsitektur (Reference)

### 🛠️ Technology Stack

| Komponen | Teknologi / Library |
| :--- | :--- |
| **Framework Main** | React Native (0.86.0), Expo SDK 57 (`~57.0.1`) |
| **Routing & Navigation** | Expo Router (`~57.0.2`) dengan File-based Routing |
| **State Management** | Zustand (`^5.0.14`) |
| **Local Database** | Expo SQLite (`~57.0.0`) |
| **Styling & Design** | NativeWind (`^4.2.6`), Tailwind CSS (`^3.4.19`) |
| **AI Integration** | `@google/genai` (Gemini 3.5 Flash Model) |
| **Charts & Visuals** | `react-native-gifted-charts`, `react-native-svg` |
| **Icons & UI Effects** | `lucide-react-native`, `expo-glass-effect`, `expo-haptics` |

### 📁 Struktur Direktori Project

```text
Arus/
├── assets/                 # Asset gambar, font, dan splash screen
├── docs/                   # Dokumen PRD, SDD, Dev Workflow, dan Epic specs
│   ├── prd.md              # Product Requirement Document
│   └── sdd/                # Software Design Documents
├── scripts/                # Skrip pengujian internal (.mjs & .js)
├── src/
│   ├── ai/                 # Modul AI (Local Lexicon Parser & Gemini Client)
│   ├── app/                # Halaman & rute Expo Router ((tabs), modals, _layout)
│   ├── components/         # UI Component terisolasi (Cards, Charts, Modals)
│   ├── constants/          # Konstanta aplikasi, theme colors, lexicon dictionary
│   ├── db/                 # Skema Expo SQLite, migrasi, dan seeders
│   ├── hooks/              # Custom React Hooks
│   ├── services/           # Logika layanan (Backup, Export, Cloud Sync)
│   ├── store/              # State management Zustand (Wallet, Transaction, Budget)
│   └── utils/              # Helper utilitas (Currency, Date formatters)
├── app.json                # Expo project configuration
├── tailwind.config.js      # Konfigurasi Tailwind & NativeWind
└── package.json            # Dependensi & skrip proyek
```

### 🔐 Variabel Lingkungan (Environment Variables)

| Variabel | Deskripsi | Wajib? |
| :--- | :--- | :--- |
| `EXPO_PUBLIC_GEMINI_API_KEY` | Key API dari Google AI Studio untuk akses Gemini 3.5 Flash. | Ya (untuk fitur AI & OCR) |

---

## 📄 Lisensi

Proyek ini dilindungi di bawah **[MIT License](LICENSE)**.

---

*Dikembangkan untuk membantu pengelolaan keuangan pribadi yang cerdas, efisien, dan aman.*
