/**
 * Klien Gemini Monthly Insight (Epic 4.3 — sdd-001.md §4.3): pelatih
 * finansial bulanan. Payload 9 field dihitung 100% lokal sebelum dikirim;
 * field tanpa histori = null apa adanya (aturan v1.3 anti-halusinasi).
 * Panggilan hanya sekali/bulan — hasil di-cache di app_settings oleh
 * hooks/use-monthly-insight.ts.
 */
import { ThinkingLevel, Type } from '@google/genai';

import { GeminiError, getGeminiClient, mapGeminiError, MODEL_ID } from '@/ai/gemini-parser';

/** Payload input — kontrak persis sdd-001.md §4.3 (v1.2/v1.3). */
export interface MonthlyInsightPayload {
  month: string;
  status: 'boros' | 'hemat';
  saving_rate: string | null;
  saving_rate_previous_month: string | null;
  top_category: string | null;
  top_category_streak_months: number | null;
  largest_single_transaction: { amount: number; category: string; notes: string | null } | null;
  nearest_goal_progress: { name: string; percent: number; days_remaining: number } | null;
  prediction_budget_exhausted: string | null;
}

export interface MonthlyInsightResult {
  status_title: string;
  motivation_text: string;
}

/** System prompt persis sdd-001.md §4.3 (v1.3). */
const SYSTEM_INSTRUCTION = `You are an empathetic, witty personal financial coach. Analyze the raw aggregated monthly metrics provided by the app, including the trend vs last month, category spending streaks, nearest savings goal progress, and the largest single transaction.
Any field may be null if the user doesn't have enough history yet (e.g. first month of usage) — in that case, simply omit that angle rather than mentioning missing data or fabricating a comparison.
Weave the 1-2 most narratively interesting signals into a short, punchy, highly personal summary in Indonesian — do not mechanically restate every field.
Return EXACTLY a JSON object. Keep text short and punchy. max_tokens constraint: 180.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    status_title: { type: Type.STRING },
    motivation_text: { type: Type.STRING },
  },
  required: ['status_title', 'motivation_text'],
};

export async function generateMonthlyInsight(
  payload: MonthlyInsightPayload,
): Promise<MonthlyInsightResult> {
  const ai = getGeminiClient();

  let rawText: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: [{ role: 'user', parts: [{ text: JSON.stringify(payload) }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        // Narasi dikekang system prompt (max_tokens 180 semantik SDD), tapi
        // kuota ini juga termakan thinking tokens Gemini 3.x — 256 terbukti
        // memotong JSON di tengah ("bukan JSON murni"). 768 aman untuk
        // panggilan sekali-sebulan.
        maxOutputTokens: 768,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
    parsed = JSON.parse(rawText.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, ''));
  } catch {
    throw new GeminiError('parse', 'Respons Gemini bukan JSON murni yang bisa dibaca.');
  }
  const record = parsed as Record<string, unknown>;
  if (typeof record?.status_title !== 'string' || typeof record?.motivation_text !== 'string') {
    throw new GeminiError('parse', 'Struktur respons insight tidak sesuai kontrak.');
  }
  return { status_title: record.status_title, motivation_text: record.motivation_text };
}
