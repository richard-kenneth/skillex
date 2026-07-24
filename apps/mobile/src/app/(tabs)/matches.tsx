import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../lib/api';
import { Sparkles, Send } from 'lucide-react-native';

export default function MatchesScreen() {
  const queryClient = useQueryClient();
  const [requestingUserId, setRequestingUserId] = useState<string | null>(null);

  const { data: matches, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['matches'],
    queryFn: () => apiFetch('/exchanges/matches'),
  });

  const sendRequestMutation = useMutation({
    mutationFn: (data: { receiverId: string; requestedSkillId: string }) =>
      apiFetch('/exchanges/request', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      Alert.alert('Success', 'Exchange request sent!');
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      setRequestingUserId(null);
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message || 'Could not send request');
      setRequestingUserId(null);
    },
  });

  const renderMatchCard = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.userHeader}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>{item.name?.charAt(0) || 'U'}</Text>
          </View>
        )}
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userBio} numberOfLines={2}>{item.bio || 'No bio available'}</Text>
        </View>
      </View>

      <View style={styles.skillsSection}>
        <Text style={styles.skillLabel}>Offers: {item.offeringSkill?.name || 'Skill'}</Text>
        <Text style={styles.skillLabel}>Seeks: {item.seekingSkill?.name || 'Skill'}</Text>
      </View>

      <TouchableOpacity
        style={styles.requestButton}
        onPress={() => {
          if (item.offeringSkill?.id) {
            sendRequestMutation.mutate({
              receiverId: item.id,
              requestedSkillId: item.offeringSkill.id,
            });
          }
        }}
        disabled={sendRequestMutation.isPending}
      >
        <Send size={16} color="#ffffff" />
        <Text style={styles.requestButtonText}>Request Exchange</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={matches || []}
        keyExtractor={(item) => item.id}
        renderItem={renderMatchCard}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6366f1" />}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Sparkles size={32} color="#71717a" />
              <Text style={styles.emptyTitle}>No Matches Yet</Text>
              <Text style={styles.emptyText}>Add more offering/seeking skills in your profile to get matched!</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#18181b',
    borderColor: '#27272a',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    backgroundColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userBio: {
    fontSize: 13,
    color: '#a1a1aa',
    marginTop: 2,
  },
  skillsSection: {
    backgroundColor: '#09090b',
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  skillLabel: {
    color: '#e4e4e7',
    fontSize: 13,
  },
  requestButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 40,
    borderRadius: 8,
    marginTop: 4,
  },
  requestButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
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
    paddingHorizontal: 32,
  },
});
