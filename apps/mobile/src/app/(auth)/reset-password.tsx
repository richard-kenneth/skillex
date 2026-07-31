import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { CheckCircle2, Eye, EyeOff, Lock } from "lucide-react-native";
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

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; otp?: string }>();
  const email = params.email || "";
  const otp = params.otp || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleReset = async () => {
    if (!password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }
    if (!email || !otp) {
      Alert.alert(
        "Error",
        "Invalid or missing reset information. Please start the password reset process again.",
      );
      return;
    }

    setLoading(true);
    try {
      // @ts-ignore - emailOtp plugin types not fully inferred in mobile client setup
      const { error } = await authClient.emailOtp.resetPassword({
        email,
        otp,
        password,
      });

      if (error) {
        Alert.alert(
          "Reset Failed",
          error.message || "Could not reset password.",
        );
      } else {
        setIsSuccess(true);
        setTimeout(() => {
          router.replace("/(auth)/sign-in");
        }, 2000);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <CheckCircle2 size={48} color="#22c55e" />
        </View>
        <Text style={styles.title}>Password Reset Complete</Text>
        <Text style={styles.subtitle}>
          Your password has been updated. Redirecting to sign in...
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
        <Lock size={48} color="#6366f1" />
      </View>
      <Text style={styles.title}>Set New Password</Text>
      {email ? <Text style={styles.emailText}>{email}</Text> : null}
      <Text style={styles.subtitle}>Enter your new password below.</Text>

      <View style={styles.form}>
        <Text style={styles.label}>New Password</Text>
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

        <Text style={styles.label}>Confirm New Password</Text>
        <View style={styles.passwordInputWrapper}>
          <TextInput
            style={[styles.input, { flex: 1, paddingRight: 44 }]}
            placeholder="••••••••"
            placeholderTextColor="#666"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            hitSlop={10}
          >
            {showConfirmPassword ? (
              <EyeOff size={20} color="#71717a" />
            ) : (
              <Eye size={20} color="#71717a" />
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleReset}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Reset Password</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Remember your password? </Text>
          <Link href="/(auth)/sign-in" asChild>
            <TouchableOpacity>
              <Text style={styles.linkText}>Sign In</Text>
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
    marginBottom: 24,
    lineHeight: 22,
  },
  emailText: {
    fontSize: 14,
    color: "#6366f1",
    fontWeight: "500",
    marginBottom: 8,
  },
  form: {
    width: "100%",
    gap: 16,
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
