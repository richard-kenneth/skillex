import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../lib/api';
import { RefreshCw, MessageSquare, Video } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function ExchangesScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'exchanges' | 'requests'>('exchanges');

  const { data: exchanges, refetch: refetchExchanges, isRefetching: isRefetchingExchanges } = useQuery({
    queryKey: ['exchanges'],
    queryFn: () => apiFetch('/exchanges'),
    enabled: tab === 'exchanges',
  });

  const { data: requests, refetch: refetchRequests, isRefetching: isRefetchingRequests } = useQuery({
    queryKey: ['requests'],
    queryFn: () => apiFetch('/exchanges/requests'),
    enabled: tab === 'requests',
  });

  const renderExchangeItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(tabs)/exchanges/${item.id}` as any)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Exchange #{item.id.slice(0, 8)}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{item.status || 'ACTIVE'}</Text>
        </View>
      </View>

      <Text style={styles.cardDetail}>Requested: {item.requestedSkill?.name || 'Skill'}</Text>
      <Text style={styles.cardDetail}>Offered: {item.offeredSkill?.name || 'Skill'}</Text>

      <View style={styles.actionRow}>
        <View style={styles.iconButton}>
          <MessageSquare size={16} color="#818cf8" />
          <Text style={styles.iconButtonText}>Chat</Text>
        </View>
        <View style={styles.iconButton}>
          <Video size={16} color="#22c55e" />
          <Text style={styles.iconButtonText}>Video Call</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderRequestItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Request from {item.sender?.name || 'User'}</Text>
        <View style={[styles.statusBadge, item.status === 'PENDING' && styles.pendingBadge]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <Text style={styles.cardDetail}>Skill Requested: {item.requestedSkill?.name}</Text>
      <Text style={styles.cardDetail}>Points Proposal: {item.pointsProposal} pts</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Sub tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, tab === 'exchanges' && styles.activeTabButton]}
          onPress={() => setTab('exchanges')}
        >
          <Text style={[styles.tabText, tab === 'exchanges' && styles.activeTabText]}>Active Exchanges</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, tab === 'requests' && styles.activeTabButton]}
          onPress={() => setTab('requests')}
        >
          <Text style={[styles.tabText, tab === 'requests' && styles.activeTabText]}>Requests</Text>
        </TouchableOpacity>
      </View>

      {tab === 'exchanges' ? (
        <FlatList
          data={exchanges || []}
          keyExtractor={(item) => item.id}
          renderItem={renderExchangeItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefetchingExchanges} onRefresh={refetchExchanges} tintColor="#6366f1" />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <RefreshCw size={32} color="#71717a" />
              <Text style={styles.emptyTitle}>No Active Exchanges</Text>
              <Text style={styles.emptyText}>Find matches and send exchange requests to get started!</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={requests || []}
          keyExtractor={(item) => item.id}
          renderItem={renderRequestItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefetchingRequests} onRefresh={refetchRequests} tintColor="#6366f1" />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MessageSquare size={32} color="#71717a" />
              <Text style={styles.emptyTitle}>No Requests</Text>
              <Text style={styles.emptyText}>Incoming and outgoing exchange requests will show up here.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  tabBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#18181b',
  },
  activeTabButton: {
    backgroundColor: '#6366f1',
  },
  tabText: {
    color: '#a1a1aa',
    fontWeight: '600',
    fontSize: 14,
  },
  activeTabText: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#18181b',
    borderColor: '#27272a',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statusBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pendingBadge: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
  },
  statusText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '600',
  },
  cardDetail: {
    color: '#a1a1aa',
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButtonText: {
    color: '#e4e4e7',
    fontSize: 13,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 12,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#a1a1aa',
    fontSize: 14,
    textAlign: 'center',
  },
});
