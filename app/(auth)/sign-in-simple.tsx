import React, { useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useSignIn } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { cyberpunkTheme } from "@/constants/theme";
import { logError } from "@/utils/sentry/sentry";

export default function SignInScreenSimple() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  const onSignInPress = async () => {
    if (!isLoaded || isSubmitting) return;

    let isValid = true;
    if (!emailAddress.trim()) {
      setEmailError("Email is required");
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
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      console.error("sign in error", err);
      
      // Log error to Sentry
      logError(err, {
        context: "SignInScreenSimple.onSignInPress",
        emailAddress: emailAddress ? "[REDACTED_EMAIL]" : "undefined",
        clerkErrorCode: err?.errors?.[0]?.code,
      });
      
      setEmailError("Invalid credentials");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080F12' }}>
      <StatusBar style='light' />
      
      <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        {/* Header */}
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: 'rgba(128, 128, 128, 0.3)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
            borderWidth: 2,
            borderColor: 'rgba(0, 255, 148, 0.5)',
          }}>
            <Icon name='shield-key' size={40} color={cyberpunkTheme.colors.primary} />
          </View>
          
          <Text style={{
            color: 'white',
            fontSize: 32,
            fontWeight: 'bold',
            marginBottom: 8,
          }}>
            Welcome Back
          </Text>

          <Text style={{
            color: '#9CA3AF',
            fontSize: 16,
            textAlign: 'center',
          }}>
            Sign in to continue your journey
          </Text>
        </View>

        {/* Form */}
        <View style={{ marginBottom: 40 }}>
          {/* Email Input */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: '#D1D5DB', fontSize: 14, marginBottom: 12 }}>
              Email Address
            </Text>
            <View style={{
              backgroundColor: 'rgba(128, 128, 128, 0.3)',
              borderRadius: 12,
              borderWidth: 2,
              borderColor: emailError ? '#f87171' : 'rgba(128, 128, 128, 0.4)',
              paddingHorizontal: 16,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              <Icon name='at' size={22} color='#6B7280' style={{ marginRight: 12 }} />
              <TextInput
                style={{
                  flex: 1,
                  color: 'white',
                  fontSize: 16,
                }}
                placeholderTextColor='#9CA3AF'
                autoCapitalize='none'
                keyboardType='email-address'
                value={emailAddress}
                placeholder='Enter your email'
                onChangeText={(text) => {
                  setEmailAddress(text);
                  if (emailError) setEmailError("");
                }}
              />
            </View>
            {emailError && (
              <Text style={{ color: '#f87171', fontSize: 14, marginTop: 8 }}>
                {emailError}
              </Text>
            )}
          </View>

          {/* Password Input */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: '#D1D5DB', fontSize: 14, marginBottom: 12 }}>
              Password
            </Text>
            <View style={{
              backgroundColor: 'rgba(128, 128, 128, 0.3)',
              borderRadius: 12,
              borderWidth: 2,
              borderColor: passwordError ? '#f87171' : 'rgba(128, 128, 128, 0.4)',
              paddingHorizontal: 16,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              <Icon name='lock' size={22} color='#6B7280' style={{ marginRight: 12 }} />
              <TextInput
                style={{
                  flex: 1,
                  color: 'white',
                  fontSize: 16,
                }}
                placeholderTextColor='#9CA3AF'
                value={password}
                placeholder='Enter your password'
                secureTextEntry={secureTextEntry}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) setPasswordError("");
                }}
              />
              <TouchableOpacity
                onPress={() => setSecureTextEntry(!secureTextEntry)}
                style={{ padding: 4 }}
              >
                <Icon
                  name={secureTextEntry ? "eye-outline" : "eye-off-outline"}
                  size={22}
                  color='#9CA3AF'
                />
              </TouchableOpacity>
            </View>
            {passwordError && (
              <Text style={{ color: '#f87171', fontSize: 14, marginTop: 8 }}>
                {passwordError}
              </Text>
            )}
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            onPress={onSignInPress}
            disabled={isSubmitting}
            style={{ marginTop: 20 }}
          >
            <LinearGradient
              colors={cyberpunkTheme.colors.gradients.primary as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
              }}
            >
              {isSubmitting ? (
                <ActivityIndicator color='#0A1115' size='small' />
              ) : (
                <Text style={{
                  color: '#0A1115',
                  fontWeight: 'bold',
                  fontSize: 18,
                }}>
                  Sign In
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={{ alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: '#D1D5DB', fontSize: 16 }}>New to Dtrue? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/sign-up")}>
              <Text style={{
                color: cyberpunkTheme.colors.primary,
                fontWeight: 'bold',
                fontSize: 16,
              }}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
