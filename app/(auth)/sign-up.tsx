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
                  name={pendingVerification ? "email-check" : "account-plus"}
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
                {pendingVerification ? "Verify Email" : "Create Account"}
              </Text>

              <Text className='text-gray-300 text-center text-base leading-6'>
                {pendingVerification
                  ? "Enter the verification code sent to your email"
                  : "Join the debate community and start sharing your thoughts"}
              </Text>
            </View>
          </View>

          {/* Form Section */}
          <View style={{ flex: 1, justifyContent: 'center' }}>

          {pendingVerification ? (
            <View style={{ gap: 24 }}>
              {/* Verification Info Card */}
              <View
                className='bg-gray-800/40 rounded-2xl p-6 border border-green-400/30'
                style={{
                  shadowColor: cyberpunkTheme.colors.primary,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.2,
                  shadowRadius: 15,
                  elevation: 8,
                }}
              >
                <View className='items-center mb-6'>
                  <View className='w-16 h-16 rounded-full bg-green-400/10 items-center justify-center mb-4'>
                    <Icon
                      name='email-check'
                      size={32}
                      color={cyberpunkTheme.colors.primary}
                    />
                  </View>
                  <Text className='text-gray-200 text-lg font-semibold text-center mb-2'>
                    Check Your Email
                  </Text>
                  <Text className='text-gray-400 text-sm text-center leading-5'>
                    We've sent a verification code to{"\n"}
                    <Text className='text-green-400 font-medium'>{emailAddress}</Text>
                  </Text>
                </View>

                {/* Verification Code Input */}
                <View>
                  <Text className='text-gray-300 text-sm font-medium mb-3 ml-1'>
                    Verification Code
                  </Text>
                  <View 
                    className={`bg-gray-800/60 rounded-xl border-2 overflow-hidden ${
                      verificationError ? 'border-red-400/60' : 'border-gray-600/40'
                    } ${code ? 'border-green-400/40' : ''}`}
                    style={{
                      shadowColor: code ? cyberpunkTheme.colors.primary : 'transparent',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 5,
                    }}
                  >
                    <View className='flex-row items-center px-4 py-4'>
                      <Icon
                        name='key-variant'
                        size={22}
                        color={verificationError ? '#f87171' : code ? cyberpunkTheme.colors.primary : '#6B7280'}
                        style={{ marginRight: 12 }}
                      />
                      <TextInput
                        style={{
                          flex: 1,
                          color: 'white',
                          fontSize: 18,
                          textAlign: 'center',
                          letterSpacing: 2,
                          paddingVertical: 4,
                        }}
                        placeholderTextColor='#9CA3AF'
                        value={code}
                        placeholder='Enter 6-digit code'
                        keyboardType='number-pad'
                        maxLength={6}
                        onChangeText={(text) => {
                          setCode(text);
                          if (verificationError) setVerificationError("");
                        }}
                      />
                      {code && code.length === 6 && !verificationError && (
                        <Icon name='check-circle' size={20} color={cyberpunkTheme.colors.primary} />
                      )}
                    </View>
                  </View>
                  {verificationError && (
                    <View className='flex-row items-center mt-2 ml-1'>
                      <Icon name='alert-circle-outline' size={16} color='#f87171' />
                      <Text className='text-red-400 text-sm ml-2'>{verificationError}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Verify Button */}
              <TouchableOpacity
                onPress={onVerifyPress}
                disabled={isSubmitting || code.length !== 6}
                className='w-full'
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    code.length === 6 && !isSubmitting
                      ? cyberpunkTheme.colors.gradients.primary as [string, string]
                      : ['#374151', '#374151']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className='rounded-xl py-4 px-6 items-center'
                  style={{
                    shadowColor: code.length === 6 ? cyberpunkTheme.colors.primary : 'transparent',
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
                        Verifying...
                      </Text>
                    </View>
                  ) : (
                    <Text className={`font-bold text-lg tracking-wide ${
                      code.length === 6 ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      Verify Email
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
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
                      style={{
                        flex: 1,
                        color: 'white',
                        fontSize: 16,
                        paddingVertical: 4,
                      }}
                      placeholderTextColor='#9CA3AF'
                      autoComplete='password'
                      value={password}
                      placeholder='Create a strong password'
                      secureTextEntry={secureTextEntry}
                      onChangeText={(text) => {
                        setPassword(text);
                        if (passwordError) setPasswordError("");
                      }}
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

              {/* Security Notice */}
              <View className='bg-gray-800/30 rounded-xl p-4 border border-green-400/20'>
                <View className='flex-row items-center'>
                  <Icon
                    name='shield-lock'
                    size={18}
                    color={cyberpunkTheme.colors.primary}
                    style={{ marginRight: 12 }}
                  />
                  <Text className='text-gray-300 text-sm flex-1'>
                    Your information is encrypted and stored securely. We never share your data.
                  </Text>
                </View>
              </View>

              {/* Sign Up Button */}
              <TouchableOpacity
                onPress={onSignUpPress}
                disabled={isSubmitting}
                className='w-full mt-2'
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
                        Creating Account...
                      </Text>
                    </View>
                  ) : (
                    <Text className='text-gray-900 font-bold text-lg tracking-wide'>
                      Create Account
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          </View>

          {/* Footer Section */}
          {!pendingVerification && (
            <View style={{ paddingBottom: 24, paddingTop: 16 }}>
              <View className='items-center space-y-4'>
                {/* Divider */}
                <View className='flex-row items-center w-full'>
                  <View className='flex-1 h-px bg-gray-700' />
                  <Text className='text-gray-500 text-sm px-4'>OR</Text>
                  <View className='flex-1 h-px bg-gray-700' />
                </View>

                {/* Sign In Link */}
                <View className='flex-row items-center'>
                  <Text className='text-gray-300 text-base'>Already have an account? </Text>
                  <TouchableOpacity 
                    onPress={() => router.push("/(auth)/sign-in")}
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
                      Sign In
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
      </View>
    </SafeAreaView>
  );
}

