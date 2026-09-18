/**
 * Kartu target tabungan (Epic 4.5): progress bar current/target + sisa hari
 * menuju tenggat, aksi Setor/Tarik, tap kartu = ubah, tombol hapus ber-guard
 * (dialog blokir bila masih bersaldo — AC 4.5).
 */
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { Trash2 } from 'lucide-react-native';
import { Alert, Pressable, Text, ToastAndroid, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useSavingsStore, type SavingsGoal } from '@/store/use-savings-store';
import { formatRupiah, formatRupiahCompact, formatTanggal } from '@/utils/format';

interface GoalCardProps {
  goal: SavingsGoal;
  onEdit: (goal: SavingsGoal) => void;
  onAction: (goal: SavingsGoal, mode: 'deposit' | 'withdraw') => void;
}

export function GoalCard({ goal, onEdit, onAction }: GoalCardProps) {
  const theme = useTheme();
  const ratio = goal.target_amount > 0 ? goal.current_amount / goal.target_amount : 0;
  const percent = Math.round(ratio * 100);
  const daysLeft = goal.target_date
    ? differenceInCalendarDays(parseISO(goal.target_date), new Date())
    : null;

  const handleDelete = () => {
    if (goal.current_amount > 0) {
      // AC 4.5: hapus DIBLOKIR sampai saldo nol — arahkan tarik dana dulu.
      Alert.alert(
        'Tidak Bisa Dihapus',
        `Target ini masih memiliki saldo ${formatRupiah(goal.current_amount)}. ` +
          'Tarik semua dana ke dompet pilihanmu dulu sebelum target dihapus.',
        [
          { text: 'Nanti', style: 'cancel' },
          { text: 'Tarik Dana', onPress: () => onAction(goal, 'withdraw') },
        ],
      );
      return;
    }
    Alert.alert('Hapus Target?', `Target "${goal.name}" akan dihapus permanen.`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          const result = await useSavingsStore.getState().deleteGoal(goal.id);
          ToastAndroid.show(
            result.success ? 'Target dihapus' : (result.reason ?? 'Gagal menghapus'),
            ToastAndroid.SHORT,
          );
        },
      },
    ]);
  };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onEdit(goal)}
      className="gap-3 rounded-2xl border border-hairline bg-surface p-4 shadow-card active:opacity-90">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Text className="font-sans text-base font-bold text-content">{goal.name}</Text>
          <Text className="font-sans text-sm text-secondary">
            {formatRupiah(goal.current_amount)} dari {formatRupiahCompact(goal.target_amount)} (
            {percent}%)
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Hapus target ${goal.name}`}
          onPress={handleDelete}
          className="rounded-full p-2 active:bg-surface-2">
          <Trash2 color={theme.muted} size={18} />
        </Pressable>
      </View>

      <View className="h-2.5 overflow-hidden rounded-full bg-surface-2">
        <View
          className="h-2.5 rounded-full"
          style={{
            width: `${Math.min(percent, 100)}%`,
            backgroundColor: percent >= 100 ? theme.income : theme.accent,
          }}
        />
      </View>

      {goal.target_date && (
        <Text className="font-sans text-xs text-secondary">
          Tenggat {formatTanggal(goal.target_date)}
          {daysLeft !== null &&
            (daysLeft >= 0 ? ` · sisa ${daysLeft} hari` : ` · lewat ${-daysLeft} hari`)}
        </Text>
      )}

      <View className="flex-row gap-3">
        <Pressable
          accessibilityRole="button"
          onPress={() => onAction(goal, 'deposit')}
          className="flex-1 items-center rounded-xl bg-brand py-2.5 active:opacity-80">
          <Text className="font-sans font-semibold text-white">Setor</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => onAction(goal, 'withdraw')}
          disabled={goal.current_amount <= 0}
          className={`flex-1 items-center rounded-xl bg-surface-2 py-2.5 ${
            goal.current_amount <= 0 ? 'opacity-50' : 'active:opacity-80'
          }`}>
          <Text className="font-sans font-semibold text-content">Tarik</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
