import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { ShieldCheck } from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { authClient } from "../../../lib/auth";
import { useT } from "lib/i18n";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { RADIUS, SPACING, FONT_SIZE } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";

export default function VerifyResetOtpScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const t = useT("auth");

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const email = params.email || "";

  const handleVerify = async () => {
    if (!otp || otp.length < 6) {
      Alert.alert(t("error"), t("enterValidCode"));
      return;
    }
    if (!email) {
      Alert.alert(t("error"), t("missingEmail"));
      return;
    }

    (router as any).replace(
      `/(auth)/reset-password?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`,
    );
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      // @ts-ignore
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "forget-password",
      });
      if (error) {
        Alert.alert(t("error"), error.message || t("failedResendCode"));
      } else {
        Alert.alert(t("codeSent"), t("codeSentDesc"));
      }
    } catch {
      Alert.alert(t("error"), t("failedResendCode"));
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={[styles.outer, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
            <ShieldCheck size={24} color={theme.foreground} />
          </View>
          <ThemedText
            type="screenTitle"
            style={{ textAlign: "center", marginTop: SPACING[3] }}
          >
            {t("enterResetCodeTitle")}
          </ThemedText>
          <ThemedText
            type="bodySmall"
            muted
            style={{ textAlign: "center", marginTop: SPACING[1] }}
          >
            {t("enterCodeSentTo")} {email || t("yourEmail")}
          </ThemedText>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(400).delay(150)}
          style={[
            styles.cardForm,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.inputGroup}>
            <ThemedText type="label">{t("resetCode")}</ThemedText>
            <View
              style={[
                styles.inputWrapper,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                },
              ]}
            >
              <TextInput
                style={[styles.input, { color: theme.foreground }]}
                placeholder="123456"
                placeholderTextColor={theme.mutedForeground}
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>
          </View>

          <Button
            variant="default"
            size="lg"
            onPress={handleVerify}
            loading={loading}
            style={{ marginTop: SPACING[2] }}
          >
            {t("continue")}
          </Button>

          <View style={styles.footer}>
            <TouchableOpacity onPress={handleResend} disabled={resending}>
              <ThemedText type="bodySmall" style={{ fontWeight: "600" }}>
                {resending ? t("resendingCode") : t("resendCode")}
              </ThemedText>
            </TouchableOpacity>
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
  inputGroup: { gap: 6 },
  inputWrapper: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    height: 48,
  },
  input: {
    flex: 1,
    height: 48,
    paddingHorizontal: 16,
    fontSize: FONT_SIZE.lg,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 4,
  },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 8 },
});
