import { Link, useRouter } from "expo-router";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react-native";
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

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const router = useRouter();
  const t = useT("auth");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert(t("error"), t("enterEmail"));
      return;
    }
    setLoading(true);
    try {
      // @ts-ignore
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "forget-password",
      });
      if (error) {
        Alert.alert(t("error"), error.message || t("failedSendResetCode"));
      } else {
        setSent(true);
      }
    } catch (err: any) {
      Alert.alert(t("error"), err.message || t("unexpectedError"));
    } finally {
      setLoading(false);
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
            <Mail size={24} color={theme.foreground} />
          </View>
          <ThemedText
            type="screenTitle"
            style={{ textAlign: "center", marginTop: SPACING[3] }}
          >
            {t("resetPasswordTitle")}
          </ThemedText>
          <ThemedText
            type="bodySmall"
            muted
            style={{ textAlign: "center", marginTop: SPACING[1] }}
          >
            {t("resetPasswordDescription")}
          </ThemedText>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(400).delay(150)}
          style={[
            styles.cardForm,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          {sent ? (
            <View
              style={{ alignItems: "center", gap: 12, paddingVertical: 12 }}
            >
              <CheckCircle2 size={40} color={theme.foreground} />
              <ThemedText type="label" style={{ textAlign: "center" }}>
                {t("checkEmail")}
              </ThemedText>
              <ThemedText
                type="bodySmall"
                muted
                style={{ textAlign: "center" }}
              >
                {t("resetEmailSentDesc")}
              </ThemedText>
              <Button
                variant="default"
                size="lg"
                onPress={() =>
                  (router as any).replace(
                    `/(auth)/verify-reset-otp?email=${encodeURIComponent(email)}`,
                  )
                }
                style={{ width: "100%", marginTop: 8 }}
              >
                {t("enterResetCode")}
              </Button>
            </View>
          ) : (
            <>
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

              <Button
                variant="default"
                size="lg"
                onPress={handleResetPassword}
                loading={loading}
                style={{ marginTop: SPACING[2] }}
              >
                {t("sendResetCode")}
              </Button>
            </>
          )}

          <View style={styles.footer}>
            <Link href="/(auth)/sign-in" asChild>
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <ArrowLeft size={14} color={theme.mutedForeground} />
                <ThemedText type="bodySmall" muted>
                  {t("backToSignIn")}
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
  inputGroup: { gap: 6 },
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
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 8 },
});
