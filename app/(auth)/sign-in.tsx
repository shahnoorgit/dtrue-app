import React, { useState, useCallback, useRef } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  Modal,
  Dimensions,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useSignIn } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { cyberpunkTheme } from "@/constants/theme";
import { useFocusEffect } from "@react-navigation/native";
import { logError } from "@/utils/sentry/sentry";
import { trackUserSignedIn } from "@/lib/posthog/events";
import { useError } from "@/contexts/ErrorContext";

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const { width } = Dimensions.get("window");
  const { showError } = useError();

  // Input refs for focus management
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const resetEmailRef = useRef<TextInput>(null);
  const resetCodeRef = useRef<TextInput>(null);
  const resetPasswordRef = useRef<TextInput>(null);

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  // --- Modal state for in-app reset ---
  const [resetVisible, setResetVisible] = useState(false);
  const [resetStep, setResetStep] = useState<"request" | "confirm">("request");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordError, setResetPasswordError] = useState("");
  const [resetError, setResetError] = useState("");

  // Reset transient UI / errors when this screen is focused
  useFocusEffect(
    useCallback(() => {
      setEmailError("");
      setPasswordError("");
      setIsSubmitting(false);
      setIsResetting(false);
      setSecureTextEntry(true);

      return () => {};
    }, [])
  );

  // --- Normal sign in ---
  const onSignInPress = async () => {
    if (!isLoaded || isSubmitting) return;

    // Simple validation
    let isValid = true;
    if (!emailAddress.trim()) {
      setEmailError("Email is required");
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(emailAddress)) {
      setEmailError("Please enter a valid email");
      isValid = false;
    } else {
      setEmailError("");
    }

    if (!password) {
      setPasswordError("Password is required");
      isValid = false;
    } else {
      setPasswordError("");
    }

    if (!isValid) return;

    setIsSubmitting(true);
    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress.trim(),
        password,
      });

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        // small pause so session is fully registered
        await new Promise((r) => setTimeout(r, 400));
        trackUserSignedIn({
          email: emailAddress,
          method: "email",
        });
        router.replace("/(tabs)");
        // fallback redirect
        setTimeout(() => router.replace("/(tabs)"), 1000);
      } else {
        console.error("signInAttempt", signInAttempt);
        // Sign in attempt not complete - no need to track this as it's not a meaningful user action

        // Log unexpected non-complete status to Sentry
        logError(new Error("SignIn attempt not complete"), {
          status: signInAttempt.status,
          emailAddress: emailAddress ? "[REDACTED_EMAIL]" : "undefined", // Redact PII
          attemptDetails: {
            status: signInAttempt.status,
            // Add non-PII details if relevant, e.g., supportedFirstFactors
          },
        });
        showError("Sign In Error", "Unable to sign in. Please check your credentials.", {
          type: "error",
          showRetry: true,
          onRetry: () => onSignInPress(),
        });
      }
    } catch (err: any) {
      console.error("sign in error", JSON.stringify(err, null, 2));
      // Log the actual error to Sentry
      logError(err, {
        context: "SignInScreen.onSignInPress",
        emailAddress: emailAddress ? "[REDACTED_EMAIL]" : "undefined", // Redact PII
        // clerkErrorCode: err?.errors?.[0]?.code, // Optional: extract Clerk code if needed in context
      });

      const code = err?.errors?.[0]?.code;
      if (code === "form_identifier_not_found") {
        setEmailError("Email not found");
      } else if (code === "form_password_incorrect") {
        setPasswordError("Incorrect password");
      } else {
        showError("Sign In Failed", err?.errors?.[0]?.message || "Please check your credentials and try again.", {
          type: "error",
          showRetry: true,
          onRetry: () => onSignInPress(),
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Reset modal helpers ---
  const openReset = () => {
    setResetError("");
    setResetPasswordError("");
    setResetStep("request");
    setResetEmail(emailAddress); // prefill from sign-in email if present
    setResetCode("");
    setResetPassword("");
    setResetVisible(true);
  };

  // Step 1: request code (Clerk will email OTP/code)
  const requestResetCode = async () => {
    if (resetLoading) return;
    if (!resetEmail.trim() || !/\S+@\S+\.\S+/.test(resetEmail)) {
      setResetError("Please enter a valid email");
      return;
    }
    setResetError("");
    setResetLoading(true);

    try {
      // Send the reset code to the user's email
      // Clerk: signIn.create with strategy 'reset_password_email_code' sends code to email.
      if (signIn) {
        await signIn.create({
          strategy: "reset_password_email_code",
          identifier: resetEmail.trim(),
        });
      }
      setResetStep("confirm");
      showError("Check your email", "We sent a reset code to your inbox. Enter it below with a new password.", { type: "info" });
    } catch (err: any) {
      console.error("requestResetCode err:", JSON.stringify(err, null, 2));
      // Log the actual error to Sentry
      logError(err, {
        context: "SignInScreen.requestResetCode",
        resetEmail: resetEmail ? "[REDACTED_EMAIL]" : "undefined", // Redact PII
        // clerkErrorCode: err?.errors?.[0]?.code,
      });

      const code = err?.errors?.[0]?.code;
      if (code === "form_identifier_not_found") {
        setResetError("Email not found");
      } else {
        setResetError(err?.errors?.[0]?.message || "Could not send reset email. Try again later.");
      }
    } finally {
      setResetLoading(false);
    }
  };

  // Step 2: confirm code + new password
  const submitReset = async () => {
    if (resetLoading) return;

    // validate
    if (!resetCode.trim()) {
      setResetError("Please enter the code sent to your email");
      return;
    }
    if (!resetPassword || resetPassword.length < 8) {
      setResetPasswordError("Password must be at least 8 characters");
      return;
    }
    setResetPasswordError("");
    setResetError("");
    setResetLoading(true);

    try {
      // Clerk: attemptFirstFactor with strategy 'reset_password_email_code' to verify code and set new password.
      if (!signIn) return;

      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: resetCode.trim(),
        password: resetPassword,
      });

      if (result.status === "complete") {
        // Set active session (user is signed in with new password)
        await setActive({ session: result.createdSessionId });
        showError("Password reset", "Your password has been updated — you are now signed in.", { type: "success" });
        setResetVisible(false);
        // navigate into app
        router.replace("/(tabs)");
      } else if (result.status === "needs_second_factor") {
        // Edge case: 2FA required — show a message (this simple modal doesn't handle 2FA)
        setResetError("This account requires a second factor. Please reset using web flow or contact support.");
        // Log this unexpected but handled state to Sentry if deemed important
        logError(new Error("Password reset requires 2FA"), {
          context: "SignInScreen.submitReset",
          status: result.status,
          emailAddress: emailAddress ? "[REDACTED_EMAIL]" : "undefined", // Redact PII
        });
      } else {
        console.warn("Unexpected result during reset:", result);
        const errorMessage = "Could not complete reset. Try again.";
        setResetError(errorMessage);
        // Log unexpected result status to Sentry
        logError(new Error("Unexpected result status during password reset"), {
          context: "SignInScreen.submitReset",
          status: result.status,
          emailAddress: emailAddress ? "[REDACTED_EMAIL]" : "undefined",
          resultDetails: {
            status: result.status,
          },
        });
      }
    } catch (err: any) {
      console.error("submitReset err:", JSON.stringify(err, null, 2));
      // Log the actual error to Sentry
      logError(err, {
        context: "SignInScreen.submitReset",
        resetEmail: resetEmail ? "[REDACTED_EMAIL]" : "undefined", // Redact PII
        resetCodeProvided: !!resetCode, // Just flag if code was entered
        // clerkErrorCode: err?.errors?.[0]?.code,
      });

      setResetError(err?.errors?.[0]?.message || "Invalid code or error. Try again.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }} keyboardVerticalOffset={80}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "on-drag" : "none"} showsVerticalScrollIndicator={false}>
            <View style={{ flex: 1, paddingHorizontal: 24 }}>
              {/* Header Section */}
              <View style={{ paddingTop: 32, paddingBottom: 16 }}>
                <View style={{ alignItems: "center", marginBottom: 32 }}>
                  <View
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      backgroundColor: "rgba(31, 41, 55, 0.8)",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 24,
                      borderWidth: 2,
                      borderColor: "rgba(34,197,94,0.5)",
                      shadowColor: cyberpunkTheme.colors.primary,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.6,
                      shadowRadius: 20,
                      elevation: 10,
                    }}
                  >
                    <Icon name="shield-key" size={40} color={cyberpunkTheme.colors.primary} />
                  </View>

                  <Text
                    style={{
                      color: "white",
                      fontSize: 28,
                      fontWeight: "700",
                      textAlign: "center",
                      marginBottom: 12,
                      textShadowColor: cyberpunkTheme.colors.primary,
                      textShadowOffset: { width: 0, height: 0 },
                      textShadowRadius: 8,
                    }}
                  >
                    Welcome Back
                  </Text>

                  <Text style={{ color: cyberpunkTheme.colors.text.tertiary, textAlign: "center", fontSize: 14, lineHeight: 20 }}>
                    Sign in to continue your journey
                  </Text>
                </View>
              </View>

              {/* Form Section */}
              <View style={{ flex: 1, justifyContent: "center" }}>
                <View style={{ rowGap: 24 }}>
                  {/* Email Input */}
                  <View>
                    <Text style={{ color: cyberpunkTheme.colors.text.tertiary, fontSize: 14, fontWeight: "500", marginBottom: 8, marginLeft: 4 }}>Email Address</Text>
                    <View
                      style={{
                        backgroundColor: "rgba(31,41,55,0.6)",
                        borderRadius: 16,
                        borderWidth: 2,
                        overflow: "hidden",
                        borderColor: emailError ? "rgba(248,113,113,0.6)" : "rgba(107,114,128,0.4)",
                        shadowColor: emailAddress ? cyberpunkTheme.colors.primary : "transparent",
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 5,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 16 }}>
                        <Icon
                          name="at"
                          size={22}
                          color={emailError ? "#f87171" : emailAddress ? cyberpunkTheme.colors.primary : "#6B7280"}
                          style={{ marginRight: 12 }}
                        />
                        <TextInput
                          style={{
                            flex: 1,
                            color: "white",
                            fontSize: 16,
                            paddingVertical: 4,
                          }}
                          placeholderTextColor="#9CA3AF"
                          autoCapitalize="none"
                          keyboardType="email-address"
                          autoComplete="email"
                          ref={emailRef}
                          value={emailAddress}
                          placeholder="Enter your email"
                          onChangeText={(text) => {
                            setEmailAddress(text);
                            if (emailError) setEmailError("");
                          }}
                          returnKeyType="next"
                          onSubmitEditing={() => passwordRef.current?.focus()}
                        />
                        {emailAddress && !emailError && <Icon name="check-circle" size={20} color={cyberpunkTheme.colors.primary} />}
                      </View>
                    </View>
                    {emailError ? (
                      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, marginLeft: 4 }}>
                        <Icon name="alert-circle-outline" size={16} color="#f87171" />
                        <Text style={{ color: "#FCA5A5", fontSize: 13, marginLeft: 8 }}>{emailError}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Password Input */}
                  <View>
                    <Text style={{ color: cyberpunkTheme.colors.text.tertiary, fontSize: 14, fontWeight: "500", marginBottom: 8, marginLeft: 4 }}>Password</Text>
                    <View
                      style={{
                        backgroundColor: "rgba(31,41,55,0.6)",
                        borderRadius: 16,
                        borderWidth: 2,
                        overflow: "hidden",
                        borderColor: passwordError ? "rgba(248,113,113,0.6)" : "rgba(107,114,128,0.4)",
                        shadowColor: password ? cyberpunkTheme.colors.primary : "transparent",
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 5,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 16 }}>
                        <Icon
                          name="lock"
                          size={22}
                          color={passwordError ? "#f87171" : password ? cyberpunkTheme.colors.primary : "#6B7280"}
                          style={{ marginRight: 12 }}
                        />
                        <TextInput
                          style={{ flex: 1, color: "white", fontSize: 16 }}
                          placeholderTextColor="#9CA3AF"
                          autoComplete="password"
                          ref={passwordRef}
                          value={password}
                          placeholder="Enter your password"
                          secureTextEntry={secureTextEntry}
                          onChangeText={(text) => {
                            setPassword(text);
                            if (passwordError) setPasswordError("");
                          }}
                          returnKeyType="go"
                          onSubmitEditing={onSignInPress}
                          key="password-input"
                        />
                        <TouchableOpacity onPress={() => setSecureTextEntry(!secureTextEntry)} style={{ marginLeft: 12, padding: 4 }}>
                          <Icon name={secureTextEntry ? "eye-outline" : "eye-off-outline"} size={22} color="#9CA3AF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    {passwordError ? (
                      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, marginLeft: 4 }}>
                        <Icon name="alert-circle-outline" size={16} color="#f87171" />
                        <Text style={{ color: "#FCA5A5", fontSize: 13, marginLeft: 8 }}>{passwordError}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={{ marginTop: 32, rowGap: 16 }}>
                  {/* Forgot Password Link */}
                  <View style={{ alignItems: "flex-end" }}>
                    <TouchableOpacity onPress={openReset} disabled={isResetting || isSubmitting} style={{ paddingVertical: 8, paddingHorizontal: 4 }}>
                      <Text style={{ color: "#22C55E", fontSize: 14, fontWeight: "500" }}>Forgot your password?</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Sign In Button */}
                  <TouchableOpacity onPress={onSignInPress} disabled={isSubmitting} activeOpacity={0.8} style={{ width: "100%" }}>
                    <LinearGradient
                      colors={cyberpunkTheme.colors.gradients.primary as [string, string]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        borderRadius: 16,
                        paddingVertical: 16,
                        paddingHorizontal: 24,
                        alignItems: "center",
                        shadowColor: cyberpunkTheme.colors.primary,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.6,
                        shadowRadius: 20,
                        elevation: 8,
                      }}
                    >
                      {isSubmitting ? (
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <ActivityIndicator color="#0A1115" size="small" />
                          <Text style={{ color: "#0A1115", fontWeight: "700", fontSize: 18, marginLeft: 8 }}>Signing In...</Text>
                        </View>
                      ) : (
                        <Text style={{ color: "#0A1115", fontWeight: "700", fontSize: 18, letterSpacing: 0.5 }}>Sign In</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Footer Section */}
              <View style={{ paddingBottom: 24, paddingTop: 16 }}>
                <View style={{ alignItems: "center", rowGap: 16 }}>
                  {/* Divider */}
                  <View style={{ flexDirection: "row", alignItems: "center", width: "100%" }}>
                    <View style={{ flex: 1, height: 1, backgroundColor: "#374151" }} />
                    <Text style={{ color: "#6B7280", fontSize: 12, paddingHorizontal: 12 }}>OR</Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: "#374151" }} />
                  </View>

                  {/* Sign Up Link */}
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ color: cyberpunkTheme.colors.text.tertiary, fontSize: 14 }}>New to Dtrue? </Text>
                    <TouchableOpacity onPress={() => router.push("/(auth)/sign-up")} style={{ padding: 4 }} activeOpacity={0.7}>
                      <Text
                        style={{
                          color: "#22C55E",
                          fontWeight: "700",
                          fontSize: 14,
                          textShadowColor: cyberpunkTheme.colors.primary,
                          textShadowOffset: { width: 0, height: 0 },
                          textShadowRadius: 6,
                        }}
                      >
                        Create Account
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
      </KeyboardAvoidingView>

      {/* ---------- Reset Password Modal ---------- */}
      <Modal visible={resetVisible} animationType="fade" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }} keyboardVerticalOffset={80}>
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.7)", paddingHorizontal: 24 }}>
              <View
                style={{
                  backgroundColor: "rgba(17,24,39,0.95)",
                  borderRadius: 20,
                  padding: 24,
                  borderWidth: 1,
                  borderColor: "rgba(34,197,94,0.3)",
                  width: Math.min(width - 40, 520),
                  shadowColor: cyberpunkTheme.colors.primary,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.3,
                  shadowRadius: 20,
                  elevation: 15,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <Text style={{ color: "white", fontSize: 18, fontWeight: "700" }}>
                    {resetStep === "request" ? "Reset password" : "Enter code & new password"}
                  </Text>
                  <TouchableOpacity onPress={() => setResetVisible(false)}>
                    <Icon name="close" size={22} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>

                {resetStep === "request" ? (
                  <>
                    <Text style={{ color: "#D1D5DB", marginBottom: 12 }}>Enter the email for your account — we’ll send a reset code.</Text>

                    <View style={{ backgroundColor: "rgba(31,41,55,0.7)", borderRadius: 12, borderWidth: 1, borderColor: "#374151", overflow: "hidden", marginBottom: 8 }}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Icon name="at" size={18} color={cyberpunkTheme.colors.primary} style={{ marginLeft: 12, marginRight: 8 }} />
                        <TextInput
                          style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 12, color: "white" }}
                          placeholderTextColor="#9CA3AB"
                          autoCapitalize="none"
                          keyboardType="email-address"
                          ref={resetEmailRef}
                          value={resetEmail}
                          placeholder="Email"
                          onChangeText={(t) => {
                            setResetEmail(t);
                            if (resetError) setResetError("");
                          }}
                          returnKeyType="go"
                          onSubmitEditing={requestResetCode}
                        />
                      </View>
                    </View>
                    {resetError ? <Text style={{ color: "#FCA5A5", fontSize: 13, marginBottom: 8 }}>{resetError}</Text> : null}

                    <View style={{ flexDirection: "row", justifyContent: "flex-end", columnGap: 12, marginTop: 12 }}>
                      <TouchableOpacity onPress={() => setResetVisible(false)} style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
                        <Text style={{ color: "#D1D5DB" }}>Cancel</Text>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={requestResetCode} disabled={resetLoading} style={{ marginLeft: 8 }}>
                        <LinearGradient
                          colors={cyberpunkTheme.colors.gradients.primary as [string, string]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={{ borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, alignItems: "center" }}
                        >
                          {resetLoading ? <ActivityIndicator color="#0A1115" size="small" /> : <Text style={{ fontWeight: "600", color: "#0A1115" }}>Send code</Text>}
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={{ color: "#D1D5DB", marginBottom: 12 }}>Enter the code we emailed you and choose a new password.</Text>

                    <View style={{ backgroundColor: "rgba(31,41,55,0.7)", borderRadius: 12, borderWidth: 1, borderColor: "#374151", overflow: "hidden", marginBottom: 8 }}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Icon name="key-variant" size={18} color={cyberpunkTheme.colors.primary} style={{ marginLeft: 12, marginRight: 8 }} />
                        <TextInput
                          style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 12, color: "white" }}
                          placeholderTextColor="#9CA3AB"
                          ref={resetCodeRef}
                          value={resetCode}
                          placeholder="Reset code"
                          keyboardType="number-pad"
                          onChangeText={(t) => {
                            setResetCode(t);
                            if (resetError) setResetError("");
                          }}
                          returnKeyType="next"
                          onSubmitEditing={() => resetPasswordRef.current?.focus()}
                        />
                      </View>
                    </View>

                    <View style={{ backgroundColor: "rgba(31,41,55,0.7)", borderRadius: 12, borderWidth: 1, borderColor: "#374151", overflow: "hidden", marginBottom: 8 }}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Icon name="lock" size={18} color={cyberpunkTheme.colors.primary} style={{ marginLeft: 12, marginRight: 8 }} />
                        <TextInput
                          style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 12, color: "white" }}
                          placeholderTextColor="#9CA3AB"
                          ref={resetPasswordRef}
                          value={resetPassword}
                          placeholder="New password (min 8 chars)"
                          secureTextEntry
                          onChangeText={(t) => {
                            setResetPassword(t);
                            if (resetPasswordError) setResetPasswordError("");
                          }}
                          returnKeyType="go"
                          onSubmitEditing={submitReset}
                        />
                      </View>
                    </View>

                    {resetPasswordError ? <Text style={{ color: "#FCA5A5", fontSize: 13, marginBottom: 8 }}>{resetPasswordError}</Text> : null}
                    {resetError ? <Text style={{ color: "#FCA5A5", fontSize: 13, marginBottom: 8 }}>{resetError}</Text> : null}

                    <View style={{ flexDirection: "row", justifyContent: "flex-end", columnGap: 12, marginTop: 12 }}>
                      <TouchableOpacity
                        onPress={() => {
                          setResetStep("request");
                          setResetError("");
                        }}
                        style={{ paddingHorizontal: 16, paddingVertical: 8 }}
                      >
                        <Text style={{ color: "#D1D5DB" }}>Back</Text>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={submitReset} disabled={resetLoading} style={{ marginLeft: 8 }}>
                        <LinearGradient
                          colors={cyberpunkTheme.colors.gradients.primary as [string, string]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={{ borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, alignItems: "center" }}
                        >
                          {resetLoading ? <ActivityIndicator color="#0A1115" size="small" /> : <Text style={{ fontWeight: "600", color: "#0A1115" }}>Reset password</Text>}
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
