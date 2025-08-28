import React, { useEffect, useState, useRef } from "react";
import {
  StatusBar,
  View,
  Text,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
} from "react-native";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import "./globals.css";

// keep splash visible until we explicitly hide
SplashScreen.preventAutoHideAsync();

// ---------------- ErrorBoundary ----------------
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
    console.error("ErrorBoundary caught:", error, info);
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

// ---------------- UserStatus enum ----------------
enum UserStatus {
  UNKNOWN = "unknown",
  NOT_SIGNED_IN = "not_signed_in",
  SIGNED_IN_NOT_IN_DB = "signed_in_not_in_db",
  SIGNED_IN_IN_DB = "signed_in_in_db",
}

// ---------------- Deep link handler ----------------
function useDeepLinkHandler() {
  const router = useRouter();
  const { isSignedIn, isLoaded, userId } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;

    const handleDeepLinkRaw = (rawUrl?: string) => {
      if (!rawUrl) return;
      try {
        console.log("DEEP LINK: Received URL:", rawUrl);
        const parsed = ExpoLinking.parse(rawUrl);
        const path = parsed.path || "";

        if (path.startsWith("debate/")) {
          const parts = path.split("/");
          const debateId = parts[1] || "";
          let debateImage = "";

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
              params: { clerkId: userId, debateId, debateImage },
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

        console.log("DEEP LINK: Unknown path — fallback");
      } catch (err) {
        console.error("DEEP LINK: Error handling URL:", err);
      }
    };

    (async () => {
      try {
        const initialUrl = await RNLinking.getInitialURL();
        if (initialUrl) {
          console.log("DEEP LINK: initialUrl", initialUrl);
          // give auth a moment to stabilize
          setTimeout(() => handleDeepLinkRaw(initialUrl), 600);
        }
      } catch (e) {
        console.error("DEEP LINK: getInitialURL error", e);
      }
    })();

    const subscription = RNLinking.addEventListener("url", (ev) => {
      handleDeepLinkRaw(ev.url);
    });

    return () => subscription?.remove?.();
  }, [isLoaded, isSignedIn, userId, router]);
}

// ---------------- Push token registration (POST only) ----------------
/**
 * Strategy:
 * - Read stored token from AsyncStorage.
 * - Ensure permission (only request if not granted).
 * - Get current expo push token.
 * - If different from stored token, POST to backend:
 *    POST ${BASE_URL}/users/${clerkId}/push-token  { token }
 * - Save the new token in AsyncStorage after success.
 */
async function registerPushTokenIfNeeded(clerkId: string) {
  const STORAGE_KEY = "expoPushToken";
  try {
    // 1) read stored token
    const storedToken = await AsyncStorage.getItem(STORAGE_KEY);

    // 2) check permission (don't always re-prompt)
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      // request once — user may deny
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log(
        "Push notifications not granted - skipping token registration"
      );
      return;
    }

    // 3) get current expo push token
    const tokenResp = await Notifications.getExpoPushTokenAsync({
      projectId:
        Constants.expoConfig?.extra?.eas?.projectId ||
        process.env.EXPO_PUBLIC_PROJECT_ID,
    });
    const currentToken = tokenResp.data;
    if (!currentToken) {
      console.warn("Could not obtain Expo push token");
      return;
    }

    // 4) compare and update only if different
    if (storedToken === currentToken) {
      console.log("Push token unchanged — no backend call required");
      return;
    }

    // 5) POST to backend
    const base =
      process.env.EXPO_PUBLIC_BASE_URL ||
      process.env.API_URL ||
      "https://your-api.com";
    const url = `${base.replace(/\/$/, "")}/user/${encodeURIComponent(
      clerkId
    )}/push-token`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: currentToken,
        platform: Platform.OS, // 👈 "ios" or "android"
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Failed to POST push token to backend:", res.status, text);
      return;
    }

    // 6) store token locally
    await AsyncStorage.setItem(STORAGE_KEY, currentToken);
    console.log("Registered new push token and saved locally");
  } catch (err) {
    console.error("registerPushTokenIfNeeded error:", err);
  }
}

// ---------------- AuthFlow ----------------
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
  const hasRedirectedRef = useRef(false);

  useDeepLinkHandler();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const retryDatabaseCheck = async (clerkId: string) => {
    if (retryCount >= MAX_RETRIES) {
      setApiError({
        message: "Unable to connect after multiple attempts.",
        isRetrying: false,
      });
      setIsCheckingComplete(true);
      SplashScreen.hideAsync().catch(console.error);
      return;
    }
    setRetryCount((p) => p + 1);
    setApiError({ message: "Retrying connection...", isRetrying: true });
    await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, retryCount)));
    checkUserStatus(clerkId);
  };

  const checkUserStatus = async (clerkId: string) => {
    try {
      console.log("AUTH CHECK: checking user in backend", clerkId);
      setApiError(null);

      if (!isSignedIn || !clerkId) {
        setUserStatus(UserStatus.NOT_SIGNED_IN);
        setIsCheckingComplete(true);
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const base =
        process.env.EXPO_PUBLIC_BASE_URL ||
        process.env.API_URL ||
        "https://your-api.com";
      const res = await fetch(
        `${base.replace(/\/$/, "")}/user/find/${encodeURIComponent(clerkId)}`,
        {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      clearTimeout(timeoutId);

      if (res.status === 404) {
        console.log("AUTH CHECK: user not found in DB");
        setUserStatus(UserStatus.SIGNED_IN_NOT_IN_DB);
        setIsCheckingComplete(true);
        return;
      }

      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const data = await res.json();
      if (data && data.statusCode === 200) {
        setUserStatus(UserStatus.SIGNED_IN_IN_DB);
        // only after user exists in DB, register push token
        await registerPushTokenIfNeeded(clerkId);
      } else {
        setUserStatus(UserStatus.SIGNED_IN_NOT_IN_DB);
      }

      setIsCheckingComplete(true);
    } catch (err: any) {
      console.error("AUTH CHECK error:", err);
      const message =
        err?.name === "AbortError"
          ? "Request timed out"
          : err?.message ?? "Unknown error";
      setApiError({ message, isRetrying: false });

      if (
        err?.name === "AbortError" ||
        (err?.message || "").toLowerCase().includes("network")
      ) {
        if (clerkId) retryDatabaseCheck(clerkId);
        return;
      }

      setIsCheckingComplete(true);
      SplashScreen.hideAsync().catch(console.error);
    }
  };

  // trigger check when auth becomes available
  useEffect(() => {
    if (!isLoaded) return;
    setIsCheckingComplete(false);
    setApiError(null);

    if (userId) {
      checkUserStatus(userId);
    } else {
      setUserStatus(UserStatus.NOT_SIGNED_IN);
      setIsCheckingComplete(true);
    }
  }, [isLoaded, isSignedIn, userId]);

  // navigate once checks complete (unless deep link present)
  useEffect(() => {
    if (!mounted || !isCheckingComplete || hasRedirectedRef.current) return;
    if (!navigationState?.key) return;
    if (apiError && !apiError.isRetrying) return;

    const checkDeepLinkThenNavigate = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl && initialUrl !== "dtrue://") {
          SplashScreen.hideAsync().catch(console.error);
          return;
        }
      } catch (e) {
        console.error("deep link check error:", e);
      }

      SplashScreen.hideAsync().catch(console.error);

      // small delay so ui is stable
      setTimeout(() => {
        if (userStatus === UserStatus.NOT_SIGNED_IN) {
          hasRedirectedRef.current = true;
          router.replace("/onboarding");
        } else if (userStatus === UserStatus.SIGNED_IN_NOT_IN_DB) {
          hasRedirectedRef.current = true;
          router.replace("/(auth)/(boarding)/boarding");
        } else if (userStatus === UserStatus.SIGNED_IN_IN_DB) {
          hasRedirectedRef.current = true;
          router.replace("/(tabs)");
        }
      }, 700);
    };

    checkDeepLinkThenNavigate();
  }, [
    mounted,
    isCheckingComplete,
    userStatus,
    router,
    apiError,
    navigationState?.key,
    segments,
  ]);

  // show connection error overlay if needed
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
            onPress={() => router.replace("/(auth)/sign-in")}
          >
            <Text className='text-gray-400 text-center'>Go to Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
}

// ---------------- RootLayout ----------------
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
          <AuthFlow />
          <Slot />
        </View>
      </ErrorBoundary>
    </ClerkProvider>
  );
}
