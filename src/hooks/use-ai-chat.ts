/**
 * Orkestrasi AI Chat (Epic 3.3–3.5) — mengikat parser lokal (gerbang
 * pertama, tanpa jaringan), fallback Gemini, lampiran struk, dan
 * AIPreviewModal ke satu state ephemeral (riwayat chat tidak dipersist —
 * cakupan MVP; tab tidak di-unmount sehingga riwayat bertahan selama app hidup).
 *
 * Aturan alur (sdd-001.md §4.1 v1.4 + revisi v1.5):
 * - Lolos parser lokal penuh (nominal+dompet+kategori) = auto-save.
 * - Lokal semi-lengkap (nominal+kategori, dompet tak ketemu/ambigu) =
 *   modal konfirmasi langsung dari hasil lokal, TANPA memanggil Gemini —
 *   instan & tetap jalan offline (kasus "warteg 25rb").
 * - Sisanya = Gemini; hasilnya selalu dikonfirmasi manusia via modal.
 *   Gemini gagal/nominal tak ketemu → tidak ada jalan buntu: pakai nominal
 *   lokal bila sempat tertangkap, atau bubble panduan format.
 */
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useRef, useState } from 'react';
import { ToastAndroid } from 'react-native';

import {
  GeminiError,
  parseReceiptImage,
  parseTransactionText,
  type GeminiParseResult,
} from '@/ai/gemini-parser';
import { useCategoryStore } from '@/store/use-category-store';
import { useTransactionStore, type Transaction } from '@/store/use-transaction-store';
import { useWalletStore } from '@/store/use-wallet-store';
import { extractDate } from '@/utils/date-parser';
import { formatRupiah, formatTanggal, todayIso } from '@/utils/format';
import { tryLocalParse, type LocalParseResult } from '@/utils/local-parser';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text?: string;
  /** Thumbnail struk sebagai data-URI di RAM — tetap tampil setelah file cache dipurge. */
  imageDataUri?: string;
  tone?: 'success' | 'error' | 'info';
}

export interface PendingPreview {
  result: GeminiParseResult;
  /** File struk di cache — wajib dipurge setelah simpan/batal (Zero-Image Storage). */
  imageUri: string | null;
  /** Tanggal awal untuk field Tanggal modal (deteksi lokal → Gemini → hari ini). */
  initialDate?: string;
}

export type ReceiptSource = 'camera' | 'gallery';

const SCOPE_CLARIFICATION =
  'Aku cuma bisa bantu catat transaksi ya — coba tulis seperti "beli kopi 20rb pakai GoPay". ' +
  'Untuk melihat riwayat atau ringkasan pengeluaran, buka tab Transaksi atau Analitik. 🙂';

/** Panduan format saat ekstraksi nominal gagal (revisi v1.5 — pengganti modal nominal-kosong di jalur teks). */
const PARSE_GUIDANCE =
  'Aku belum nangkep nominalnya 😅 Coba tulis ulang dengan angka + satuan yang jelas, ' +
  'contoh: "warteg 25rb", "bayar parkir 2000", atau "gajian 5jt masuk BCA".';

/** Pemberitahuan saat Gemini gagal tapi deteksi lokal sempat menangkap nominal (revisi v1.5). */
const LOCAL_FALLBACK_NOTICE =
  'Server AI lagi tidak bisa dihubungi, jadi formulir kuisi dari deteksi lokal — ' +
  'periksa dulu sebelum disimpan ya. 🙂';

/**
 * Bentuk hasil parser lokal ke kontrak GeminiParseResult agar AIPreviewModal
 * bisa dipakai tanpa perubahan (dompet/kategori pre-select via nama).
 */
function buildLocalPreview(
  local: LocalParseResult,
  wallets: { id: number; name: string }[],
  categories: { id: number; name: string }[],
): GeminiParseResult {
  return {
    amount: local.amount,
    type: local.type,
    notes: local.notes,
    detected_wallet: wallets.find((wallet) => wallet.id === local.walletId)?.name ?? null,
    detected_destination_wallet:
      wallets.find((wallet) => wallet.id === local.destinationWalletId)?.name ?? null,
    category_suggestion:
      categories.find((category) => category.id === local.categoryId)?.name ?? null,
    // Tanggal dialirkan lewat PendingPreview.initialDate (bukan kontrak Gemini).
    date: null,
  };
}

/**
 * Heuristik pembeda "instruksi transaksi yang gagal diekstrak" vs "di luar
 * cakupan". Sengaja TANPA kata "belanja"/"rp" polos: pertanyaan riwayat khas
 * ("berapa saya belanja minggu ini?") harus jatuh ke klarifikasi cakupan
 * (AC 3.3), bukan membuka modal — nominal riil selalu tertangkap lewat \d.
 */
function looksLikeTransaction(text: string): boolean {
  return /\d/.test(text) || /\b(beli|bayar|harga|ribu|juta)\b/i.test(text);
}

/** Hapus file struk dari cache — idempoten, tidak pernah melempar (best-effort). */
function purgeReceiptImage(uri: string | null): void {
  if (!uri) {
    return;
  }
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch (error) {
    console.warn('Gagal menghapus cache struk', error);
  }
}

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.7,
  base64: true, // base64 langsung dari picker — tanpa baca file terpisah
};

export function useAiChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [pending, setPending] = useState<PendingPreview | null>(null);
  const nextId = useRef(0);

  const pushMessage = useCallback((message: Omit<ChatMessage, 'id'>) => {
    nextId.current += 1;
    setMessages((prev) => [...prev, { ...message, id: String(nextId.current) }]);
  }, []);

  const pushGeminiError = useCallback(
    (error: unknown) => {
      const text =
        error instanceof GeminiError
          ? error.message
          : 'Terjadi kesalahan tak terduga. Coba lagi, atau catat transaksi secara manual.';
      pushMessage({ role: 'assistant', text, tone: 'error' });
    },
    [pushMessage],
  );

  /** Ringkasan konfirmasi pasca-simpan untuk bubble asisten. */
  const buildSavedSummary = useCallback(
    (
      tx: Pick<
        Transaction,
        'amount' | 'type' | 'wallet_id' | 'destination_wallet_id' | 'category_id' | 'date'
      >,
    ) => {
      const wallets = useWalletStore.getState().wallets;
      const walletName = wallets.find((w) => w.id === tx.wallet_id)?.name ?? 'Dompet';
      const nominal = formatRupiah(tx.amount); // mis. "Rp25.000"
      // Tampilkan tanggal hanya bila bukan hari ini (transparansi jalur auto-save
      // yang tak lewat modal) — mis. "8 juli" → "· 8 Jul 2026".
      const dateSuffix = tx.date !== todayIso() ? ` · ${formatTanggal(tx.date)}` : '';

      if (tx.type === 'TRANSFER') {
        const destName = wallets.find((w) => w.id === tx.destination_wallet_id)?.name ?? 'Dompet';
        return `Berhasil mencatat Transfer ${nominal} dari ${walletName} ke ${destName}${dateSuffix}`;
      }

      const categoryName =
        useCategoryStore.getState().categories.find((c) => c.id === tx.category_id)?.name ??
        'Lainnya';
      if (tx.type === 'INCOME') {
        return `Berhasil mencatat Pemasukan (+${nominal}) kategori ${categoryName} ke ${walletName}${dateSuffix}`;
      }
      return `Berhasil mencatat Pengeluaran kategori ${categoryName} sebesar ${nominal} menggunakan ${walletName}${dateSuffix}`;
    },
    [],
  );

  /** Kirim teks — parser lokal SELALU dicoba dulu, sebelum request jaringan apa pun. */
  const sendText = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (text === '' || isTyping) {
        return;
      }
      pushMessage({ role: 'user', text });

      const wallets = useWalletStore.getState().wallets;
      const categories = useCategoryStore.getState().categories;

      // Deteksi tanggal lokal dulu; frasa tanggal dibuang dari teks agar tidak
      // mengganggu ekstraksi nominal (mis. "8 juli" tak dihitung sbg token angka
      // kedua). Gemini tetap menerima teks asli (ia mengekstrak tanggal sendiri).
      const dateMatch = extractDate(text, new Date());
      const detectedDate = dateMatch?.iso ?? null;
      const textForParse = dateMatch
        ? text.replace(dateMatch.matched, ' ').replace(/\s+/g, ' ').trim()
        : text;
      const local = tryLocalParse(textForParse, wallets, categories);

      if (local.confident) {
        // Jalur PRD §4.3: teks lengkap → eksekusi langsung, Gemini TIDAK dipanggil.
        // TRANSFER confident (nominal + sumber + tujuan jelas) ikut auto-save di sini.
        const savedDate = detectedDate ?? todayIso();
        const isTransfer = local.type === 'TRANSFER';
        const ok = await useTransactionStore.getState().addTransaction({
          wallet_id: local.walletId!,
          destination_wallet_id: isTransfer ? local.destinationWalletId : null,
          savings_goal_id: null,
          category_id: isTransfer ? null : local.categoryId,
          type: local.type,
          amount: local.amount!,
          notes: local.notes.trim() === '' ? null : local.notes,
          date: savedDate,
        });
        if (ok) {
          ToastAndroid.show('Transaksi tersimpan', ToastAndroid.SHORT);
          pushMessage({
            role: 'assistant',
            text: buildSavedSummary({
              amount: local.amount!,
              type: local.type,
              wallet_id: local.walletId!,
              destination_wallet_id: isTransfer ? local.destinationWalletId : null,
              category_id: isTransfer ? null : local.categoryId,
              date: savedDate,
            }),
            tone: 'success',
          });
        } else {
          pushMessage({
            role: 'assistant',
            text: 'Gagal menyimpan ke database. Coba lagi ya.',
            tone: 'error',
          });
        }
        return;
      }

      // Transfer terdeteksi tapi belum confident (dompet ambigu/kurang atau
      // nominal belum ada) → buka modal Transfer terisi sebagian. JANGAN lempar
      // ke Gemini: Gemini tak mengenal transfer dan akan salah jadi Pengeluaran.
      if (local.type === 'TRANSFER') {
        setPending({
          result: buildLocalPreview(local, wallets, categories),
          imageUri: null,
          initialDate: detectedDate ?? undefined,
        });
        return;
      }

      // Revisi v1.5: nominal + kategori sudah ketemu lokal, hanya dompet yang
      // kurang/ambigu (kasus "warteg 25rb") → modal konfirmasi langsung dari
      // hasil lokal, TANPA Gemini — instan, gratis, dan jalan saat offline.
      if (local.amount !== null && local.categoryId !== null) {
        setPending({
          result: buildLocalPreview(local, wallets, categories),
          imageUri: null,
          initialDate: detectedDate ?? undefined,
        });
        return;
      }

      // Fallback Gemini (Story 3.2) — indikator mengetik hanya untuk jalur jaringan.
      setIsTyping(true);
      try {
        const result = await parseTransactionText(text, categories);
        // Presedensi tanggal: deteksi lokal (dari teks persis pengguna) menang
        // atas hasil Gemini; keduanya cadangan sebelum modal default hari ini.
        const initialDate = detectedDate ?? result.date ?? undefined;
        if (result.amount !== null) {
          // Hasil Gemini utuh → SELALU konfirmasi manusia (AC 3.5).
          setPending({ result, imageUri: null, initialDate });
        } else if (local.amount !== null) {
          // Gemini menyerah soal nominal padahal deteksi lokal menangkapnya →
          // pakai nominal lokal, pertahankan saran kategori/dompet Gemini
          // (notes Gemini di kasus ini berisi penjelasan kegagalan, bukan
          // catatan transaksi — ganti dengan deskripsi bersih hasil parser lokal).
          setPending({
            result: { ...result, amount: local.amount, notes: local.notes },
            imageUri: null,
            initialDate,
          });
        } else if (!looksLikeTransaction(text)) {
          // Di luar cakupan chat parser (AC 3.3) — klarifikasi sopan, bukan error.
          pushMessage({ role: 'assistant', text: SCOPE_CLARIFICATION, tone: 'info' });
        } else {
          // Revisi v1.5: nominal benar-benar tak terekstrak → bimbing format
          // lewat bubble (modal nominal-kosong hanya tersisa di jalur OCR).
          const reason = result.notes !== '' ? `${result.notes}\n\n` : '';
          pushMessage({ role: 'assistant', text: `${reason}${PARSE_GUIDANCE}`, tone: 'info' });
        }
      } catch (error) {
        if (local.amount !== null) {
          // Revisi v1.5: server/jaringan gagal bukan jalan buntu — buka modal
          // dari hasil deteksi lokal + beri tahu pengguna sumbernya.
          setPending({
            result: buildLocalPreview(local, wallets, categories),
            imageUri: null,
            initialDate: detectedDate ?? undefined,
          });
          pushMessage({ role: 'assistant', text: LOCAL_FALLBACK_NOTICE, tone: 'info' });
        } else {
          pushGeminiError(error);
        }
      } finally {
        setIsTyping(false);
      }
    },
    [buildSavedSummary, isTyping, pushGeminiError, pushMessage],
  );

  /** Lampirkan struk dari kamera/galeri → OCR Gemini → selalu preview modal. */
  const attachReceipt = useCallback(
    async (source: ReceiptSource) => {
      if (isTyping) {
        return;
      }
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          pushMessage({
            role: 'assistant',
            text: 'Izin kamera ditolak — aktifkan lewat pengaturan sistem, atau pilih gambar dari galeri.',
            tone: 'info',
          });
          return;
        }
      }

      const picked =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
          : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
      const asset = picked.canceled ? null : (picked.assets?.[0] ?? null);
      if (!asset) {
        return;
      }

      // Fallback bila picker tidak menyertakan base64 (API kelas baru SDK 57).
      const base64 = asset.base64 ?? (await new File(asset.uri).base64());
      pushMessage({ role: 'user', imageDataUri: `data:image/jpeg;base64,${base64}` });

      setIsTyping(true);
      try {
        const categories = useCategoryStore.getState().categories;
        const result = await parseReceiptImage(base64, categories);
        // Struk tak melalui parser lokal → tanggal hanya dari Gemini (tanggal
        // tercetak di struk), atau hari ini bila null.
        setPending({ result, imageUri: asset.uri, initialDate: result.date ?? undefined });
      } catch (error) {
        // Zero-Image Storage (keputusan Epic 7.2): struk gagal diproses → cache
        // tetap dipurge SEKETIKA demi privasi; "coba lagi" = lampirkan ulang.
        purgeReceiptImage(asset.uri);
        pushGeminiError(error);
        pushMessage({
          role: 'assistant',
          text: 'Struk belum berhasil dibaca — coba foto/lampirkan lagi ya, atau catat manual lewat teks. 🙂',
          tone: 'info',
        });
      } finally {
        setIsTyping(false);
      }
    },
    [isTyping, pushGeminiError, pushMessage],
  );

  /** Simpan dari AIPreviewModal — purge file struk HANYA setelah insert sukses. */
  const confirmPreview = useCallback(
    async (tx: Omit<Transaction, 'id'>): Promise<boolean> => {
      const ok = await useTransactionStore.getState().addTransaction(tx);
      if (!ok) {
        return false; // modal tetap terbuka + tampilkan error; gambar TIDAK dihapus
      }
      purgeReceiptImage(pending?.imageUri ?? null);
      ToastAndroid.show('Transaksi tersimpan', ToastAndroid.SHORT);
      pushMessage({ role: 'assistant', text: buildSavedSummary(tx), tone: 'success' });
      setPending(null);
      return true;
    },
    [buildSavedSummary, pending, pushMessage],
  );

  const cancelPreview = useCallback(() => {
    purgeReceiptImage(pending?.imageUri ?? null);
    setPending(null);
    pushMessage({
      role: 'assistant',
      text: 'Oke, tidak jadi disimpan. Kirim lagi kalau mau kucatat ulang ya.',
      tone: 'info',
    });
  }, [pending, pushMessage]);

  return { messages, isTyping, pending, sendText, attachReceipt, confirmPreview, cancelPreview };
}
