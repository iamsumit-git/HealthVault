import React, { useState } from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";

import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { Spacing, Colors } from "../../constants/theme";
import { authService } from "../../services/auth";
import { useAuthStore } from "../../state/useAuthStore";
import { useColorScheme } from "react-native";

export default function VerifyScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  const identifier = (searchParams.identifier as string) || "";
  const type = (searchParams.type as string) || "email";

  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);

  const { setToken, setUser } = useAuthStore();

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      Alert.alert("Invalid Code", "Please enter a 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      const payload =
        type === "email"
          ? { email: identifier, otp_code: otpCode }
          : { phone_number: identifier, otp_code: otpCode };

      // 1. Verify OTP and get JWT
      const res = await authService.verifyOtp(payload);

      // 2. Set token in state store (Axios headers get auto-injected)
      setToken(res.access_token);

      // 3. Fetch user profile
      const profile = await authService.getProfile();
      setUser(profile);

      // 4. Redirect to home dashboard
      // Wipe routing history so they cannot go back to login screens
      router.replace("/(app)");
    } catch (err: any) {
      const errMsg =
        err.response?.data?.detail || "Invalid code. Please verify and try again.";
      Alert.alert("Verification Failed", errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      const payload =
        type === "email" ? { email: identifier } : { phone_number: identifier };
      const res = await authService.sendOtp(payload);
      
      const developerHint = res.otp_code
        ? `\n\n(Dev Sandbox Mock Code: ${res.otp_code})`
        : "";

      Alert.alert("Code Sent", `A new verification code has been sent.${developerHint}`);
    } catch (err: any) {
      Alert.alert("Failed", "Unable to resend OTP at this time.");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ThemedView style={styles.container}>
          <SafeAreaView style={styles.content}>
            <ThemedView style={styles.header}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <ThemedText style={{ fontSize: 16 }}>← Back</ThemedText>
              </TouchableOpacity>

              <ThemedText type="title" style={styles.title}>
                Enter Verification Code
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
                We sent a 6-digit verification code to {identifier}
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.form}>
              <TextInput
                style={[
                  styles.otpInput,
                  {
                    color: colors.text,
                    backgroundColor: colors.backgroundElement,
                    borderColor: colors.backgroundSelected,
                  },
                ]}
                placeholder="000000"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                maxLength={6}
                value={otpCode}
                onChangeText={(val) => setOtpCode(val.replace(/[^0-9]/g, ""))}
              />

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: loading ? colors.backgroundSelected : colors.text },
                ]}
                onPress={handleVerifyOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <ThemedText
                    style={[styles.submitButtonText, { color: colors.background }]}
                  >
                    Verify Code
                  </ThemedText>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleResendOtp}
                style={styles.resendButton}
              >
                <ThemedText style={{ color: colors.textSecondary, textAlign: "center" }}>
                  Didn't receive code? <ThemedText style={{ fontWeight: "bold", textDecorationLine: "underline", color: colors.text }}>Resend Code</ThemedText>
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </SafeAreaView>
        </ThemedView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  header: {
    alignItems: "flex-start",
    marginTop: Spacing.two,
    gap: Spacing.two,
  },
  backButton: {
    paddingVertical: Spacing.one,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: Spacing.two,
  },
  subtitle: {
    fontSize: 14,
    marginTop: Spacing.one,
  },
  form: {
    marginTop: Spacing.six,
    gap: Spacing.three,
  },
  otpInput: {
    height: 60,
    borderWidth: 1,
    borderRadius: 8,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "bold",
    letterSpacing: 8,
  },
  submitButton: {
    height: 52,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.two,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  resendButton: {
    marginTop: Spacing.three,
    padding: Spacing.two,
  },
});
