import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Alert, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../lib/api';
import { signOut } from '../../../lib/auth';
import { useRouter } from 'expo-router';
import { LogOut, User, Edit2, Check } from 'lucide-react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: user, refetch, isRefetching } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiFetch('/users/me'),
  });

  const [bio, setBio] = useState(user?.bio || '');
  const [isEditingBio, setIsEditingBio] = useState(false);

  const updateProfileMutation = useMutation({
    mutationFn: (data: { bio: string }) =>
      apiFetch('/users/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      Alert.alert('Profile Updated', 'Your bio has been saved.');
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setIsEditingBio(false);
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message || 'Update failed');
    },
  });

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/(auth)/sign-in');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Sign out failed');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6366f1" />}
    >
      {/* Profile Header */}
      <View style={styles.headerCard}>
        {user?.image ? (
          <Image source={{ uri: user.image }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
          </View>
        )}

        <Text style={styles.userName}>{user?.name || 'User'}</Text>
        <Text style={styles.userEmail}>{user?.email || 'email@example.com'}</Text>
      </View>

      {/* Bio Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>About Me</Text>
          {!isEditingBio ? (
            <TouchableOpacity onPress={() => { setBio(user?.bio || ''); setIsEditingBio(true); }}>
              <Edit2 size={18} color="#6366f1" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => updateProfileMutation.mutate({ bio })}>
              <Check size={18} color="#22c55e" />
            </TouchableOpacity>
          )}
        </View>

        {isEditingBio ? (
          <TextInput
            style={styles.bioInput}
            multiline
            numberOfLines={4}
            value={bio}
            onChangeText={setBio}
            placeholder="Write a brief bio..."
            placeholderTextColor="#666"
          />
        ) : (
          <Text style={styles.bioText}>{user?.bio || 'No bio provided yet.'}</Text>
        )}
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <LogOut size={20} color="#ef4444" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
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
  headerCard: {
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderColor: '#27272a',
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    backgroundColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userEmail: {
    fontSize: 14,
    color: '#a1a1aa',
    marginTop: 4,
  },
  section: {
    gap: 12,
    backgroundColor: '#18181b',
    borderColor: '#27272a',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  bioText: {
    color: '#e4e4e7',
    fontSize: 14,
    lineHeight: 20,
  },
  bioInput: {
    backgroundColor: '#09090b',
    borderColor: '#27272a',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 14,
    textAlignVertical: 'top',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    height: 48,
    borderRadius: 8,
    marginTop: 12,
  },
  signOutText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 16,
  },
});
