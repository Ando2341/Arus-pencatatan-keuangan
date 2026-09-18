/**
 * Klien Gemini Smart Parser — fallback saat pengklasifikasi lokal tidak
 * confident, dan satu-satunya jalur OCR struk (Epic 3.2/3.4, sdd-001.md §4.2).
 *
 * Keputusan kickoff yang mengikat:
 * - SDK `@google/genai` (unified) — BUKAN `@google/generative-ai` yang
 *   tertulis di dokumen lama (divergensi dicatat sebagai revisi v1.4).
 * - Model `gemini-3.5-flash` dipakai apa adanya; jika API menolak id ini,
 *   kegagalan dilaporkan eksplisit ke pengguna (kind: 'model') — jangan
 *   pernah diganti diam-diam ke model lain.
 * - API key ikut bundle client (EXPO_PUBLIC_*), mitigasi lewat API-key
 *   restriction di Google console (lihat docs/dev-workflow.md).
 */
import { GoogleGenAI, ThinkingLevel, Type, type Part } from '@google/genai';

import type { Category } from '@/store/use-category-store';
import { todayIso } from '@/utils/format';

/** Kontrak keluaran parser sesuai sdd-001.md §4.2 — amount null = jalur valid. */
export interface GeminiParseResult {
  amount: number | null;
  /**
   * TRANSFER hanya dihasilkan jalur parser lokal (Gemini tak pernah
   * mengembalikannya — prompt membatasi ke INCOME/EXPENSE). Bentuk ini dipakai
   * bersama sebagai kontrak pratinjau (lihat buildLocalPreview di use-ai-chat).
   */
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  notes: string;
  /** Dompet sumber (nama mentah, dicocokkan ke dompet nyata di modal). */
  detected_wallet: string | null;
  /** Dompet tujuan — hanya untuk TRANSFER; null selain itu. */
  detected_destination_wallet: string | null;
  /** Sudah tervalidasi ke nama kategori milik pengguna, atau null. */
  category_suggestion: string | null;
  /** Tanggal transaksi 'YYYY-MM-DD' bila disebut/tercetak, atau null (= hari ini). */
  date: string | null;
}

export type GeminiErrorKind = 'config' | 'model' | 'network' | 'api' | 'parse';

/** Error bertipe agar GeminiBubble bisa memilih pesan Indonesia yang tepat. */
export class GeminiError extends Error {
  readonly kind: GeminiErrorKind;

  constructor(kind: GeminiErrorKind, message: string) {
    super(message);
    this.name = 'GeminiError';
    this.kind = kind;
  }
}

/** Konstanta tunggal id model — keputusan kickoff, verifikasi runtime. */
export const MODEL_ID = 'gemini-3.5-flash';

let client: GoogleGenAI | null = null;

/** Klien singleton — juga dipakai monthly-insight.ts (Epic 4.3). */
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiError(
      'config',
      'API key Gemini belum disetel. Salin .env.example menjadi .env, isi EXPO_PUBLIC_GEMINI_API_KEY, lalu restart Metro.',
    );
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

/**
 * System prompt — cetak biru sdd-001.md §4.2 (v1.2), dengan
 * {{category_list}} di-inject dari kategori nyata pengguna saat request.
 * Revisi v1.5: aturan slang uang + contoh few-shot input singkat khas
 * Indonesia ("warteg 25rb") agar kasus yang jatuh ke Gemini makin jarang
 * pulang dengan amount:null.
 */
function buildSystemInstruction(categories: Category[]): string {
  const categoryList = categories
    .map((category) => `${category.name} (${category.type})`)
    .join(', ');

  return `You are an expert Indonesian personal-finance transaction parser. Analyze the input text or receipt image.

Today's date is ${todayIso()} (format YYYY-MM-DD).

The user's existing categories are: ${categoryList}. Only choose category_suggestion from this list, or return null if none fit — never invent a category outside it.

Rules:
1. Amount: interpret Indonesian shorthand — "rb"/"ribu"/"k" = x1.000; "jt"/"juta" = x1.000.000; money slang "goceng" = 5.000, "ceban" = 10.000, "setengah juta" = 500.000. Words like "abis"/"habis"/"kena"/"cuma" before an amount signal spending. Terse inputs without a verb (e.g. "warteg 25rb") are still valid transactions: merchant/item + amount.
2. If multiple items/purchases are described in one message or receipt, SUM them into a single total; summarize items briefly in notes (for receipts with many items, list at most 5 representative items, then "(+N item lainnya)" if more exist) — do not split into separate transactions.
3. type: return only INCOME or EXPENSE (chat/OCR input never implies TRANSFER or SAVINGS_DEPOSIT/WITHDRAWAL — those require the dedicated form).
4. detected_wallet: only return a wallet name if explicitly mentioned or unambiguously implied; otherwise null.
5. If the total amount cannot be determined with reasonable confidence, return "amount": null and a short Indonesian explanation in "notes" instead of guessing.
6. date: if the text mentions a date ("8 juli", "kemarin", "3 Agustus 2025") or the receipt shows a transaction date, output it as "YYYY-MM-DD". Resolve relative words ("kemarin", "lusa") against today's date above; assume the current year when the year is omitted. If no date is mentioned or printed, return null (do NOT guess or default to today — the app fills today itself).
7. notes: a short description of the item/merchant/purpose ONLY (e.g. "Makan di warteg", "Bayar parkir", "2 kopi"). Do NOT include the amount, wallet name, or date in notes — those are stored in separate fields.

Examples (input => key fields):
- "warteg 25rb" => amount 25000, type EXPENSE, notes "Makan di warteg", date null
- "gajian 5jt masuk BCA" => amount 5000000, type INCOME, detected_wallet "BCA", notes "Gajian", date null
- "abis goceng buat parkir kemarin" => amount 5000, type EXPENSE, notes "Bayar parkir", date <yesterday as YYYY-MM-DD>
- "beli 2 kopi @15rb pake gopay 8 juli" => amount 30000, type EXPENSE, detected_wallet "gopay", notes "2 kopi", date "${todayIso().slice(0, 4)}-07-08"

Return EXACTLY a JSON object matching the defined structure, all text fields in Indonesian. Do not output markdown code blocks or additional text.`;
}

/** Skema respons JSON Mode — memaksa struktur kontrak sdd-001.md §4.2. */
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    amount: { type: Type.NUMBER, nullable: true },
    type: { type: Type.STRING, enum: ['INCOME', 'EXPENSE'] },
    notes: { type: Type.STRING },
    detected_wallet: { type: Type.STRING, nullable: true },
    category_suggestion: { type: Type.STRING, nullable: true },
    date: { type: Type.STRING, nullable: true },
  },
  required: ['amount', 'type', 'notes', 'detected_wallet', 'category_suggestion', 'date'],
};

/** Pemetaan error SDK → GeminiError berpesan Indonesia — dipakai kedua klien. */
export function mapGeminiError(error: unknown): GeminiError {
  if (error instanceof GeminiError) {
    return error;
  }
  const message = error instanceof Error ? error.message : String(error);

  if (/API key not valid|API_KEY_INVALID|PERMISSION_DENIED/i.test(message)) {
    return new GeminiError(
      'config',
      'API key Gemini ditolak Google. Periksa nilai EXPO_PUBLIC_GEMINI_API_KEY dan pembatasan key di console.',
    );
  }
  if (/NOT_FOUND|not found|is not supported/i.test(message) && /model/i.test(message)) {
    // Keputusan kickoff: laporkan, jangan ganti model diam-diam.
    return new GeminiError(
      'model',
      `Model '${MODEL_ID}' ditolak oleh API Gemini. Id model perlu ditinjau ulang — lapor ke pemilik produk.`,
    );
  }
  if (/Network request failed|Failed to fetch|fetch failed|ENOTFOUND|timeout/i.test(message)) {
    return new GeminiError(
      'network',
      'Tidak dapat terhubung ke server Gemini. Periksa koneksi internet, atau catat transaksi secara manual.',
    );
  }
  if (
    /UNAVAILABLE|high demand|overloaded|DEADLINE_EXCEEDED|Deadline expired|"code":\s*50[34]|RESOURCE_EXHAUSTED|"code":\s*429/i.test(
      message,
    )
  ) {
    // 503/504/429 dari Google bersifat sementara — jangan tampilkan JSON mentah.
    return new GeminiError(
      'api',
      'Server Gemini sedang sibuk. Tunggu sebentar lalu kirim ulang pesanmu, atau catat manual.',
    );
  }
  return new GeminiError('api', `Gemini mengembalikan kesalahan: ${message}`);
}

/** Buang pagar kode markdown bila model tetap menyertakannya (defensif). */
function stripCodeFence(raw: string): string {
  return raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
}

/**
 * Terima tanggal HANYA bila 'YYYY-MM-DD' yang benar-benar valid (tolak string
 * bebas atau tanggal mustahil seperti 2026-02-30) — selain itu null → app isi
 * hari ini sendiri.
 */
function normalizeDate(raw: unknown): string | null {
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
    return null;
  }
  const value = raw.trim();
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null;
  }
  return value;
}

function normalizeResult(raw: unknown, categories: Category[]): GeminiParseResult {
  if (typeof raw !== 'object' || raw === null) {
    throw new GeminiError('parse', 'Respons Gemini bukan objek JSON yang valid.');
  }
  const record = raw as Record<string, unknown>;

  const amount =
    typeof record.amount === 'number' && Number.isFinite(record.amount) && record.amount > 0
      ? record.amount
      : null;
  const type = record.type === 'INCOME' ? 'INCOME' : 'EXPENSE';
  const notes = typeof record.notes === 'string' ? record.notes.trim() : '';
  const detectedWallet =
    typeof record.detected_wallet === 'string' && record.detected_wallet.trim() !== ''
      ? record.detected_wallet.trim()
      : null;

  // Validasi ulang saran kategori terhadap kategori nyata pengguna —
  // kembalikan nama kanonis dari store, atau null (AC Story 3.2).
  const suggestionRaw =
    typeof record.category_suggestion === 'string' ? record.category_suggestion.trim() : '';
  const matchedCategory = categories.find(
    (category) =>
      category.type === type && category.name.toLowerCase() === suggestionRaw.toLowerCase(),
  );

  return {
    amount,
    type,
    notes,
    detected_wallet: detectedWallet,
    // Gemini tak mendeteksi transfer/dompet tujuan (prompt hanya INCOME/EXPENSE).
    detected_destination_wallet: null,
    category_suggestion: matchedCategory?.name ?? null,
    date: normalizeDate(record.date),
  };
}

async function requestParse(parts: Part[], categories: Category[]): Promise<GeminiParseResult> {
  const ai = getGeminiClient();

  let rawText: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: buildSystemInstruction(categories),
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        // Panduan Gemini 3.x (docs/docs_gemini.md): sampling params
        // (temperature/topP/topK) TIDAK direkomendasikan — determinisme
        // dijaga lewat system instruction. Kedalaman berpikir dikontrol
        // thinking_level; LOW cukup untuk ekstraksi terstruktur sederhana
        // (default MEDIUM menambah latensi — NFR parsing < 2 dtk).
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        maxOutputTokens: 512,
        // Tanpa timeout, retry internal SDK atas 503 bisa menggantung >45 dtk
        // dengan input chat terkunci (temuan E2E) — batasi total 30 dtk.
        httpOptions: { timeout: 30_000 },
      },
    });
    rawText = response.text;
  } catch (error) {
    throw mapGeminiError(error);
  }

  if (!rawText) {
    throw new GeminiError('parse', 'Gemini mengembalikan respons kosong.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(rawText));
  } catch {
    throw new GeminiError('parse', 'Respons Gemini bukan JSON murni yang bisa dibaca.');
  }
  return normalizeResult(parsed, categories);
}

/** Fallback parsing teks chat — dipanggil HANYA saat tryLocalParse tidak confident. */
export function parseTransactionText(
  text: string,
  categories: Category[],
): Promise<GeminiParseResult> {
  return requestParse([{ text }], categories);
}

/** OCR struk — selalu lewat Gemini (gambar tak melalui pengklasifikasi lokal). */
export function parseReceiptImage(
  base64Jpeg: string,
  categories: Category[],
): Promise<GeminiParseResult> {
  return requestParse(
    [
      { inlineData: { mimeType: 'image/jpeg', data: base64Jpeg } },
      {
        text: 'Ekstrak transaksi dari foto struk belanja ini (total akhir + ringkasan item ke notes).',
      },
    ],
    categories,
  );
}
