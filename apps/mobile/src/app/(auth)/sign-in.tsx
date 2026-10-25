import { Link, useRouter } from "expo-router";
import { Eye, EyeOff, Lock, Mail } from "lucide-react-native";
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
import Animated, { FadeInDown } from "react-native-reanimated";
import { authClient, signIn } from "../../../lib/auth";
import { SocialLogins } from "../../components/auth/social-logins";
import { useT } from "lib/i18n";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { RADIUS, SPACING, FONT_SIZE, ICON_SIZE } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";
import { AnalyticsEvent, track } from "@/lib/analytics";

export default function SignInScreen() {
  const router = useRouter();
  const theme = useTheme();
  const t = useT("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert(t("error"), t("fillAllFields"));
      return;
    }
    setLoading(true);
    try {
      const { error } = await signIn.email({ email, password });
      if (error) {
        if (error.code === "EMAIL_NOT_VERIFIED") {
          setUnverifiedEmail(email);
          Alert.alert(t("emailNotVerified"), t("emailNotVerifiedDesc"), [
            { text: t("cancel"), style: "cancel" },
            { text: t("resendEmail"), onPress: handleResendVerification },
          ]);
        } else {
          Alert.alert(
            t("signInFailed"),
            error.message || t("invalidCredentials"),
          );
        }
      } else {
        track(AnalyticsEvent.USER_SIGNED_IN, { method: "email" });
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      Alert.alert(t("error"), err.message || t("unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    setIsResending(true);
    try {
      // @ts-ignore
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email: unverifiedEmail,
        type: "email-verification",
      });
      if (error) {
        Alert.alert(t("error"), error.message || t("failedResendCode"));
      } else {
        setUnverifiedEmail(null);
        (router as any).replace(
          `/(auth)/verify-email?email=${encodeURIComponent(unverifiedEmail)}`,
        );
      }
    } catch {
      Alert.alert(t("error"), t("failedResendCode"));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View style={[styles.outer, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(50)}
          style={styles.brandContainer}
        >
          <View
            style={[
              styles.logoBadge,
              { backgroundColor: theme.secondary, borderColor: theme.border },
            ]}
          >
            <Mail size={24} color={theme.foreground} />
          </View>
          <ThemedText
            type="screenTitle"
            style={{ textAlign: "center", marginTop: SPACING[3] }}
          >
            {t("signIn")}
          </ThemedText>
          <ThemedText
            type="bodySmall"
            muted
            style={{ textAlign: "center", marginTop: SPACING[1] }}
          >
            {t("signInDescription")}
          </ThemedText>
        </Animated.View>

        {/* Form Card */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(150)}
          style={[
            styles.cardForm,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <SocialLogins />

          <View style={styles.dividerRow}>
            <View
              style={[styles.dividerLine, { backgroundColor: theme.border }]}
            />
            <ThemedText type="overline" muted>
              {t("orContinueWith").toUpperCase()}
            </ThemedText>
            <View
              style={[styles.dividerLine, { backgroundColor: theme.border }]}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="label">{t("email")}</ThemedText>
            <View
              style={[
                styles.inputWrapper,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                },
              ]}
            >
              <Mail
                size={16}
                color={theme.mutedForeground}
                style={styles.leadingIcon}
              />
              <TextInput
                style={[styles.input, { color: theme.foreground }]}
                placeholder={t("emailPlaceholder")}
                placeholderTextColor={theme.mutedForeground}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.passwordHeader}>
              <ThemedText type="label">{t("password")}</ThemedText>
              <Link href="/(auth)/forgot-password" asChild>
                <TouchableOpacity>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.mutedForeground }}
                  >
                    {t("forgotPassword")}
                  </ThemedText>
                </TouchableOpacity>
              </Link>
            </View>
            <View
              style={[
                styles.inputWrapper,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                },
              ]}
            >
              <Lock
                size={16}
                color={theme.mutedForeground}
                style={styles.leadingIcon}
              />
              <TextInput
                style={[
                  styles.input,
                  { paddingRight: 44, color: theme.foreground },
                ]}
                placeholder="••••••••"
                placeholderTextColor={theme.mutedForeground}
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
                  <EyeOff size={16} color={theme.mutedForeground} />
                ) : (
                  <Eye size={16} color={theme.mutedForeground} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <Button
            variant="default"
            size="lg"
            onPress={handleSignIn}
            loading={loading}
            style={{ marginTop: SPACING[2] }}
          >
            {t("signIn")}
          </Button>

          <View style={styles.footer}>
            <ThemedText type="bodySmall" muted>
              {t("noAccount")}{" "}
            </ThemedText>
            <Link href="/(auth)/sign-up" asChild>
              <TouchableOpacity>
                <ThemedText type="bodySmall" style={{ fontWeight: "600" }}>
                  {t("signUp")}
                </ThemedText>
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
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
    maxWidth: 440,
    width: "100%",
    alignSelf: "center",
  },
  brandContainer: { alignItems: "center", marginBottom: 24 },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: RADIUS["2xl"],
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardForm: {
    borderRadius: RADIUS["2xl"],
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
    gap: 12,
  },
  dividerLine: { flex: 1, height: 1 },
  inputGroup: { gap: 6 },
  passwordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inputWrapper: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    height: 48,
  },
  leadingIcon: { position: "absolute", left: 14, zIndex: 1 },
  input: {
    flex: 1,
    height: 48,
    paddingLeft: 42,
    paddingRight: 16,
    fontSize: FONT_SIZE.md,
    fontWeight: "400",
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 8 },
});
