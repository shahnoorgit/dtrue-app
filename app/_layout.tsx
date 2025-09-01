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
import * as Sentry from "@sentry/react-native";
import { setSentryUser, logError } from "@/utils/sentry/sentry"; // <-- Import logError

function SentryUserWrapper() {
  const { isLoaded, isSignedIn, userId } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn && userId) {
      setSentryUser(userId);
    } else {
      setSentryUser(""); // or Sentry.setUser(null)
    }
  }, [isLoaded, isSignedIn, userId]);

  return null;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

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

    const handleDeepLinkRaw = (rawUrl?: string, source: string = "unknown") => {
      if (!rawUrl) return;
      try {
        console.log(`[DEEP LINK] Received URL from ${source}:`, rawUrl);
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
          } catch {
            /* ignore decode errors */
          }

          if (!debateId) return;

          if (isSignedIn) {
            console.log("[DEEP LINK] Navigating to debate screen");
            router.push({
              pathname: "/(chat-room)/screen",
              params: { clerkId: userId, debateId, debateImage },
            });
          } else {
            console.log("[DEEP LINK] User not signed in → onboarding");
            router.push("/onboarding");
          }
          return;
        }

        if (path.startsWith("profile/")) {
          const parts = path.split("/");
          const profileId = parts[1] || "";
          if (!profileId) return;

          if (isSignedIn) {
            console.log("[DEEP LINK] Navigating to profile page");
            router.push({
              pathname: "/(tabs)/[id]/page",
              params: { id: profileId },
            });
          } else {
            console.log("[DEEP LINK] User not signed in → onboarding");
            router.push("/onboarding");
          }
          return;
        }

        console.log("[DEEP LINK] Unknown path — fallback", path);
      } catch (err) {
        console.error("[DEEP LINK] Error handling URL:", err);
      }
    };

    (async () => {
      try {
        const lastResponse =
          await Notifications.getLastNotificationResponseAsync();
        if (lastResponse) {
          const deeplink =
            lastResponse.notification.request.content.data?.deeplink;
          if (deeplink) {
            console.log("[DEEP LINK] Cold start from notification");
            setTimeout(
              () => handleDeepLinkRaw(deeplink, "notification (cold start)"),
              600
            );
            return;
          }
        }

        const initialUrl = await RNLinking.getInitialURL();
        if (initialUrl) {
          console.log("[DEEP LINK] Cold start from deep link");
          setTimeout(
            () => handleDeepLinkRaw(initialUrl, "Linking.getInitialURL"),
            600
          );
        }
      } catch (e) {
        console.error("[DEEP LINK] getInitialURL error", e);
      }
    })();

    const subscription = RNLinking.addEventListener("url", (ev) => {
      handleDeepLinkRaw(ev.url, "runtime deep link");
    });

    const notifSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log(
          "[DEEP LINK] Notification tapped (foreground/background)",
          response
        );
        const deeplink = response.notification.request.content.data?.deeplink;
        if (deeplink) {
          handleDeepLinkRaw(deeplink, "notification (tap)");
        }
      }
    );

    return () => {
      subscription?.remove?.();
      notifSub.remove();
    };
  }, [isLoaded, isSignedIn, userId, router]);
}

// ---------------- Push token registration (POST only) ----------------
async function registerPushTokenIfNeeded(clerkId: string) {
  const STORAGE_KEY = "expoPushToken";
  try {
    const storedToken = await AsyncStorage.getItem(STORAGE_KEY);

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log(
        "Push notifications not granted - skipping token registration"
      );
      return;
    }

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

    if (storedToken === currentToken) {
      console.log("Push token unchanged — no backend call required");
      return;
    }

    // Use a more robust base URL fallback
    const base =
      process.env.EXPO_PUBLIC_BASE_URL ||
      process.env.API_URL ||
      "https://your-api.com"; // <-- Corrected fallback

    const url = `${base.replace(/\/$/, "")}/user/${encodeURIComponent(
      clerkId
    )}/push-token`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: currentToken,
        platform: Platform.OS,
      }),
      signal: controller.signal, // Attach signal
    });

    clearTimeout(timeoutId); // Clear timeout

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const errorDetails = {
        message: "Failed to POST push token to backend",
        status: res.status,
        statusText: res.statusText,
        responseText: text,
        url: url,
        clerkId: clerkId,
        token: currentToken ? "[REDACTED]" : "undefined",
      };
      console.error(errorDetails.message, errorDetails);
      logError(new Error(errorDetails.message), errorDetails); // <-- Log to Sentry
      return; // Don't save token if backend update failed
    }

    await AsyncStorage.setItem(STORAGE_KEY, currentToken);
    console.log("Registered new push token and saved locally");
  } catch (err: any) {
    const errorMessage =
      err?.name === "AbortError"
        ? "Push token registration timed out"
        : "registerPushTokenIfNeeded error";
    console.error(errorMessage, err);
    logError(err, { message: errorMessage, clerkId }); // <-- Log to Sentry
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
  // Add a ref to hold the timeout ID for checkUserStatus
  const checkUserStatusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      setMounted(false);
      // Clear any pending timeouts on unmount
      if (checkUserStatusTimeoutRef.current) {
        clearTimeout(checkUserStatusTimeoutRef.current);
      }
    };
  }, []);

  const retryDatabaseCheck = async (clerkId: string) => {
    if (retryCount >= MAX_RETRIES) {
      const finalError = new Error(
        "Unable to connect after multiple attempts."
      );
      logError(finalError, { clerkId, retryCount, maxRetries: MAX_RETRIES }); // <-- Log to Sentry
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

      // Clear any previous timeout
      if (checkUserStatusTimeoutRef.current) {
        clearTimeout(checkUserStatusTimeoutRef.current);
      }

      if (!isSignedIn || !clerkId) {
        setUserStatus(UserStatus.NOT_SIGNED_IN);
        setIsCheckingComplete(true);
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        // Handle timeout specifically here if needed, or let catch handle it
      }, 10000); // 10s timeout
      checkUserStatusTimeoutRef.current = timeoutId; // Store timeout ID

      // Use a more robust base URL fallback
      const base =
        process.env.EXPO_PUBLIC_BASE_URL ||
        process.env.API_URL ||
        "https://your-api.com"; // <-- Corrected fallback

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

      clearTimeout(timeoutId); // Clear timeout on success/failure
      checkUserStatusTimeoutRef.current = null; // Clear stored ID

      if (res.status === 404) {
        console.log("AUTH CHECK: user not found in DB");
        setUserStatus(UserStatus.SIGNED_IN_NOT_IN_DB);
        setIsCheckingComplete(true);
        return;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const errorDetails = {
          message: `User status check failed: ${res.status} ${res.statusText}`,
          status: res.status,
          statusText: res.statusText,
          responseText: text,
          url: `${base.replace(/\/$/, "")}/user/find/${encodeURIComponent(
            clerkId
          )}`,
          clerkId: clerkId,
        };
        console.error(errorDetails.message, errorDetails);
        logError(new Error(errorDetails.message), errorDetails); // <-- Log to Sentry
        setApiError({ message: `API Error: ${res.status}`, isRetrying: false }); // <-- Set UI Error
        setIsCheckingComplete(true);
        return;
      }

      const data = await res.json();
      if (data && data.statusCode === 200) {
        setUserStatus(UserStatus.SIGNED_IN_IN_DB);
        await registerPushTokenIfNeeded(clerkId);
      } else {
        // Optional: Log unexpected response structure
        // const errorDetails = {
        //    message: "Unexpected response structure from user status check",
        //    dataReceived: data,
        //    clerkId: clerkId,
        //    url: `${base.replace(/\/$/, "")}/user/find/${encodeURIComponent(clerkId)}`,
        // };
        // console.warn(errorDetails.message, errorDetails);
        // logError(new Error(errorDetails.message), errorDetails);
        setUserStatus(UserStatus.SIGNED_IN_NOT_IN_DB);
      }

      setIsCheckingComplete(true);
    } catch (err: any) {
      // Ensure timeout is cleared on error
      if (checkUserStatusTimeoutRef.current) {
        clearTimeout(checkUserStatusTimeoutRef.current);
        checkUserStatusTimeoutRef.current = null;
      }

      console.error("AUTH CHECK error:", err);
      const errorMessage =
        err?.name === "AbortError"
          ? "User status check timed out"
          : err?.message ?? "Unknown error during user status check";
      const errorContext = {
        message: errorMessage,
        clerkId: clerkId,
        originalError: err,
      };
      logError(err, errorContext); // <-- Log to Sentry

      if (
        err?.name === "AbortError" ||
        (err?.message || "").toLowerCase().includes("network")
      ) {
        if (clerkId) {
          retryDatabaseCheck(clerkId);
        } else {
          setIsCheckingComplete(true);
          SplashScreen.hideAsync().catch(console.error);
        }
        return;
      }

      setApiError({ message: errorMessage, isRetrying: false });
      setIsCheckingComplete(true);
      SplashScreen.hideAsync().catch(console.error);
    }
  };

  useEffect(() => {
    if (!isLoaded) return;
    setIsCheckingComplete(false);
    setApiError(null);
    setRetryCount(0); // Reset retry count on auth state change

    if (userId) {
      checkUserStatus(userId);
    } else {
      setUserStatus(UserStatus.NOT_SIGNED_IN);
      setIsCheckingComplete(true);
    }
  }, [isLoaded, isSignedIn, userId]);

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
              if (userId) checkUserStatus(userId);
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
export default Sentry.wrap(function RootLayout() {
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

          <DeepLinkHandlerWrapper />
          <SentryUserWrapper />

          <AuthFlow />
          <Slot />
        </View>
      </ErrorBoundary>
    </ClerkProvider>
  );
});

function DeepLinkHandlerWrapper() {
  useDeepLinkHandler();
  return null;
}
