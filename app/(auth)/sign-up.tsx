import { useState } from "react";
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
import { Link, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { cyberpunkTheme } from "@/constants/theme";

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();
  const { width } = Dimensions.get("window");

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [secureTextEntry, setSecureTextEntry] = useState(true);

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

      // Send user an email with verification code
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      // Set 'pendingVerification' to true to display second form
      setPendingVerification(true);
      setIsSubmitting(false);
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
      Alert.alert(
        "Sign Up Failed",
        err.errors?.[0]?.message || "An error occurred during sign up"
      );
      setIsSubmitting(false);
    }
  };

  // Handle submission of verification form
const onVerifyPress = async () => {
  if (!isLoaded || isSubmitting) return;

  if (!code.trim()) {
    setVerificationError("Verification code is required");
    return;
  }

  setIsSubmitting(true);

  try {
    // Use the code the user provided to attempt verification
    const signUpAttempt = await signUp.attemptEmailAddressVerification({
      code,
    });

    // If verification was completed, set the session to active and redirect
    if (signUpAttempt.status === "complete") {
      await setActive({ session: signUpAttempt.createdSessionId });
      router.replace("/boarding");
    } else {
      console.error(JSON.stringify(signUpAttempt, null, 2));
      Alert.alert(
        "Verification Error",
        "Unable to verify your account. Please try again."
      );
    }
  } catch (err) {
    console.error(JSON.stringify(err, null, 2));
    Alert.alert(
      "Verification Failed",
      err.errors?.[0]?.message || "Invalid verification code"
    );
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
        {/* Decorative cyberpunk grid lines */}
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
          {/* Enhanced icon with glow */}
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
            {pendingVerification ? "VERIFY ID" : "NEW IDENTITY"}
          </Text>

          <Text className='text-gray-400 text-center mb-10'>
            {pendingVerification
              ? "Security protocol active"
              : "System access registration"}
          </Text>

          {/* Verification form */}
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
                  colors={cyberpunkTheme.colors.gradients.primary}
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
                      AUTHENTICATE
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View className='gap-5'>
              {/* Email input with enhanced styling */}
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

              {/* Password input with show/hide toggle */}
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

              {/* Security notice */}
              <View className='bg-gray-800/30 rounded-xl p-4 border border-green-400/10'>
                <Text className='text-gray-400 text-xs'>
                  <Icon
                    name='shield-lock'
                    size={14}
                    color={cyberpunkTheme.colors.primary}
                  />{" "}
                  Your credentials are protected with advanced encryption.
                  System access is monitored and secured.
                </Text>
              </View>

              {/* Sign Up button */}
              <TouchableOpacity
                className='mt-6'
                onPress={onSignUpPress}
                disabled={isSubmitting}
              >
                <LinearGradient
                  colors={cyberpunkTheme.colors.gradients.primary}
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
                      CREATE IDENTITY
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Sign In link */}
          {!pendingVerification && (
            <View className='flex-row justify-center mt-8 items-center'>
              <Text className='text-gray-300'>Already registered? </Text>
              <Link href='/(auth)/sign-in' asChild>
                <TouchableOpacity>
                  <Text
                    className='text-green-400 font-semibold'
                    style={{
                      textShadowColor: cyberpunkTheme.colors.primary,
                      textShadowOffset: { width: 0, height: 0 },
                      textShadowRadius: 8,
                    }}
                  >
                    ACCESS SYSTEM
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          )}

          {/* Decorative cyberpunk element */}
          <View className='absolute bottom-10 left-0 right-0 items-center'>
            <View className='w-32 h-1 bg-green-400/20 rounded-full' />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
