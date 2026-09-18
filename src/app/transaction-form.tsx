/**
 * Rute modal form transaksi (Story 2.3 + 2.5).
 * Mode edit (Epic 6.2): buka dengan router.push({ pathname: '/transaction-form',
 * params: { id } }) — baris dimuat dari SQLite lalu form di-prefill.
 */
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { TransactionForm } from '@/components/transactions/transaction-form';
import { getDatabase } from '@/db/client';
import type { Transaction } from '@/store/use-transaction-store';

export default function TransactionFormRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [initialValues, setInitialValues] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(Boolean(id));

  useEffect(() => {
    if (!id) {
      return;
    }
    let cancelled = false;
    (async () => {
      const db = await getDatabase();
      const row = await db.getFirstAsync<Transaction>(
        'SELECT * FROM transactions WHERE id = ?;',
        Number(id),
      );
      if (!cancelled) {
        setInitialValues(row ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <View className="flex-1 bg-app" />;
  }

  return (
    <>
      <Stack.Screen options={{ title: id ? 'Ubah Transaksi' : 'Catat Transaksi' }} />
      <TransactionForm
        mode={id ? 'edit' : 'add'}
        initialValues={initialValues ?? undefined}
      />
    </>
  );
}
