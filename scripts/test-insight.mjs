/**
 * Uji fungsi murni mesin insight & analitik Epic 4 (utils/period.ts,
 * utils/analytics.ts, utils/insight.ts) — jalankan: npm run test:insight
 */
import assert from 'node:assert/strict';

import {
  buildCategoryColorMap,
  computeCashflow,
  topCategoryDeltas,
  withPercentages,
} from '../src/utils/analytics.ts';
import {
  crossedBudgetThreshold,
  isAnomalousAmount,
  mean,
  percentChange,
  predictBudgetExhausted,
  savingRate,
  selectDailyInsight,
  stddev,
  topCategoryStreak,
} from '../src/utils/insight.ts';
import {
  bucketDailyToWeeks,
  completeMonthlySummary,
  getRecentWeekRanges,
  getWeekRange,
  groupIncomeExpense,
  monthKey,
  previousMonthKey,
  recentMonthsSummary,
  weekEndLabel,
} from '../src/utils/period.ts';

let passed = 0;
const check = (label, actual, expected) => {
  assert.deepEqual(actual, expected, `${label}: diharapkan ${JSON.stringify(expected)}, dapat ${JSON.stringify(actual)}`);
  passed += 1;
  console.log(`  ✓ ${label}`);
};

const FRI = new Date(2026, 6, 3); // Jumat 3 Juli 2026

console.log('— period.ts —');
check('monthKey Juli 2026', monthKey(FRI), '2026-07');
check('previousMonthKey → Juni', previousMonthKey(FRI), '2026-06');
check('previousMonthKey Januari → Desember tahun lalu', previousMonthKey(new Date(2026, 0, 15)), '2025-12');
check('minggu mulai MINGGU (firstDay 0)', getWeekRange(FRI, 0), { start: '2026-06-28', end: '2026-07-04' });
check('minggu mulai SENIN (firstDay 1)', getWeekRange(FRI, 1), { start: '2026-06-29', end: '2026-07-05' });
{
  const ranges = getRecentWeekRanges(3, 0, FRI);
  check('3 minggu terakhir — urut LAMA→BARU', ranges.map((r) => r.start), ['2026-06-14', '2026-06-21', '2026-06-28']);
  check('elemen terakhir = minggu berjalan', ranges[2].end, '2026-07-04');
  check("label akhir minggu '4/7'", weekEndLabel(ranges[2]), '4/7');
}
{
  // recentMonthsSummary (Fase B): N bulan terakhir, lintas-tahun, kosong = 0.
  const rows = [
    { period: '2025-12', income: 100, expense: 40 },
    { period: '2026-01', income: 200, expense: 50 },
  ];
  const trend = recentMonthsSummary(3, new Date(2026, 0, 15), rows); // anchor Jan 2026
  check('recentMonthsSummary 3 bulan lintas-tahun', trend.map((m) => m.period), ['2025-11', '2025-12', '2026-01']);
  check('bulan kosong (Nov) → 0', trend[0], { period: '2025-11', income: 0, expense: 0 });
  check('bulan berdata dipertahankan (Des income 100)', trend[1].income, 100);
  check('urut LAMA→BARU, terakhir = anchor', trend[2].period, '2026-01');
}

console.log('— analytics.ts —');
{
  const { slices, totalMonth } = withPercentages([
    { category_id: 1, name: 'A', color: '#111', icon: 'x', total: 750 },
    { category_id: 2, name: 'B', color: '#222', icon: 'x', total: 250 },
    { category_id: 3, name: 'C', color: '#333', icon: 'x', total: 0 },
  ]);
  check('total bulan = 1000 (baris 0 dibuang)', totalMonth, 1000);
  check('persentase 75/25', slices.map((s) => s.percent), [75, 25]);
}
check('withPercentages kosong → total 0', withPercentages([]).totalMonth, 0);

console.log('— analytics.ts: arus kas & Δ kategori (Fase A) —');
{
  const cf = computeCashflow(5_000_000, 3_500_000);
  check('computeCashflow net = income − expense', cf.net, 1_500_000);
  check('computeCashflow savingRate 30%', cf.savingRate, 30);
  check('computeCashflow income 0 → savingRate null', computeCashflow(0, 100).savingRate, null);
  check('computeCashflow defisit → net negatif', computeCashflow(100, 300).net, -200);
}
{
  const current = [
    { category_id: 1, name: 'Makanan', color: '#f00', icon: 'x', total: 300_000 },
    { category_id: 2, name: 'Transport', color: '#0f0', icon: 'x', total: 50_000 },
  ];
  const previous = [
    { category_id: 1, name: 'Makanan', color: '#f00', icon: 'x', total: 200_000 },
    { category_id: 3, name: 'Belanja', color: '#00f', icon: 'x', total: 500_000 }, // hilang bln ini
  ];
  const deltas = topCategoryDeltas(current, previous);
  check('mover teratas = Belanja (turun 500rb)', deltas[0].name, 'Belanja');
  check('Belanja delta −500rb', deltas[0].delta, -500_000);
  check('Makanan naik +50%', deltas.find((d) => d.name === 'Makanan').percent, 50);
  check('Transport baru (previous 0) → percent null', deltas.find((d) => d.name === 'Transport').percent, null);
  check('urut |delta| menurun', deltas.map((d) => d.name), ['Belanja', 'Makanan', 'Transport']);
}
{
  // buildCategoryColorMap: distinct per kategori (grafik Analitik).
  const palette = ['#aa0000', '#00bb00', '#0000cc'];
  const m = buildCategoryColorMap([1, 2, 3], palette);
  check('assign palet per indeks', [m.get(1), m.get(2), m.get(3)], palette);
  const beyond = buildCategoryColorMap([10, 11, 12, 13], ['#111111', '#222222']);
  check('kategori 13+ tetap unik (fallback HSL)', new Set([beyond.get(10), beyond.get(11), beyond.get(12), beyond.get(13)]).size, 4);
  check('fallback berformat hex', /^#[0-9a-f]{6}$/i.test(beyond.get(13)), true);
  check('null (Tanpa Kategori) → warna netral', buildCategoryColorMap([null, 1], palette).get(null), '#64748B');
}

console.log('— insight.ts: perubahan & saving rate —');
check('percentChange 1.2jt vs 900rb → +33,3%', percentChange(1_200_000, 900_000), 33.3);
check('percentChange pembanding 0 → null', percentChange(500, 0), null);
check('savingRate 10jt income, 8.85jt expense → 11.5', savingRate(10_000_000, 8_850_000), 11.5);
check('savingRate income 0 → null', savingRate(0, 500_000), null);
check('savingRate boros → negatif', savingRate(1_000_000, 1_500_000), -50);

console.log('— insight.ts: streak kategori —');
{
  const rows = [
    { month: '2026-07', category_id: 1, total: 900 }, { month: '2026-07', category_id: 2, total: 100 },
    { month: '2026-06', category_id: 1, total: 800 }, { month: '2026-06', category_id: 2, total: 700 },
    { month: '2026-05', category_id: 1, total: 500 }, { month: '2026-05', category_id: 3, total: 400 },
    { month: '2026-04', category_id: 2, total: 600 }, { month: '2026-04', category_id: 1, total: 100 },
  ];
  check('streak kategori 1 selama 3 bulan (putus di April)', topCategoryStreak(rows), { categoryId: 1, months: 3 });
}
check('streak 1 bulan data → null', topCategoryStreak([{ month: '2026-07', category_id: 1, total: 10 }]), null);
check('streak tanpa data → null', topCategoryStreak([]), null);

console.log('— insight.ts: anomali (sdd-001 §5) —');
check('mean [10,20,30]', mean([10, 20, 30]), 20);
check('stddev [10,10,10] = 0', stddev([10, 10, 10]), 0);
{
  const history = [20_000, 25_000, 22_000, 18_000, 24_000]; // mean 21.800, σ ≈ 2.482
  check('histori 5 tx: 100rb = anomali', isAnomalousAmount(history, 100_000), true);
  check('histori 5 tx: 25rb = normal', isAnomalousAmount(history, 25_000), false);
  check('histori 4 tx (<5) → tidak pernah anomali', isAnomalousAmount(history.slice(0, 4), 1_000_000), false);
}
check('stddev 0 (nominal seragam): sedikit lebih besar = anomali', isAnomalousAmount([10, 10, 10, 10, 10], 11), true);

console.log('— insight.ts: prediksi budget habis —');
check('1jt budget, 500rb dalam 10 hari → habis tgl 20', predictBudgetExhausted(1_000_000, 500_000, 10, 31, '2026-07'), '2026-07-20');
check('laju aman (proyeksi > akhir bulan) → null', predictBudgetExhausted(3_100_000, 100_000, 10, 31, '2026-07'), null);
check('belum ada belanja → null', predictBudgetExhausted(1_000_000, 0, 10, 31, '2026-07'), null);
check('tanpa budget → null', predictBudgetExhausted(0, 500_000, 10, 31, '2026-07'), null);

console.log('— insight.ts: lintasan ambang anggaran (Epic 7.3) —');
// budget 1jt, ambang 80% = 800rb.
check('menyeberang dari bawah (750rb→850rb) → true', crossedBudgetThreshold(750_000, 850_000, 1_000_000), true);
check('tepat menyentuh ambang (700rb→800rb) → true', crossedBudgetThreshold(700_000, 800_000, 1_000_000), true);
check('sudah di atas ambang sebelumnya (820rb→900rb) → false', crossedBudgetThreshold(820_000, 900_000, 1_000_000), false);
check('masih di bawah ambang (500rb→700rb) → false', crossedBudgetThreshold(500_000, 700_000, 1_000_000), false);
check('budget 0 → false (tak ada anggaran)', crossedBudgetThreshold(0, 100_000, 0), false);
check('rasio kustom 90% (850rb→950rb) → true', crossedBudgetThreshold(850_000, 950_000, 1_000_000, 0.9), true);

console.log('— insight.ts: pemilihan Insight Hari Ini —');
{
  const sig = (over) => ({
    todayTotal: 0,
    todayTopCategory: null,
    largestTodayAmount: 0,
    largestTodayCategoryHistory: [],
    dailyAverageThisMonth: null,
    budgetExhaustDate: null,
    noSpendStreakDays: 0,
    ...over,
  });
  const anomalyHistory = [20_000, 25_000, 22_000, 18_000, 24_000]; // mean 21.800, σ ≈ 2.482

  // Prioritas: anomali mengalahkan budget & pace sekaligus.
  check('anomali menang atas budget/pace', selectDailyInsight(sig({
    todayTotal: 100_000, largestTodayAmount: 100_000, largestTodayCategoryHistory: anomalyHistory,
    dailyAverageThisMonth: 30_000, budgetExhaustDate: '2026-07-20',
  })).kind, 'anomaly');

  // Tanpa anomali → budget menang atas pace.
  check('budget menang atas pace', selectDailyInsight(sig({
    todayTotal: 50_000, largestTodayAmount: 50_000,
    dailyAverageThisMonth: 30_000, budgetExhaustDate: '2026-07-20',
  })).kind, 'budget');

  // Histori < 5 → BUKAN anomali (jatuh ke pace).
  check('histori <5 bukan anomali → pace-over', selectDailyInsight(sig({
    todayTotal: 40_000, largestTodayAmount: 40_000, largestTodayCategoryHistory: [1, 2, 3, 4],
    dailyAverageThisMonth: 30_000,
  })).kind, 'pace-over');

  // Pace di atas rata-rata harian → pace-over + persen |percentChange|.
  {
    const r = selectDailyInsight(sig({ todayTotal: 40_000, largestTodayAmount: 40_000, dailyAverageThisMonth: 30_000 }));
    check('pace-over kind', r.kind, 'pace-over');
    check('pace-over persen 33,3', r.pacePercent, 33.3);
  }

  // Pace di bawah rata-rata → pace-under (persen absolut).
  {
    const r = selectDailyInsight(sig({ todayTotal: 20_000, largestTodayAmount: 20_000, dailyAverageThisMonth: 40_000 }));
    check('pace-under kind', r.kind, 'pace-under');
    check('pace-under persen 50', r.pacePercent, 50);
  }

  // Hari-1 bulan (avg null) & tak ada sinyal → today-plain.
  check('avg null → today-plain', selectDailyInsight(sig({
    todayTotal: 40_000, largestTodayAmount: 40_000, dailyAverageThisMonth: null,
  })).kind, 'today-plain');

  // Tanpa pengeluaran hari ini → streak-zero (bawa streakDays).
  {
    const r = selectDailyInsight(sig({ todayTotal: 0, noSpendStreakDays: 3 }));
    check('streak-zero kind', r.kind, 'streak-zero');
    check('streak-zero streakDays', r.streakDays, 3);
  }
}

console.log('— Epic 5: agregasi periode Transaction Hub —');
{
  const rows = [
    { period: '2026-06', type: 'INCOME', total: 1000 },
    { period: '2026-06', type: 'EXPENSE', total: 400 },
    { period: '2026-07', type: 'EXPENSE', total: 250 },
  ];
  check('groupIncomeExpense gabung & urut', groupIncomeExpense(rows), [
    { period: '2026-06', income: 1000, expense: 400 },
    { period: '2026-07', income: 0, expense: 250 },
  ]);
}
{
  const rows = [
    { date: '2026-07-03', type: 'EXPENSE', total: 100_000 },
    { date: '2026-07-03', type: 'INCOME', total: 500_000 },
    { date: '2026-07-15', type: 'EXPENSE', total: 75_000 },
    { date: '2026-07-31', type: 'EXPENSE', total: 25_000 },
  ];
  const buckets = bucketDailyToWeeks(rows, 2026, 7, 0);
  check('Juli 2026 (mulai Minggu) → 5 bucket', buckets.length, 5);
  check('Minggu 1 mulai 28 Jun', buckets[0].range.start, '2026-06-28');
  check('3 Jul masuk Minggu 1 (income+expense)', [buckets[0].income, buckets[0].expense], [500_000, 100_000]);
  check('15 Jul masuk Minggu 3', buckets[2].expense, 75_000);
  check('31 Jul masuk Minggu 5', buckets[4].expense, 25_000);
  // AC 5.3: total bucket = penjumlahan manual data mentah.
  const totalExpense = buckets.reduce((sum, b) => sum + b.expense, 0);
  check('AC akurasi: total expense bucket = 200.000', totalExpense, 200_000);

  const mondayFirst = bucketDailyToWeeks(rows, 2026, 7, 1);
  check('Juli 2026 (mulai Senin) → Minggu 1 mulai 29 Jun', mondayFirst[0].range.start, '2026-06-29');
}
{
  const filled = completeMonthlySummary(2026, [
    { period: '2026-07', income: 10, expense: 5 },
  ]);
  check('completeMonthlySummary → 12 bulan', filled.length, 12);
  check('bulan kosong = 0', filled[0], { period: '2026-01', income: 0, expense: 0 });
  check('bulan berdata dipertahankan', filled[6], { period: '2026-07', income: 10, expense: 5 });
}

console.log(`\nSeluruh ${passed} pemeriksaan LULUS ✅`);
