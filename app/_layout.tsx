import React, { useEffect, useState, useRef } from "react";
import { StatusBar, View, Text, TouchableOpacity, Linking } from "react-native";
import { Linking as RNLinking } from "react-native";
import * as ExpoLinking from "expo-linking";
import {
  SplashScreen,
  Slot,
  useRouter,
  useSegments,
  useRootNavigationState,
} from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { cyberpunkTheme } from "@/constants/theme";
import "./globals.css";

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// --------------------
// ErrorBoundary Component
// --------------------
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorInfo: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorInfo: "" };
  }

  static getDerivedStateFromError() {
    return { hasError: true, errorInfo: "" };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, info);
    this.setState({ errorInfo: error.message });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View className='flex-1 items-center justify-center bg-gray-900'>
          <LinearGradient
            colors={
              cyberpunkTheme.colors.gradients.background as [string, string]
            }
            className='absolute inset-0'
          />
          <View className='p-6 bg-gray-800 rounded-lg w-4/5 max-w-md'>
            <StatusBar
              barStyle='light-content'
              backgroundColor={cyberpunkTheme.colors.background.dark}
            />
            <Text className='text-white text-xl font-bold mb-4'>
              Something went wrong
            </Text>
            <Text className='text-gray-300 mb-6'>
              {this.state.errorInfo ||
                "The app encountered an unexpected error."}
            </Text>
            <TouchableOpacity
              className='bg-blue-500 p-3 rounded-md'
              onPress={() => this.setState({ hasError: false })}
            >
              <Text className='text-white text-center font-medium'>
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

// --------------------
// UserStatus Enum
// --------------------
enum UserStatus {
  UNKNOWN = "unknown",
  NOT_SIGNED_IN = "not_signed_in",
  SIGNED_IN_NOT_IN_DB = "signed_in_not_in_db",
  SIGNED_IN_IN_DB = "signed_in_in_db",
}

// --------------------
// Deep Link Handler Hook
function useDeepLinkHandler() {
  const router = useRouter();
  const { isSignedIn, isLoaded, userId } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;

    const handleDeepLinkRaw = (rawUrl?: string) => {
      if (!rawUrl) return;
      try {
        console.log("DEEP LINK: Received URL:", rawUrl);

        // Use expo-linking to parse custom schemes robustly
        const parsed = ExpoLinking.parse(rawUrl);
        const path = parsed.path || ""; // ex: "chat-room/screen" or "debate/abc123//encodedImage"

        // Legacy / alternate: dtrue://debate/{id}//{encodedImage}  OR dtrue://debate/{id}/image/{...}
        if (path.startsWith("debate/")) {
          const parts = path.split("/");
          const debateId = parts[1] || "";
          let debateImage = "";

          // handle double-slash pattern or remaining segments as image
          if (parts.length >= 4 && parts[2] === "") {
            debateImage = parts.slice(3).join("/");
          } else if (parts.length >= 3) {
            debateImage = parts.slice(2).join("/");
          }

          try {
            debateImage = decodeURIComponent(debateImage);
          } catch (e) {
            /* ignore decode errors */
          }

          if (!debateId) return;

          if (isSignedIn) {
            router.push({
              pathname: "/(chat-room)/screen",
              params: {
                clerkId: userId,
                debateId,
                debateImage,
              },
            });
          } else {
            router.push("/onboarding");
          }
          return;
        }

        if (path.startsWith("profile/")) {
          const parts = path.split("/");
          const profileId = parts[1] || "";

          if (!profileId) return;

          if (isSignedIn) {
            router.push({
              pathname: "/(tabs)/[id]/page",
              params: { id: profileId },
            });
          } else {
            router.push("/onboarding");
          }
          return;
        }

        console.log(
          "DEEP LINK: Unknown path — falling back to default navigation"
        );
      } catch (err) {
        console.error("DEEP LINK: Error handling URL:", err);
      }
    };

    // Cold start: initial URL
    (async () => {
      try {
        const initialUrl = await RNLinking.getInitialURL();
        if (initialUrl) {
          console.log("DEEP LINK: initialUrl", initialUrl);
          // slight delay to let auth state settle
          setTimeout(() => handleDeepLinkRaw(initialUrl), 600);
        }
      } catch (e) {
        console.error("DEEP LINK: getInitialURL error", e);
      }
    })();

    // Runtime links (while app is running)
    const subscription = RNLinking.addEventListener("url", (ev) => {
      handleDeepLinkRaw(ev.url);
    });

    return () => {
      subscription?.remove?.();
    };
  }, [isLoaded, isSignedIn, userId, router]);
}

// --------------------
// AuthFlow Component (Overlaid on RootLayout)
// --------------------
function AuthFlow() {
  const { isSignedIn, isLoaded, userId } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const [mounted, setMounted] = useState(false);
  const [userStatus, setUserStatus] = useState<UserStatus>(UserStatus.UNKNOWN);
  const [isCheckingComplete, setIsCheckingComplete] = useState(false);
  const [apiError, setApiError] = useState<{
    message: string;
    isRetrying: boolean;
  } | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  // Use deep link handler
  useDeepLinkHandler();

  // Use a ref to persist whether redirection has already occurred
  const hasRedirectedRef = useRef(false);

  // Set mounted flag when component mounts
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Retry database check function
  const retryDatabaseCheck = async (userId: string) => {
    if (retryCount >= MAX_RETRIES) {
      setApiError({
        message:
          "Unable to connect to the server after multiple attempts. Please check your connection.",
        isRetrying: false,
      });
      setIsCheckingComplete(true);
      SplashScreen.hideAsync().catch((e) =>
        console.error("Failed to hide splash screen:", e)
      );
      return;
    }

    setRetryCount((prev) => prev + 1);
    setApiError({ message: "Retrying connection...", isRetrying: true });

    // Wait before retry (exponential backoff)
    await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, retryCount - 1)));

    // Perform check again
    checkUserStatus(userId);
  };

  // Main user status check function
  const checkUserStatus = async (userId: string) => {
    try {
      console.log("AUTH CHECK: Starting authentication check...");
      setApiError(null);

      // If user is not signed in, mark as not signed in
      if (!isSignedIn || !userId) {
        console.log("AUTH CHECK: User is not signed in", {
          isSignedIn,
          userId,
        });
        setUserStatus(UserStatus.NOT_SIGNED_IN);
        setIsCheckingComplete(true);
        return;
      }

      console.log("AUTH CHECK: User is signed in, checking database", {
        userId,
      });

      // Check if user exists in the database
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BASE_URL}/user/find/${userId}`,
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `Server returned ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("AUTH CHECK: Database response", data);

      if (data && data.statusCode === 200) {
        console.log("AUTH CHECK: User exists in database");
        setUserStatus(UserStatus.SIGNED_IN_IN_DB);
      } else {
        console.log("AUTH CHECK: User does NOT exist in database");
        setUserStatus(UserStatus.SIGNED_IN_NOT_IN_DB);
      }
      setIsCheckingComplete(true);
    } catch (error) {
      console.error("AUTH CHECK: Error checking user:", error);
      let errorMessage = "An error occurred while checking your account.";

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMessage = "Request timed out. Server may be unavailable.";
        } else {
          errorMessage = error.message;
        }
      }

      setApiError({ message: errorMessage, isRetrying: false });

      if (
        error instanceof Error &&
        (error.message.includes("network") ||
          error.name === "AbortError" ||
          error.message.includes("Network request failed"))
      ) {
        // Only retry if userId is defined
        if (userId) {
          retryDatabaseCheck(userId);
        }
        return;
      }
      setIsCheckingComplete(true);
      SplashScreen.hideAsync().catch((e) =>
        console.error("Failed to hide splash screen:", e)
      );
    }
  };

  // Run auth check whenever auth state changes
  useEffect(() => {
    if (!isLoaded) return;

    // Reset state for each check
    setIsCheckingComplete(false);
    setApiError(null);

    // Only check user status if there's a userId
    if (userId && typeof userId === "string") {
      checkUserStatus(userId);
    } else {
      // If no userId, user is not signed in
      setUserStatus(UserStatus.NOT_SIGNED_IN);
      setIsCheckingComplete(true);
    }
  }, [isLoaded, isSignedIn, userId]);

  // Once mounted and checks are complete, navigate if needed.
  useEffect(() => {
    if (!mounted || !isCheckingComplete || hasRedirectedRef.current) return;
    if (!navigationState?.key) return; // Make sure navigation is initialized

    // Skip navigation if we have an API error
    if (apiError && !apiError.isRetrying) return;

    // Check if we have a deep link that should take precedence
    const checkForDeepLink = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl && initialUrl !== "dtrue://") {
          console.log(
            "AUTH NAVIGATION: Deep link detected, skipping default navigation"
          );
          SplashScreen.hideAsync().catch((e) =>
            console.error("Failed to hide splash screen:", e)
          );
          return true; // Skip default navigation
        }
      } catch (error) {
        console.error("Error checking for deep link:", error);
      }
      return false;
    };

    checkForDeepLink().then((hasDeepLink) => {
      if (hasDeepLink) return;

      try {
        SplashScreen.hideAsync().catch((e) =>
          console.error("Failed to hide splash screen:", e)
        );

        // Log the state for debugging
        console.log("AUTH NAVIGATION: Ready to navigate", {
          userStatus,
          isSignedIn,
          hasRedirected: hasRedirectedRef.current,
          segments: segments,
          navState: navigationState?.key,
        });

        // Force navigation after a longer delay to ensure app is ready
        setTimeout(() => {
          if (userStatus === UserStatus.NOT_SIGNED_IN) {
            console.log("AUTH CHECK: Navigating to sign-in");
            hasRedirectedRef.current = true;
            router.replace("/onboarding");
          } else if (userStatus === UserStatus.SIGNED_IN_NOT_IN_DB) {
            console.log("AUTH CHECK: Navigating to boarding");
            hasRedirectedRef.current = true;
            router.replace("/(auth)/(boarding)/boarding");
          } else if (userStatus === UserStatus.SIGNED_IN_IN_DB) {
            console.log("AUTH CHECK: User verified, navigating to tabs");
            hasRedirectedRef.current = true;

            // Navigate to the main app tab
            router.replace("/(tabs)");
          }
        }, 1000); // Increased delay to 1 second for more reliable navigation
      } catch (error) {
        console.error("Navigation error:", error);
      }
    });
  }, [
    mounted,
    isCheckingComplete,
    userStatus,
    router,
    apiError,
    isSignedIn,
    navigationState?.key,
    segments,
  ]);

  // If database check failed, show an error overlay.
  if (apiError && !apiError.isRetrying && isCheckingComplete) {
    return (
      <View className='absolute inset-0 z-10 flex-1 items-center justify-center bg-gray-900 p-4'>
        <LinearGradient
          colors={
            cyberpunkTheme.colors.gradients.background as [string, string]
          }
          className='absolute inset-0'
        />
        <View className='bg-gray-800 p-6 rounded-lg w-4/5 max-w-md'>
          <Text className='text-red-500 text-xl font-bold mb-4'>
            Connection Error
          </Text>
          <Text className='text-white text-center mb-6'>
            {apiError.message}
          </Text>
          <TouchableOpacity
            className='bg-blue-500 p-3 rounded-md mb-4'
            onPress={() => {
              setRetryCount(0);
              setApiError(null);
              checkUserStatus(userId!);
            }}
          >
            <Text className='text-white text-center font-medium'>
              Try Again
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className='p-3 rounded-md'
            onPress={() => {
              router.replace("/(auth)/sign-in");
            }}
          >
            <Text className='text-gray-400 text-center'>Go to Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Render nothing while the check is underway (SplashScreen remains visible)
  return null;
}

// --------------------
// RootLayout Component (Always renders <Slot />)
// --------------------
export default function RootLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    throw new Error(
      "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in environment variables"
    );
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
            colors={
              cyberpunkTheme.colors.gradients.background as [string, string]
            }
            className='absolute inset-0'
          />
          {/* Render the AuthFlow overlay for auth checking and navigation */}
          <AuthFlow />
          {/* Always render the navigator */}
          <Slot />
        </View>
      </ErrorBoundary>
    </ClerkProvider>
  );
}
