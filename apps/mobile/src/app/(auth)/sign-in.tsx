import { Link, useRouter } from "expo-router";
import { Eye, EyeOff } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { authClient, signIn } from "../../../lib/auth";
import { SocialLogins } from "../../components/auth/social-logins";
import { useT } from "lib/i18n";

export default function SignInScreen() {
  const router = useRouter();
  const t = useT('auth');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert(t('error'), t('fillAllFields'));
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn.email({
        email,
        password,
      });

      if (error) {
        if (error.code === "EMAIL_NOT_VERIFIED") {
          setUnverifiedEmail(email);
          Alert.alert(
            t('emailNotVerified'),
            t('emailNotVerifiedDesc'),
            [
              { text: t('cancel'), style: "cancel" },
              { text: t('resendEmail'), onPress: handleResendVerification },
            ],
          );
        } else {
          Alert.alert(t('signInFailed'), error.message || t('invalidCredentials'));
        }
      } else {
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      Alert.alert(t('error'), err.message || t('unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    setIsResending(true);
    try {
      // @ts-ignore - emailOtp plugin types not fully inferred in mobile client setup
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email: unverifiedEmail,
        type: "email-verification",
      });
      if (error) {
        Alert.alert(
          t('error'),
          error.message || t('failedResendCode'),
        );
      } else {
        setUnverifiedEmail(null);
        (router as any).replace(
          `/(auth)/verify-email?email=${encodeURIComponent(unverifiedEmail)}`,
        );
      }
    } catch {
      Alert.alert(t('error'), t('failedResendCode'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>{t('signIn')}</Text>
      <Text style={styles.subtitle}>{t('signInDescription')}</Text>

      <View style={styles.form}>
        <SocialLogins />

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('orContinueWith').toUpperCase()}</Text>
          <View style={styles.dividerLine} />
        </View>

        <Text style={styles.label}>{t('email')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('emailPlaceholder')}
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <View style={styles.passwordHeader}>
          <Text style={styles.label}>{t('password')}</Text>
          <Link href="/(auth)/forgot-password" asChild>
            <TouchableOpacity>
              <Text style={styles.forgotText}>{t('forgotPassword')}</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <View style={styles.passwordInputWrapper}>
          <TextInput
            style={[styles.input, { flex: 1, paddingRight: 44 }]}
            placeholder="••••••••"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={10}
          >
            {showPassword ? (
              <EyeOff size={20} color="#71717a" />
            ) : (
              <Eye size={20} color="#71717a" />
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t('signIn')}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('noAccount')} </Text>
          <Link href="/(auth)/sign-up" asChild>
            <TouchableOpacity>
              <Text style={styles.linkText}>{t('signUp')}</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#09090b",
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#a1a1aa",
    marginBottom: 24,
  },
  form: {
    gap: 14,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#27272a",
  },
  dividerText: {
    color: "#71717a",
    fontSize: 11,
    fontWeight: "600",
    marginHorizontal: 12,
  },
  passwordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  forgotText: {
    color: "#6366f1",
    fontSize: 13,
    fontWeight: "500",
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#e4e4e7",
  },
  input: {
    height: 48,
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 8,
    paddingHorizontal: 16,
    color: "#ffffff",
    fontSize: 16,
  },
  button: {
    height: 48,
    backgroundColor: "#6366f1",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  passwordInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
  footerText: {
    color: "#a1a1aa",
    fontSize: 14,
  },
  linkText: {
    color: "#6366f1",
    fontSize: 14,
    fontWeight: "600",
  },
});
