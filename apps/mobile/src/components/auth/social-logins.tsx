import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { signIn } from '../../../lib/auth';
import { Globe, Briefcase } from 'lucide-react-native';
import { getAuthCallbackUrl } from '../../../lib/utils';
import { router } from 'expo-router';

export function SocialLogins() {
  const handleSocialSignIn = async (provider: 'google' | 'linkedin') => {
    try {
      const { error } = await signIn.social({
        provider,
        callbackURL: getAuthCallbackUrl(),
      });
      if (error) {
        throw new Error(error.message)
      }
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert('Sign In Failed', err.message || `Could not sign in with ${provider}`);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.socialButton}
        onPress={() => handleSocialSignIn('google')}
      >
        <Globe size={18} color="#ffffff" />
        <Text style={styles.buttonText}>Google</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.socialButton}
        onPress={() => handleSocialSignIn('linkedin')}
      >
        <Briefcase size={18} color="#0a66c2" />
        <Text style={styles.buttonText}>LinkedIn</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
