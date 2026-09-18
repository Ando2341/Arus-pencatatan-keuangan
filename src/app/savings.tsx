/**
 * Layar Tabungan & Target (Epic 4.5 — FR-06). Rute stack khusus (keputusan
 * perencanaan Epic 4), dibuka dari kartu Total Tabungan di Dashboard.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { GoalCard } from '@/components/savings/goal-card';
import { GoalFormModal } from '@/components/savings/goal-form-modal';
import { SavingsActionModal } from '@/components/savings/savings-action-modal';
import { heroGradient } from '@/constants/palette';
import { useTheme } from '@/hooks/use-theme';
import { useSavingsStore, type SavingsGoal } from '@/store/use-savings-store';
import { formatRupiah } from '@/utils/format';

export default function SavingsScreen() {
  const theme = useTheme();
  const goals = useSavingsStore((state) => state.goals);
  const fetchGoals = useSavingsStore((state) => state.fetchGoals);
  const [formTarget, setFormTarget] = useState<SavingsGoal | null | 'new'>(null);
  const [action, setAction] = useState<{ goal: SavingsGoal; mode: 'deposit' | 'withdraw' } | null>(
    null,
  );

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const totalSaved = goals.reduce((sum, goal) => sum + goal.current_amount, 0);

  return (
    <ScrollView
      className="flex-1 bg-app"
      contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 14 }}>
      <View className="overflow-hidden rounded-3xl shadow-card-lg">
        <LinearGradient
          colors={heroGradient as [string, string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 20 }}>
          <Text className="font-sans text-sm font-medium text-white/80">Total Tabungan</Text>
          <Text className="font-sans text-2xl font-extrabold tracking-tight text-white">
            {formatRupiah(totalSaved)}
          </Text>
        </LinearGradient>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => setFormTarget('new')}
        className="flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-hairline py-3 active:bg-surface-2">
        <Plus color={theme.accent} size={18} />
        <Text className="font-sans font-semibold text-accent">Buat Target Baru</Text>
      </Pressable>

      {goals.length === 0 ? (
        <View className="items-center px-4 py-10">
          <Text className="text-center font-sans text-secondary">
            Belum ada target tabungan. Buat target pertamamu — misalnya dana darurat atau liburan —
            lalu setor dana dari dompet operasionalmu.
          </Text>
        </View>
      ) : (
        goals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            onEdit={(g) => setFormTarget(g)}
            onAction={(g, mode) => setAction({ goal: g, mode })}
          />
        ))
      )}

      {formTarget !== null && (
        <GoalFormModal
          initial={formTarget === 'new' ? null : formTarget}
          onClose={() => setFormTarget(null)}
        />
      )}
      {action !== null && (
        <SavingsActionModal goal={action.goal} mode={action.mode} onClose={() => setAction(null)} />
      )}
    </ScrollView>
  );
}
