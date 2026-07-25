import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { ShieldCheck } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { authClient } from "../../../lib/auth";

export default function VerifyResetOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email || "";

  const [otp, setOtp] = useState("");
  const [isResending, setIsResending] = useState(false);

  const handleContinue = () => {
    if (otp.length !== 6) {
      Alert.alert("Error", "Please enter the complete 6-digit code.");
      return;
    }
    router.replace(
      `/(auth)/reset-password?email=${encodeURIComponent(email)}&otp=${otp}`,
    );
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      // @ts-ignore - emailOtp plugin types not fully inferred in mobile client setup
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "forget-password",
      });
      if (error) {
        Alert.alert("Error", error.message || "Failed to resend code.");
      } else {
        Alert.alert("Success", "A new code has been sent to your email.");
      }
    } catch {
      Alert.alert("Error", "Failed to resend code.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <ShieldCheck size={48} color="#6366f1" />
      </View>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>
        Enter the 6-digit code sent to your email.
      </Text>
      {email ? <Text style={styles.emailText}>{email}</Text> : null}

      <View style={styles.form}>
        <Text style={styles.label}>Verification Code</Text>
        <TextInput
          style={styles.otpInput}
          placeholder="000000"
          placeholderTextColor="#666"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
          textAlign="center"
        />

        <TouchableOpacity
          style={[styles.button, otp.length !== 6 && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={otp.length !== 6}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resendButton}
          onPress={handleResend}
          disabled={isResending}
        >
          {isResending ? (
            <ActivityIndicator color="#6366f1" size="small" />
          ) : (
            <Text style={styles.resendText}>Resend Code</Text>
          )}
        </TouchableOpacity>

        <Link href="/(auth)/sign-in" asChild>
          <TouchableOpacity style={styles.backButton}>
            <Text style={styles.linkText}>Back to Sign In</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
