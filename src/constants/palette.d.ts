/** Deklarasi tipe untuk palette.js (CommonJS) agar aman diimpor dari TS. */

export type TealShade =
  | 50
  | 100
  | 200
  | 300
  | 400
  | 500
  | 600
  | 700
  | 800
  | 900
  | 950;

export type SemanticTokens = {
  app: string;
  surface: string;
  surface2: string;
  hairline: string;
  content: string;
  secondary: string;
  muted: string;
  brand: string;
  accent: string;
  income: string;
  expense: string;
  warning: string;
};

export const teal: Record<TealShade, string>;
export const categoryColors: string[];
export const chartCategoryColors: string[];
export const semantic: { light: SemanticTokens; dark: SemanticTokens };
export const heroGradient: string[];
