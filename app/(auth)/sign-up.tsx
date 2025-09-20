import React, { useState, useCallback, useEffect } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { useSignUp } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { cyberpunkTheme } from "@/constants/theme";
import { useFocusEffect } from "@react-navigation/native";
import { logError } from "@/utils/sentry/sentry";
import { trackUserSignedUp } from "@/lib/posthog/events";
import { useError } from "@/contexts/ErrorContext";

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();
  const { width } = Dimensions.get("window");
  const { showError } = useError();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  // Removed page view tracking - not critical for user behavior analysis

  // Reset transient UI / errors when screen is focused
  useFocusEffect(
    useCallback(() => {
      setEmailError("");
      setPasswordError("");
      setVerificationError("");
      setIsSubmitting(false);
      // Reset verification step when coming back to the screen so UI is predictable
      setPendingVerification(false);
      setCode("");
      // keep email/password so users don't lose typed input by default
      return () => {};
    }, [])
  );

  // Handle submission of sign-up form
  const onSignUpPress = async () => {
    if (!isLoaded || isSubmitting) return;

    // Form validation
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
    } else if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      isValid = false;
    } else {
      setPasswordError("");
    }

    if (!isValid) return;

    setIsSubmitting(true);

    try {
      await signUp.create({
        emailAddress,
        password,
      });

      // Send verification code by email
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      // Show verification step
      setPendingVerification(true);
      setIsSubmitting(false);
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));

      // Log error to Sentry
      logError(err, {
        context: "SignUpScreen.onSignUpPress",
        emailAddress: emailAddress ? "[REDACTED_EMAIL]" : "undefined",
      });

      showError("Sign Up Failed", err?.errors?.[0]?.message || "An error occurred during sign up", {
        type: 'error',
        showRetry: true,
        onRetry: () => onSignUpPress()
      });
      setIsSubmitting(false);
    }
  };

  // Handle verification
  const onVerifyPress = async () => {
    if (!isLoaded || isSubmitting) return;

    if (!code.trim()) {
      setVerificationError("Verification code is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (signUpAttempt.status === "complete") {
        await setActive({ session: signUpAttempt.createdSessionId });
        trackUserSignedUp({
          email: emailAddress,
          method: "email",
        });
        router.replace("/boarding");
      } else {
        console.error(JSON.stringify(signUpAttempt, null, 2));

        // Log unexpected status to Sentry
        logError(new Error("SignUp verification not complete"), {
          context: "SignUpScreen.onVerifyPress",
          status: signUpAttempt.status,
          emailAddress: emailAddress ? "[REDACTED_EMAIL]" : "undefined",
        });

        showError("Verification Error", "Unable to verify your account. Please try again.", {
          type: 'error',
          showRetry: true,
          onRetry: () => onVerifyPress()
        });
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));

      // Log error to Sentry
      logError(err, {
        context: "SignUpScreen.onVerifyPress",
        emailAddress: emailAddress ? "[REDACTED_EMAIL]" : "undefined",
        codeProvided: !!code,
      });

      showError("Verification Failed", err?.errors?.[0]?.message || "Invalid verification code", {
        type: 'error',
        showRetry: true,
        onRetry: () => onVerifyPress()
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className='flex-1'>
      <StatusBar style='light' />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className='flex-1'
      >
        <View className='absolute top-0 left-0 right-0 h-40 overflow-hidden opacity-20'>
          {Array.from({ length: 10 }).map((_, i) => (
            <View
              key={`h-line-top-${i}`}
              className='absolute h-px bg-green-400/30'
              style={{
                width: width,
                top: i * 15,
                left: 0,
              }}
            />
          ))}
        </View>

        <View className='flex-1 justify-center px-6'>
          <View
            className='w-24 h-24 rounded-full bg-gray-800/70 items-center justify-center self-center mb-10 border border-green-400/40'
            style={{
              shadowColor: cyberpunkTheme.colors.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 20,
            }}
          >
            <Icon
              name={pendingVerification ? "email-check" : "account-plus"}
              size={48}
              color={cyberpunkTheme.colors.primary}
            />
          </View>

          <Text
            className='text-white text-4xl font-bold text-center mb-2'
            style={{
              textShadowColor: cyberpunkTheme.colors.primary,
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 10,
            }}
          >
            {pendingVerification ? "Verify Email" : "Create Account"}
          </Text>

          <Text className='text-gray-400 text-center mb-10'>
            {pendingVerification
              ? "Enter the code sent to your email"
              : "Fill in your details to create an account"}
          </Text>

          {pendingVerification ? (
            <View className='space-y-6'>
              <View
                className='bg-gray-800/30 rounded-xl p-6 border border-green-400/20'
                style={{
                  shadowColor: cyberpunkTheme.colors.primary,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.1,
                  shadowRadius: 10,
                }}
              >
                <Text className='text-gray-300 text-center mb-6'>
                  <Icon
                    name='shield-check'
                    size={16}
                    color={cyberpunkTheme.colors.primary}
                  />{" "}
                  Verification code sent to your email
                </Text>

                <View>
                  <View className='bg-gray-800/70 rounded-xl border border-gray-700 overflow-hidden'>
                    <View className='flex-row items-center'>
                      <Icon
                        name='key-variant'
                        size={20}
                        color={cyberpunkTheme.colors.primary}
                        className='ml-4'
                        style={{ marginLeft: 16 }}
                      />
                      <TextInput
                        className='flex-1 px-3 py-4 text-white text-center text-lg tracking-widest'
                        placeholderTextColor='#8F9BB3'
                        value={code}
                        placeholder='Enter verification code'
                        keyboardType='number-pad'
                        onChangeText={(text) => {
                          setCode(text);
                          if (verificationError) setVerificationError("");
                        }}
                      />
                    </View>
                  </View>
                  {verificationError ? (
                    <Text className='text-red-400 text-sm mt-2 ml-1 flex-row items-center'>
                      <Icon
                        name='alert-circle-outline'
                        size={14}
                        color='#f87171'
                      />{" "}
                      {verificationError}
                    </Text>
                  ) : null}
                </View>
              </View>

              <TouchableOpacity
                className='mt-8'
                onPress={onVerifyPress}
                disabled={isSubmitting}
              >
                <LinearGradient
                  colors={
                    cyberpunkTheme.colors.gradients.primary as [string, string]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className='rounded-xl py-4 items-center'
                  style={{
                    shadowColor: cyberpunkTheme.colors.primary,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.5,
                    shadowRadius: 15,
                  }}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color='#0A1115' size='small' />
                  ) : (
                    <Text className='text-gray-900 font-bold text-lg tracking-wide'>
                      Verify
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View className='gap-5'>
              <View>
                <View className='bg-gray-800/70 rounded-xl border border-gray-700 overflow-hidden'>
                  <View className='flex-row items-center'>
                    <Icon
                      name='at'
                      size={20}
                      color={cyberpunkTheme.colors.primary}
                      className='ml-4'
                      style={{ marginLeft: 16 }}
                    />
                    <TextInput
                      className='flex-1 px-3 py-4 text-white'
                      placeholderTextColor='#8F9BB3'
                      autoCapitalize='none'
                      keyboardType='email-address'
                      value={emailAddress}
                      placeholder='Email'
                      onChangeText={(text) => {
                        setEmailAddress(text);
                        if (emailError) setEmailError("");
                      }}
                    />
                  </View>
                </View>
                {emailError ? (
                  <Text className='text-red-400 text-sm mt-2 ml-1 flex-row items-center'>
                    <Icon
                      name='alert-circle-outline'
                      size={14}
                      color='#f87171'
                    />{" "}
                    {emailError}
                  </Text>
                ) : null}
              </View>

              <View>
                <View className='bg-gray-800/70 rounded-xl border border-gray-700 overflow-hidden'>
                  <View className='flex-row items-center'>
                    <Icon
                      name='lock'
                      size={20}
                      color={cyberpunkTheme.colors.primary}
                      className='ml-4'
                      style={{ marginLeft: 16 }}
                    />
                    <TextInput
                      className='flex-1 px-3 py-4 text-white'
                      placeholderTextColor='#8F9BB3'
                      value={password}
                      placeholder='Password (min. 8 characters)'
                      secureTextEntry={secureTextEntry}
                      onChangeText={(text) => {
                        setPassword(text);
                        if (passwordError) setPasswordError("");
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => setSecureTextEntry(!secureTextEntry)}
                      className='pr-4'
                    >
                      <Icon
                        name={
                          secureTextEntry ? "eye-outline" : "eye-off-outline"
                        }
                        size={20}
                        color='#8F9BB3'
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                {passwordError ? (
                  <Text className='text-red-400 text-sm mt-2 ml-1 flex-row items-center'>
                    <Icon
                      name='alert-circle-outline'
                      size={14}
                      color='#f87171'
                    />{" "}
                    {passwordError}
                  </Text>
                ) : null}
              </View>

              <View className='bg-gray-800/30 rounded-xl p-4 border border-green-400/10'>
                <Text className='text-gray-400 text-xs'>
                  <Icon
                    name='shield-lock'
                    size={14}
                    color={cyberpunkTheme.colors.primary}
                  />
                  Your information is stored securely.
                </Text>
              </View>

              <TouchableOpacity
                className='mt-6'
                onPress={onSignUpPress}
                disabled={isSubmitting}
              >
                <LinearGradient
                  colors={
                    cyberpunkTheme.colors.gradients.primary as [string, string]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className='rounded-xl py-4 items-center'
                  style={{
                    shadowColor: cyberpunkTheme.colors.primary,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.5,
                    shadowRadius: 15,
                  }}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color='#0A1115' size='small' />
                  ) : (
                    <Text className='text-gray-900 font-bold text-lg tracking-wide'>
                      Sign Up
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {!pendingVerification && (
            <View className='flex-row justify-center mt-8 items-center'>
              <Text className='text-gray-300'>Already registered? </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/sign-in")}>
                <Text
                  className='text-green-400 font-semibold'
                  style={{
                    textShadowColor: cyberpunkTheme.colors.primary,
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 8,
                  }}
                >
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View className='absolute bottom-10 left-0 right-0 items-center'>
            <View className='w-32 h-1 bg-green-400/20 rounded-full' />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
