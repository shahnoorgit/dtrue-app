import React from "react";
import { StatusBar, View, ActivityIndicator } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { cyberpunkTheme } from "@/constants/theme";
import "./globals.css";

// A robust error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View className='flex-1 items-center justify-center bg-gray-900'>
          <LinearGradient
            colors={cyberpunkTheme.colors.gradients.background}
            className='absolute inset-0'
          />
          <View className='p-4 bg-gray-800 rounded'>
            <StatusBar
              barStyle='light-content'
              backgroundColor={cyberpunkTheme.colors.background.dark}
            />
            <ActivityIndicator
              size='large'
              color={cyberpunkTheme.colors.text.accent}
            />
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

// AuthWrapper handles redirection based on auth state and shows a loading spinner
function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoaded) return; // Wait until Clerk finishes loading

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "onboarding";

    // If the user is not signed in and not already on the onboarding or auth screens, redirect them
    if (!isSignedIn && !inAuthGroup && !inOnboarding) {
      router.replace("/onboarding");
      return;
    }

    // If the user is signed in and is on the onboarding or auth screens, send them to the main app
    if (isSignedIn && (inAuthGroup || inOnboarding)) {
      router.replace("/(tabs)");
      return;
    }
  }, [isSignedIn, isLoaded, segments, router]);

  // Display loading spinner until Clerk is ready
  if (!isLoaded) {
    return (
      <View className='flex-1 items-center justify-center bg-gray-900'>
        <LinearGradient
          colors={cyberpunkTheme.colors.gradients.background}
          className='absolute inset-0'
        />
        <ActivityIndicator
          size='large'
          color={cyberpunkTheme.colors.text.accent}
        />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    throw new Error("Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to your .env file");
  }

  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <ErrorBoundary>
        <View className='flex-1 bg-gray-900'>
          <StatusBar
            barStyle='light-content'
            backgroundColor={cyberpunkTheme.colors.background.dark}
          />
          <LinearGradient
            colors={cyberpunkTheme.colors.gradients.background}
            className='absolute inset-0'
          />
          <AuthWrapper>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: "transparent" },
              }}
            >
              <Stack.Screen name='index' redirect={true} />
              <Stack.Screen
                name='onboarding'
                options={{ gestureEnabled: false }}
              />
              <Stack.Screen name='(auth)' />
              <Stack.Screen name='(tabs)' />
            </Stack>
          </AuthWrapper>
        </View>
      </ErrorBoundary>
    </ClerkProvider>
  );
}
