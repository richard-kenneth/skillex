import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { CheckCircle2, ShieldCheck } from "lucide-react-native";
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
import { authClient } from "../../../lib/auth";
import { useT } from "lib/i18n";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email || "";
  const t = useT('auth');

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert(t('error'), t('enterOtp'));
      return;
    }

    setLoading(true);
    try {
      const { error } = await authClient.emailOtp.verifyEmail({
        email,
        otp,
      });
      if (error) {
        Alert.alert(
          t('error'),
          error.message || t('verifyEmailFailed'),
        );
      } else {
        setIsSuccess(true);
        setTimeout(() => router.replace("/(tabs)"), 2000);
      }
    } catch (err: any) {
      Alert.alert(t('error'), err.message || t('unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });
      if (error) {
        Alert.alert(t('error'), error.message || t('resendCodeFailed'));
      } else {
        Alert.alert(
          t('success'),
          t('resendCodeSuccess'),
        );
      }
    } catch {
      Alert.alert(t('error'), t('resendCodeFailed'));
    } finally {
      setIsResending(false);
    }
  };

  if (isSuccess) {
    return (
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <CheckCircle2 size={48} color="#22c55e" />
        </View>
        <Text style={styles.title}>{t('verifyEmailSuccess')}</Text>
        <Text style={styles.subtitle}>
          {t('redirectInfo')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
        <View style={styles.iconContainer}>
          <ShieldCheck size={48} color="#6366f1" />
        </View>
        <Text style={styles.title}>{t('verifyEmailTitle')}</Text>
        <Text style={styles.subtitle}>
          {t('verifyEmailDesc')}
        </Text>
        {email ? <Text style={styles.emailText}>{email}</Text> : null}

        <View style={styles.form}>
          <Text style={styles.label}>{t('verificationCode')}</Text>
          <TextInput
            style={styles.otpInput}
            placeholder="******"
            placeholderTextColor="#666"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            textAlign="center"
          />

          <TouchableOpacity
            style={[styles.button, otp.length !== 6 && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={loading || otp.length !== 6}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{t('verifyEmail')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResend}
            disabled={isResending}
          >
            {isResending ? (
              <ActivityIndicator color="#6366f1" size="small" />
            ) : (
              <Text style={styles.resendText}>{t('resendCode')}</Text>
            )}
          </TouchableOpacity>

          <Link href="/(auth)/sign-in" asChild>
            <TouchableOpacity style={styles.backButton}>
              <Text style={styles.linkText}>{t('goToSignIn')}</Text>
            </TouchableOpacity>
          </Link>
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
    alignItems: "center",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#a1a1aa",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 22,
  },
  emailText: {
    fontSize: 14,
    color: "#6366f1",
    fontWeight: "500",
    marginBottom: 24,
  },
  form: {
    width: "100%",
    gap: 16,
    marginTop: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#e4e4e7",
    textAlign: "center",
  },
  otpInput: {
    height: 56,
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 8,
    paddingHorizontal: 16,
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "bold",
    letterSpacing: 12,
  },
  button: {
    height: 48,
    backgroundColor: "#6366f1",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  resendButton: {
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  resendText: {
    color: "#6366f1",
    fontSize: 14,
    fontWeight: "600",
  },
  backButton: {
    alignItems: "center",
    marginTop: 8,
  },
  linkText: {
    color: "#6366f1",
    fontSize: 14,
    fontWeight: "600",
  },
});
