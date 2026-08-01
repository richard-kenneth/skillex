import { Link, useRouter } from 'expo-router';
import { Eye, EyeOff, User, Mail, Lock, UserPlus } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { signUp } from '../../../lib/auth';
import { SocialLogins } from '../../components/auth/social-logins';
import { useT } from 'lib/i18n';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import { RADIUS, SPACING, FONT_SIZE } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';

export default function SignUpScreen() {
  const router = useRouter();
  const theme = useTheme();
  const t = useT('auth');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!name || !email || !password) { Alert.alert(t('error'), t('fillAllFields')); return; }
    setLoading(true);
    try {
      const { error } = await signUp.email({ name, email, password });
      if (error) { Alert.alert(t('signUpFailed'), error.message || t('unexpectedError')); }
      else { (router as any).replace(`/(auth)/verify-email?email=${encodeURIComponent(email)}`); }
    } catch (err: any) { Alert.alert(t('error'), err.message || t('unexpectedError')); }
    finally { setLoading(false); }
  };

  return (
    <View style={[styles.outer, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(400).delay(50)} style={styles.brandContainer}>
          <View style={[styles.logoBadge, { backgroundColor: theme.secondary, borderColor: theme.border }]}>
            <UserPlus size={24} color={theme.foreground} />
          </View>
          <ThemedText type="screenTitle" style={{ textAlign: 'center', marginTop: SPACING[3] }}>{t('signUp')}</ThemedText>
          <ThemedText type="bodySmall" muted style={{ textAlign: 'center', marginTop: SPACING[1] }}>{t('signUpDescription')}</ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(150)} style={[styles.cardForm, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <SocialLogins />

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            <ThemedText type="overline" muted>{t('orContinueWith').toUpperCase()}</ThemedText>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="label">{t('name')}</ThemedText>
            <View style={[styles.inputWrapper, { borderColor: theme.border, backgroundColor: theme.background }]}>
              <User size={16} color={theme.mutedForeground} style={styles.leadingIcon} />
              <TextInput style={[styles.input, { color: theme.foreground }]} placeholder={t('namePlaceholder')} placeholderTextColor={theme.mutedForeground} value={name} onChangeText={setName} autoCapitalize="words" />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="label">{t('email')}</ThemedText>
            <View style={[styles.inputWrapper, { borderColor: theme.border, backgroundColor: theme.background }]}>
              <Mail size={16} color={theme.mutedForeground} style={styles.leadingIcon} />
              <TextInput style={[styles.input, { color: theme.foreground }]} placeholder={t('emailPlaceholder')} placeholderTextColor={theme.mutedForeground} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="label">{t('password')}</ThemedText>
            <View style={[styles.inputWrapper, { borderColor: theme.border, backgroundColor: theme.background }]}>
              <Lock size={16} color={theme.mutedForeground} style={styles.leadingIcon} />
              <TextInput style={[styles.input, { paddingRight: 44, color: theme.foreground }]} placeholder="••••••••" placeholderTextColor={theme.mutedForeground} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
                {showPassword ? <EyeOff size={16} color={theme.mutedForeground} /> : <Eye size={16} color={theme.mutedForeground} />}
              </TouchableOpacity>
            </View>
          </View>

          <Button variant="default" size="lg" onPress={handleSignUp} loading={loading} style={{ marginTop: SPACING[2] }}>
            {t('signUp')}
          </Button>

          <View style={styles.footer}>
            <ThemedText type="bodySmall" muted>{t('haveAccount')} </ThemedText>
            <Link href="/(auth)/sign-in" asChild>
              <TouchableOpacity>
                <ThemedText type="bodySmall" style={{ fontWeight: '600' }}>{t('signIn')}</ThemedText>
              </TouchableOpacity>
            </Link>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center', maxWidth: 440, width: '100%', alignSelf: 'center' },
  brandContainer: { alignItems: 'center', marginBottom: 24 },
  logoBadge: { width: 56, height: 56, borderRadius: RADIUS['2xl'], borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cardForm: { borderRadius: RADIUS['2xl'], borderWidth: 1, padding: 20, gap: 16 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4, gap: 12 },
  dividerLine: { flex: 1, height: 1 },
  inputGroup: { gap: 6 },
  inputWrapper: { position: 'relative', flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.lg, borderWidth: 1, height: 48 },
  leadingIcon: { position: 'absolute', left: 14, zIndex: 1 },
  input: { flex: 1, height: 48, paddingLeft: 42, paddingRight: 16, fontSize: FONT_SIZE.md, fontWeight: '400' },
  eyeButton: { position: 'absolute', right: 12, height: 48, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
});
