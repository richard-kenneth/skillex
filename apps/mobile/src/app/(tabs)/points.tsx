import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../lib/api';
import { Coins, ArrowUpRight, ArrowDownLeft, Wallet } from 'lucide-react-native';

export default function PointsScreen() {
  const queryClient = useQueryClient();
  const [purchaseAmount, setPurchaseAmount] = useState('1000');

  const { data: balanceData, refetch, isRefetching } = useQuery({
    queryKey: ['points-balance'],
    queryFn: () => apiFetch('/points/balance'),
  });

  const { data: transactions } = useQuery({
    queryKey: ['points-transactions'],
    queryFn: () => apiFetch('/points/transactions'),
  });

  const purchaseMutation = useMutation({
    mutationFn: (amount: number) =>
      apiFetch('/points/purchase', {
        method: 'POST',
        body: JSON.stringify({ amount }),
      }),
    onSuccess: (data: any) => {
      Alert.alert('Payment Link', `Redirecting to payment: ${data.paymentUrl || 'Initiated'}`);
      queryClient.invalidateQueries({ queryKey: ['points-balance'] });
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message || 'Purchase failed');
    },
  });

  const handlePurchase = () => {
    const amount = parseInt(purchaseAmount, 10);
    if (isNaN(amount) || amount < 500) {
      Alert.alert('Invalid Amount', 'Minimum purchase is 500 points.');
      return;
    }
    purchaseMutation.mutate(amount);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6366f1" />}
    >
      {/* Wallet Card */}
      <View style={styles.walletCard}>
        <View style={styles.walletHeader}>
          <Wallet size={24} color="#818cf8" />
          <Text style={styles.walletLabel}>Points Balance</Text>
        </View>

        <Text style={styles.balanceText}>{balanceData?.balance ?? 0} pts</Text>
        <Text style={styles.usdEquivalent}>≈ ${((balanceData?.balance ?? 0) * 0.01).toFixed(2)} USD</Text>
      </View>

      {/* Purchase Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Purchase Points</Text>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Amount (min 500)"
            placeholderTextColor="#666"
            keyboardType="number-pad"
            value={purchaseAmount}
            onChangeText={setPurchaseAmount}
          />
          <TouchableOpacity style={styles.buyButton} onPress={handlePurchase} disabled={purchaseMutation.isPending}>
            <Text style={styles.buyButtonText}>Buy Now</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Transactions History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Transaction History</Text>

        {transactions && transactions.length > 0 ? (
          transactions.map((tx: any) => (
            <View key={tx.id} style={styles.txRow}>
              <View style={styles.txIcon}>
                {tx.amount > 0 ? <ArrowDownLeft size={20} color="#22c55e" /> : <ArrowUpRight size={20} color="#ef4444" />}
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txTitle}>{tx.description || tx.type}</Text>
                <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleDateString()}</Text>
              </View>
              <Text style={[styles.txAmount, tx.amount > 0 ? styles.positive : styles.negative]}>
                {tx.amount > 0 ? `+${tx.amount}` : tx.amount} pts
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No transaction history yet.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  content: {
    padding: 20,
    gap: 24,
  },
  walletCard: {
    backgroundColor: '#18181b',
    borderColor: '#27272a',
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    gap: 8,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  walletLabel: {
    color: '#a1a1aa',
    fontSize: 14,
    fontWeight: '500',
  },
  balanceText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  usdEquivalent: {
    color: '#818cf8',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: '#18181b',
    borderColor: '#27272a',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    color: '#ffffff',
    fontSize: 16,
  },
  buyButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  buyButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderColor: '#27272a',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  txIcon: {
    width: 36,
    height: 36,
    backgroundColor: '#27272a',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  txDate: {
    color: '#71717a',
    fontSize: 12,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  positive: {
    color: '#22c55e',
  },
  negative: {
    color: '#ef4444',
  },
  emptyText: {
    color: '#71717a',
    fontStyle: 'italic',
    fontSize: 14,
  },
});
