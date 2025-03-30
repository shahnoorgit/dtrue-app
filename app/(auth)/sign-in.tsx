import { useSignIn } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { useState, useEffect } from "react";
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
  Animated,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { cyberpunkTheme } from "@/constants/theme";

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  // Handle the submission of the sign-in form
  const onSignInPress = async () => {
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
    } else {
      setPasswordError("");
    }

    if (!isValid) return;

    setIsSubmitting(true);

    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (signInAttempt.status === "complete") {
        // Set the active session
        await setActive({ session: signInAttempt.createdSessionId });
        
        // Force navigation to the tabs layout after successful authentication
        console.log("Sign in successful, directly navigating to app tabs");
        
        // Create a small delay to ensure the session is fully set
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Force navigation to the tabs
        router.replace("/(tabs)");
        
        // Add a fallback navigation as a safety net
        setTimeout(() => {
          console.log("NAVIGATION: Force redirecting to app tabs...");
          router.replace("/(tabs)/profile");
        }, 1000);
      } else {
        console.error(JSON.stringify(signInAttempt, null, 2));
        Alert.alert(
          "Error",
          "Unable to sign in. Please check your credentials."
        );
      }
    } catch (error: any) {
      console.error(JSON.stringify(error, null, 2));
      Alert.alert(
        "Sign In Failed",
        error.errors?.[0]?.message ||
          "Please check your credentials and try again."
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
        {/* Decorative cyberpunk element */}
        <View className='absolute top-10 left-0 right-0 items-center'>
          <View className='w-64 h-1 bg-green-400/20 rounded-full' />
        </View>

        <View className='flex-1 justify-center px-6'>
          {/* Icon with enhanced glow effect */}
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
              name='shield-key'
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
            VAULT ACCESS
          </Text>

          <Text className='text-gray-400 text-center mb-10'>
            Secure authentication required
          </Text>

          <View className='gap-5'>
            {/* Email input with improved styling */}
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
                  <Icon name='alert-circle-outline' size={14} color='#f87171' />{" "}
                  {emailError}
                </Text>
              ) : null}
            </View>

            {/* Password input with improved styling and show/hide toggle */}
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
                    placeholder='Password'
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
                      name={secureTextEntry ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color='#8F9BB3'
                    />
                  </TouchableOpacity>
                </View>
              </View>
              {passwordError ? (
                <Text className='text-red-400 text-sm mt-2 ml-1 flex-row items-center'>
                  <Icon name='alert-circle-outline' size={14} color='#f87171' />{" "}
                  {passwordError}
                </Text>
              ) : null}
            </View>

            {/* Sign In button with enhanced styling */}
            <TouchableOpacity
              className='mt-8'
              onPress={onSignInPress}
              disabled={isSubmitting}
            >
              <LinearGradient
                colors={cyberpunkTheme.colors.gradients.primary as [string, string]}
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
                    ACCESS APP
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Sign Up link with enhanced styling */}
          <View className='flex-row justify-center mt-8 items-center'>
            <Text className='text-gray-300'>New to the App? </Text>
            <Link href='/(auth)/sign-up' asChild>
              <TouchableOpacity>
                <Text
                  className='text-green-400 font-semibold'
                  style={{
                    textShadowColor: cyberpunkTheme.colors.primary,
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 8,
                  }}
                >
                  CREATE ACCESS
                </Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* Decorative cyberpunk element */}
          <View className='absolute bottom-10 left-0 right-0 items-center'>
            <View className='w-32 h-1 bg-green-400/20 rounded-full' />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
