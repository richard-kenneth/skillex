import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../lib/api';
import { Coins, BookOpen, Star, Sparkles, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function DashboardScreen() {
  const router = useRouter();

  const { data: user, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiFetch('/users/me'),
  });

  const offeringSkills = user?.skills?.filter((s: any) => s.type === 'OFFERING') || [];
  const seekingSkills = user?.skills?.filter((s: any) => s.type === 'SEEKING') || [];
  const receivedReviews = user?.receivedReviews || [];
  const avgRating = receivedReviews.length > 0
    ? (receivedReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / receivedReviews.length).toFixed(1)
    : '0.0';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6366f1" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'Skill Exchanger'}</Text>
        </View>

        <TouchableOpacity style={styles.pointsBadge} onPress={() => router.push('/points')}>
          <Coins size={18} color="#eab308" />
          <Text style={styles.pointsText}>{user?.pointsBalance ?? 0} pts</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Coins size={20} color="#6366f1" style={styles.statIcon} />
          <Text style={styles.statValue}>{user?.pointsBalance ?? 0}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>

        <View style={styles.statCard}>
          <BookOpen size={20} color="#22c55e" style={styles.statIcon} />
          <Text style={styles.statValue}>{offeringSkills.length}</Text>
          <Text style={styles.statLabel}>Offering</Text>
        </View>

        <View style={styles.statCard}>
          <Star size={20} color="#eab308" style={styles.statIcon} />
          <Text style={styles.statValue}>{avgRating}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
      </View>

      {/* Skills Overview */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Skills Offering</Text>
          <TouchableOpacity onPress={() => router.push('/profile')}>
            <Plus size={20} color="#6366f1" />
          </TouchableOpacity>
        </View>

        <View style={styles.chipContainer}>
          {offeringSkills.length > 0 ? (
            offeringSkills.map((s: any) => (
              <View key={s.id} style={styles.offeringChip}>
                <Text style={styles.offeringChipText}>{s.skill?.name || 'Skill'}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No offering skills added yet.</Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Skills Seeking</Text>
          <TouchableOpacity onPress={() => router.push('/profile')}>
            <Plus size={20} color="#6366f1" />
          </TouchableOpacity>
        </View>

        <View style={styles.chipContainer}>
          {seekingSkills.length > 0 ? (
            seekingSkills.map((s: any) => (
              <View key={s.id} style={styles.seekingChip}>
                <Text style={styles.seekingChipText}>{s.skill?.name || 'Skill'}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No seeking skills added yet.</Text>
          )}
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 14,
    color: '#a1a1aa',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pointsText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#18181b',
    borderColor: '#27272a',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 12,
    color: '#a1a1aa',
    marginTop: 4,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  offeringChip: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  offeringChipText: {
    color: '#818cf8',
    fontSize: 14,
    fontWeight: '500',
  },
  seekingChip: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  seekingChipText: {
    color: '#e4e4e7',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    color: '#71717a',
    fontStyle: 'italic',
    fontSize: 14,
  },
});
