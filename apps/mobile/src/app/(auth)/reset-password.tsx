import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, Eye, EyeOff, Lock } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { authClient } from '../../../lib/auth';
import { useT } from 'lib/i18n';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import { RADIUS, SPACING, FONT_SIZE } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';

export default function ResetPasswordScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; otp?: string }>();
  const t = useT('auth');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) { Alert.alert(t('error'), t('fillAllFields')); return; }
    if (password !== confirmPassword) { Alert.alert(t('error'), t('passwordsDoNotMatch')); return; }
    if (password.length < 8) { Alert.alert(t('error'), t('passwordTooShort')); return; }
    if (!params.email || !params.otp) { Alert.alert(t('error'), t('missingResetDetails')); return; }

    setLoading(true);
    try {
      // @ts-ignore
      const { error } = await authClient.emailOtp.resetPassword({ email: params.email, otp: params.otp, password });
      if (error) { Alert.alert(t('error'), error.message || t('failedResetPassword')); }
      else { setSuccess(true); }
    } catch (err: any) { Alert.alert(t('error'), err.message || t('unexpectedError')); }
    finally { setLoading(false); }
  };

  return (
    <View style={[styles.outer, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(400).delay(50)} style={styles.brandContainer}>
          <View style={[styles.logoBadge, { backgroundColor: theme.secondary, borderColor: theme.border }]}>
            <Lock size={24} color={theme.foreground} />
          </View>
          <ThemedText type="screenTitle" style={{ textAlign: 'center', marginTop: SPACING[3] }}>{t('setNewPasswordTitle')}</ThemedText>
          <ThemedText type="bodySmall" muted style={{ textAlign: 'center', marginTop: SPACING[1] }}>{t('setNewPasswordDesc')}</ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(150)} style={[styles.cardForm, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {success ? (
            <View style={{ alignItems: 'center', gap: 12, paddingVertical: 12 }}>
              <CheckCircle2 size={40} color={theme.foreground} />
              <ThemedText type="label" style={{ textAlign: 'center' }}>{t('passwordResetSuccess')}</ThemedText>
              <ThemedText type="bodySmall" muted style={{ textAlign: 'center' }}>{t('passwordResetSuccessDesc')}</ThemedText>
              <Button variant="default" size="lg" onPress={() => router.replace('/(auth)/sign-in')} style={{ width: '100%', marginTop: 8 }}>
                {t('signIn')}
              </Button>
            </View>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <ThemedText type="label">{t('newPassword')}</ThemedText>
                <View style={[styles.inputWrapper, { borderColor: theme.border, backgroundColor: theme.background }]}>
                  <Lock size={16} color={theme.mutedForeground} style={styles.leadingIcon} />
                  <TextInput style={[styles.input, { paddingRight: 44, color: theme.foreground }]} placeholder="••••••••" placeholderTextColor={theme.mutedForeground} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
                  <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
                    {showPassword ? <EyeOff size={16} color={theme.mutedForeground} /> : <Eye size={16} color={theme.mutedForeground} />}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="label">{t('confirmNewPassword')}</ThemedText>
                <View style={[styles.inputWrapper, { borderColor: theme.border, backgroundColor: theme.background }]}>
                  <Lock size={16} color={theme.mutedForeground} style={styles.leadingIcon} />
                  <TextInput style={[styles.input, { paddingRight: 44, color: theme.foreground }]} placeholder="••••••••" placeholderTextColor={theme.mutedForeground} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} />
                </View>
              </View>

              <Button variant="default" size="lg" onPress={handleResetPassword} loading={loading} style={{ marginTop: SPACING[2] }}>
                {t('resetPassword')}
              </Button>
            </>
          )}

          <View style={styles.footer}>
            <Link href="/(auth)/sign-in" asChild>
              <TouchableOpacity>
                <ThemedText type="bodySmall" muted>{t('backToSignIn')}</ThemedText>
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
  inputGroup: { gap: 6 },
  inputWrapper: { position: 'relative', flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.lg, borderWidth: 1, height: 48 },
  leadingIcon: { position: 'absolute', left: 14, zIndex: 1 },
  input: { flex: 1, height: 48, paddingLeft: 42, paddingRight: 16, fontSize: FONT_SIZE.md, fontWeight: '400' },
  eyeButton: { position: 'absolute', right: 12, height: 48, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
});
