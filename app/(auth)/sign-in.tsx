import React, { useState, useCallback } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
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
          type: 'error',
          showRetry: true,
          onRetry: () => onSignInPress()
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
          type: 'error',
          showRetry: true,
          onRetry: () => onSignInPress()
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
      // Clerk: signIn.create with strategy 'reset_password_email_code' sends code to email. :contentReference[oaicite:3]{index=3}
      if (signIn) {
        await signIn.create({
          strategy: "reset_password_email_code",
          identifier: resetEmail.trim(),
        });
      }
      setResetStep("confirm");
      showError("Check your email", "We sent a reset code to your inbox. Enter it below with a new password.", { type: 'info' });
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
        setResetError(
          err?.errors?.[0]?.message ||
            "Could not send reset email. Try again later."
        );
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
      // Clerk: attemptFirstFactor with strategy 'reset_password_email_code' to verify code and set new password. :contentReference[oaicite:4]{index=4}
      if (!signIn) return;
      
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: resetCode.trim(),
        password: resetPassword,
      });

      if (result.status === "complete") {
        // Set active session (user is signed in with new password)
        await setActive({ session: result.createdSessionId });
        showError("Password reset", "Your password has been updated — you are now signed in.", { type: 'success' });
        setResetVisible(false);
        // navigate into app
        router.replace("/(tabs)");
      } else if (result.status === "needs_second_factor") {
        // Edge case: 2FA required — show a message (this simple modal doesn't handle 2FA)
        setResetError(
          "This account requires a second factor. Please reset using web flow or contact support."
        );
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
          emailAddress: emailAddress ? "[REDACTED_EMAIL]" : "undefined", // Redact PII
          resultDetails: {
            status: result.status,
            // Add non-PII details if relevant
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

      setResetError(
        err?.errors?.[0]?.message || "Invalid code or error. Try again."
      );
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar style='light' />
      <View style={{ flex: 1, paddingHorizontal: 24 }}>
          {/* Header Section */}
          <View style={{ paddingTop: 32, paddingBottom: 16 }}>
            <View className='items-center mb-8'>
              <View
                className='w-20 h-20 rounded-full bg-gray-800/80 items-center justify-center mb-6 border-2 border-green-400/50'
                style={{
                  shadowColor: cyberpunkTheme.colors.primary,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.6,
                  shadowRadius: 20,
                  elevation: 10,
                }}
              >
                <Icon
                  name='shield-key'
                  size={40}
                  color={cyberpunkTheme.colors.primary}
                />
              </View>
              
              <Text
                className='text-white text-3xl font-bold text-center mb-3'
                style={{
                  textShadowColor: cyberpunkTheme.colors.primary,
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 8,
                }}
              >
                Welcome Back
              </Text>

              <Text className='text-gray-300 text-center text-base leading-6'>
                Sign in to continue your journey
              </Text>
            </View>
          </View>

          {/* Form Section */}
          <View style={{ flex: 1, justifyContent: 'center' }}>

            <View className='space-y-6'>
              {/* Email Input */}
              <View>
                <Text className='text-gray-300 text-sm font-medium mb-3 ml-1'>
                  Email Address
                </Text>
                <View 
                  className={`bg-gray-800/60 rounded-xl border-2 overflow-hidden ${
                    emailError ? 'border-red-400/60' : 'border-gray-600/40'
                  } ${emailAddress ? 'border-green-400/40' : ''}`}
                  style={{
                    shadowColor: emailAddress ? cyberpunkTheme.colors.primary : 'transparent',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 5,
                  }}
                >
                  <View className='flex-row items-center px-4 py-4'>
                    <Icon
                      name='at'
                      size={22}
                      color={emailError ? '#f87171' : emailAddress ? cyberpunkTheme.colors.primary : '#6B7280'}
                      style={{ marginRight: 12 }}
                    />
                    <TextInput
                      style={{
                        flex: 1,
                        color: 'white',
                        fontSize: 16,
                        paddingVertical: 4,
                      }}
                      placeholderTextColor='#9CA3AF'
                      autoCapitalize='none'
                      keyboardType='email-address'
                      autoComplete='email'
                      value={emailAddress}
                      placeholder='Enter your email'
                      onChangeText={(text) => {
                        setEmailAddress(text);
                        if (emailError) setEmailError("");
                      }}
                    />
                    {emailAddress && !emailError && (
                      <Icon name='check-circle' size={20} color={cyberpunkTheme.colors.primary} />
                    )}
                  </View>
                </View>
                {emailError && (
                  <View className='flex-row items-center mt-2 ml-1'>
                    <Icon name='alert-circle-outline' size={16} color='#f87171' />
                    <Text className='text-red-400 text-sm ml-2'>{emailError}</Text>
                  </View>
                )}
              </View>

              {/* Password Input */}
              <View>
                <Text className='text-gray-300 text-sm font-medium mb-3 ml-1'>
                  Password
                </Text>
                <View 
                  className={`bg-gray-800/60 rounded-xl border-2 overflow-hidden ${
                    passwordError ? 'border-red-400/60' : 'border-gray-600/40'
                  } ${password ? 'border-green-400/40' : ''}`}
                  style={{
                    shadowColor: password ? cyberpunkTheme.colors.primary : 'transparent',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 5,
                  }}
                >
                  <View className='flex-row items-center px-4 py-4'>
                    <Icon
                      name='lock'
                      size={22}
                      color={passwordError ? '#f87171' : password ? cyberpunkTheme.colors.primary : '#6B7280'}
                      style={{ marginRight: 12 }}
                    />
                    <TextInput
                      className='flex-1 text-white text-base'
                      placeholderTextColor='#9CA3AF'
                      autoComplete='password'
                      value={password}
                      placeholder='Enter your password'
                      secureTextEntry={secureTextEntry}
                      onChangeText={(text) => {
                        setPassword(text);
                        if (passwordError) setPasswordError("");
                      }}
                      key="password-input"
                    />
                    <TouchableOpacity
                      onPress={() => setSecureTextEntry(!secureTextEntry)}
                      className='ml-3 p-1'
                    >
                      <Icon
                        name={secureTextEntry ? "eye-outline" : "eye-off-outline"}
                        size={22}
                        color='#9CA3AF'
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                {passwordError && (
                  <View className='flex-row items-center mt-2 ml-1'>
                    <Icon name='alert-circle-outline' size={16} color='#f87171' />
                    <Text className='text-red-400 text-sm ml-2'>{passwordError}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Action Buttons */}
            <View className='mt-8 space-y-4'>
              {/* Forgot Password Link */}
              <View className='items-end'>
                <TouchableOpacity
                  onPress={openReset}
                  disabled={isResetting || isSubmitting}
                  className='py-2 px-1'
                >
                  <Text className='text-green-400 text-sm font-medium'>
                    Forgot your password?
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Sign In Button */}
              <TouchableOpacity
                onPress={onSignInPress}
                disabled={isSubmitting}
                className='w-full'
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    cyberpunkTheme.colors.gradients.primary as [string, string]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className='rounded-xl py-4 px-6 items-center'
                  style={{
                    shadowColor: cyberpunkTheme.colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.6,
                    shadowRadius: 20,
                    elevation: 8,
                  }}
                >
                  {isSubmitting ? (
                    <View className='flex-row items-center'>
                      <ActivityIndicator color='#0A1115' size='small' />
                      <Text className='text-gray-900 font-bold text-lg ml-2'>
                        Signing In...
                      </Text>
                    </View>
                  ) : (
                    <Text className='text-gray-900 font-bold text-lg tracking-wide'>
                      Sign In
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer Section */}
          <View style={{ paddingBottom: 24, paddingTop: 16 }}>
            <View className='items-center space-y-4'>
              {/* Divider */}
              <View className='flex-row items-center w-full'>
                <View className='flex-1 h-px bg-gray-700' />
                <Text className='text-gray-500 text-sm px-4'>OR</Text>
                <View className='flex-1 h-px bg-gray-700' />
              </View>

              {/* Sign Up Link */}
              <View className='flex-row items-center'>
                <Text className='text-gray-300 text-base'>New to Dtrue? </Text>
                <TouchableOpacity 
                  onPress={() => router.push("/(auth)/sign-up")}
                  className='p-1'
                  activeOpacity={0.7}
                >
                  <Text
                    className='text-green-400 font-bold text-base'
                    style={{
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

      {/* ---------- Reset Password Modal ---------- */}
      <Modal visible={resetVisible} animationType='fade' transparent>
        <View className='flex-1 justify-center items-center bg-black/70 px-6'>
          <View
            className='bg-gray-900/95 rounded-2xl p-6 border border-green-400/30'
            style={{
              width: Math.min(width - 40, 520),
              shadowColor: cyberpunkTheme.colors.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 15,
            }}
          >
            <View className='flex-row items-center justify-between mb-4'>
              <Text className='text-xl font-bold text-white'>
                {resetStep === "request"
                  ? "Reset password"
                  : "Enter code & new password"}
              </Text>
              <TouchableOpacity onPress={() => setResetVisible(false)}>
                <Icon name='close' size={22} color='#9CA3AF' />
              </TouchableOpacity>
            </View>

            {resetStep === "request" ? (
              <>
                <Text className='text-gray-300 mb-3'>
                  Enter the email for your account — we’ll send a reset code.
                </Text>

                <View className='bg-gray-800/70 rounded-xl border border-gray-700 overflow-hidden mb-2'>
                  <View className='flex-row items-center'>
                    <Icon
                      name='at'
                      size={18}
                      color={cyberpunkTheme.colors.primary}
                      className='ml-4'
                      style={{ marginLeft: 12 }}
                    />
                    <TextInput
                      className='flex-1 px-3 py-3 text-white'
                      placeholderTextColor='#8F9BB3'
                      autoCapitalize='none'
                      keyboardType='email-address'
                      value={resetEmail}
                      placeholder='Email'
                      onChangeText={(t) => {
                        setResetEmail(t.trim());
                        if (resetError) setResetError("");
                      }}
                    />
                  </View>
                </View>
                {resetError ? (
                  <Text className='text-red-400 text-sm mb-2'>
                    {resetError}
                  </Text>
                ) : null}

                <View className='flex-row justify-end gap-3 mt-4'>
                  <TouchableOpacity
                    onPress={() => setResetVisible(false)}
                    className='px-4 py-2'
                  >
                    <Text className='text-gray-300'>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={requestResetCode}
                    disabled={resetLoading}
                    className='ml-2'
                  >
                    <LinearGradient
                      colors={
                        cyberpunkTheme.colors.gradients.primary as [
                          string,
                          string
                        ]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      className='rounded-lg px-4 py-2 items-center'
                    >
                      {resetLoading ? (
                        <ActivityIndicator color='#0A1115' size='small' />
                      ) : (
                        <Text className='font-semibold text-gray-900'>
                          Send code
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              /* confirm step */
              <>
                <Text className='text-gray-300 mb-3'>
                  Enter the code we emailed you and choose a new password.
                </Text>

                <View className='bg-gray-800/70 rounded-xl border border-gray-700 overflow-hidden mb-2'>
                  <View className='flex-row items-center'>
                    <Icon
                      name='key-variant'
                      size={18}
                      color={cyberpunkTheme.colors.primary}
                      className='ml-4'
                      style={{ marginLeft: 12 }}
                    />
                    <TextInput
                      className='flex-1 px-3 py-3 text-white'
                      placeholderTextColor='#8F9BB3'
                      value={resetCode}
                      placeholder='Reset code'
                      keyboardType='number-pad'
                      onChangeText={(t) => {
                        setResetCode(t.trim());
                        if (resetError) setResetError("");
                      }}
                    />
                  </View>
                </View>

                <View className='bg-gray-800/70 rounded-xl border border-gray-700 overflow-hidden mb-2'>
                  <View className='flex-row items-center'>
                    <Icon
                      name='lock'
                      size={18}
                      color={cyberpunkTheme.colors.primary}
                      className='ml-4'
                      style={{ marginLeft: 12 }}
                    />
                    <TextInput
                      className='flex-1 px-3 py-3 text-white'
                      placeholderTextColor='#8F9BB3'
                      value={resetPassword}
                      placeholder='New password (min 8 chars)'
                      secureTextEntry
                      onChangeText={(t) => {
                        setResetPassword(t);
                        if (resetPasswordError) setResetPasswordError("");
                      }}
                    />
                  </View>
                </View>

                {resetPasswordError ? (
                  <Text className='text-red-400 text-sm mb-2'>
                    {resetPasswordError}
                  </Text>
                ) : null}
                {resetError ? (
                  <Text className='text-red-400 text-sm mb-2'>
                    {resetError}
                  </Text>
                ) : null}

                <View className='flex-row justify-end gap-3 mt-4'>
                  <TouchableOpacity
                    onPress={() => {
                      setResetStep("request");
                      setResetError("");
                    }}
                    className='px-4 py-2'
                  >
                    <Text className='text-gray-300'>Back</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={submitReset}
                    disabled={resetLoading}
                    className='ml-2'
                  >
                    <LinearGradient
                      colors={
                        cyberpunkTheme.colors.gradients.primary as [
                          string,
                          string
                        ]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      className='rounded-lg px-4 py-2 items-center'
                    >
                      {resetLoading ? (
                        <ActivityIndicator color='#0A1115' size='small' />
                      ) : (
                        <Text className='font-semibold text-gray-900'>
                          Reset password
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
