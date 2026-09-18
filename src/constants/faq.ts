/**
 * Konten FAQ / Pusat Bantuan (Epic 6 Story 6.5 — FR-14). Array statis,
 * bukan tabel database: konten sama untuk semua pengguna, bisa diakses
 * offline, dan developer cukup menambah entri di sini tanpa migrasi.
 * Delapan entri awal menjelaskan keputusan produk yang paling berpotensi
 * membingungkan (epic-006.md Story 6.5).
 */
export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
}

export const FAQ_ENTRIES: FaqEntry[] = [
  {
    id: 'saldo-minus',
    question: 'Kenapa saldo dompet saya bisa minus?',
    answer:
      'Itu disengaja, bukan bug. Arus membiarkan saldo minus agar catatan mencerminkan ' +
      'kondisi nyata — misalnya kamu mencatat pengeluaran yang lebih besar dari saldo ' +
      'karena ada pemasukan yang belum sempat dicatat. Koreksi saja transaksinya kapan pun.',
  },
  {
    id: 'dompet-vs-tabungan',
    question: 'Apa bedanya Dompet dan Tabungan?',
    answer:
      'Dompet adalah uang operasional harian. Tabungan sengaja terkunci dari dompet: ' +
      'dananya hanya berubah lewat aksi Setor/Tarik di layar Tabungan dan tidak bisa ' +
      'terpakai transaksi biasa — supaya dana targetmu tidak "bocor" tanpa sadar.',
  },
  {
    id: 'privasi-ai',
    question: 'Apakah AI membaca semua transaksi saya?',
    answer:
      'Tidak. Perhitungan dan insight harian/mingguan diproses 100% lokal di HP-mu. ' +
      'AI (Gemini) hanya dipanggil untuk dua hal: memahami teks atau struk yang ambigu ' +
      'saat mencatat, dan laporan bulanan — itu pun data dikirim anonim tanpa identitasmu.',
  },
  {
    id: 'kadang-konfirmasi',
    question: 'Kenapa kadang transaksi langsung tersimpan, kadang muncul pop-up konfirmasi?',
    answer:
      'Teks yang jelas (ada nominal dan nama dompet yang cocok) diproses langsung di HP ' +
      'tanpa AI — instan dan tetap jalan saat offline. Teks yang ambigu dikirim ke AI, ' +
      'dan hasil tebakannya selalu dimintakan konfirmasimu dulu sebelum disimpan.',
  },
  {
    id: 'backup-enkripsi',
    question: 'Apakah berkas backup saya dienkripsi?',
    answer:
      'Tidak — demi kesederhanaan, tanpa kata sandi tambahan yang bisa terlupa dan ' +
      'membuat datamu justru tak bisa dipulihkan. Karena itu jangan bagikan berkas ' +
      'backup ke siapa pun; simpan di folder pribadi atau Google Drive milikmu sendiri.',
  },
  {
    id: 'kategori-sistem',
    question: 'Kenapa saya tidak bisa menghapus kategori tertentu?',
    answer:
      'Kategori bawaan (bertanda "Sistem") dilindungi agar laporan dan anggaran tetap ' +
      'konsisten. Hanya kategori buatanmu sendiri yang bisa dihapus — transaksi lamanya ' +
      'tidak ikut hilang, hanya menjadi "Tanpa Kategori".',
  },
  {
    id: 'hapus-tabungan-isi',
    question: 'Kenapa target tabungan yang masih ada isinya tidak bisa dihapus?',
    answer:
      'Untuk mencegah dana hilang tanpa jejak. Tarik dulu seluruh dananya kembali ke ' +
      'dompet lewat tombol Tarik; setelah kosong, target bisa dihapus.',
  },
  {
    id: 'laporan-bulanan',
    question: 'Kenapa laporan AI hanya muncul sebulan sekali?',
    answer:
      'Sengaja dibatasi agar hemat biaya dan analisisnya bermakna (memakai data sebulan ' +
      'penuh). Insight harian dan mingguan tetap tersedia kapan saja karena dihitung ' +
      'lokal di HP tanpa AI.',
  },
];
