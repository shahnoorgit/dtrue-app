import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  StatusBar,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Linking as RNLinking } from "react-native";
import * as ExpoLinking from "expo-linking";
import {
  SplashScreen,
  Slot,
  useRouter,
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
import { setSentryUser, logError } from "@/utils/sentry/sentry";
import { PostHogProvider } from "posthog-react-native";
import { posthog } from "@/lib/posthog/posthog";
import { AppOpenTracker } from "@/lib/posthog/PosthogWrapper";
import { ErrorProvider } from "@/contexts/ErrorContext";
import SimpleOfflineWrapper from "@/components/ui/SimpleOfflineWrapper";

// Prevent the splash screen from auto-hiding. We will control this manually.
SplashScreen.preventAutoHideAsync();

// Cache configuration
const USER_STATUS_CACHE_KEY = "userStatusCache";
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

interface UserStatusCache {
  status: UserStatus;
  clerkId: string;
  timestamp: number;
  expiresAt: number;
}

enum UserStatus {
  UNKNOWN = "unknown",
  NOT_SIGNED_IN = "not_signed_in",
  SIGNED_IN_NOT_IN_DB = "signed_in_not_in_db",
  SIGNED_IN_IN_DB = "signed_in_in_db",
}

// --- POSTHOG HELPER ---
import {
  trackAppOpened,
  trackDeepLinkOpened,
  trackAppError,
  trackApiError,
  identifyUser,
  resetUser,
} from "@/lib/posthog/events";

function SentryUserWrapper() {
  const { isLoaded, isSignedIn, userId } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn && userId) {
      setSentryUser(userId);
      // User is signed in - identification handled in AppOpenTracker
    } else if (isLoaded && !isSignedIn) {
      setSentryUser("");
      resetUser();
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
    // send to Sentry (already wired) and PostHog
    trackAppError({
      error: error.message,
      component: "ErrorBoundary",
      severity: "high",
    });
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
              onPress={() => {
                this.setState({ hasError: false });
              }}
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

// --- START: CACHE HELPER FUNCTIONS ---
const getCachedUserStatus = async (
  clerkId: string
): Promise<UserStatus | null> => {
  try {
    const cachedData = await AsyncStorage.getItem(USER_STATUS_CACHE_KEY);
    if (!cachedData) return null;

    const cache: UserStatusCache = JSON.parse(cachedData);
    const now = Date.now();

    if (
      cache.clerkId === clerkId &&
      now < cache.expiresAt &&
      cache.status !== UserStatus.UNKNOWN
    ) {
      const remainingTime = Math.round(
        (cache.expiresAt - now) / (1000 * 60 * 60)
      );
      console.log(
        `[CACHE] Using cached user status: ${cache.status} (expires in ${remainingTime}h)`
      );
      return cache.status;
    }
    await clearUserStatusCache();
    return null;
  } catch (error) {
    console.error("[CACHE] Error reading cached user status:", error);
    await clearUserStatusCache();
    return null;
  }
};

const setCachedUserStatus = async (
  status: UserStatus,
  clerkId: string
): Promise<void> => {
  try {
    const now = Date.now();
    const cache: UserStatusCache = {
      status,
      clerkId,
      timestamp: now,
      expiresAt: now + CACHE_DURATION,
    };
    await AsyncStorage.setItem(USER_STATUS_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error("[CACHE] Error caching user status:", error);
  }
};

const clearUserStatusCache = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(USER_STATUS_CACHE_KEY);
  } catch (error) {
    console.error("[CACHE] Error clearing user status cache:", error);
  }
};
// --- END: CACHE HELPER FUNCTIONS ---

// --- START: DEEP LINKING & NAVIGATION HELPERS ---
const parseIncomingUrl = (rawUrl?: string | null) => {
  const APP_HOSTS = ["links-dev.dtrue.online", "links.dtrue.online"];
  if (!rawUrl) return null;

  try {
    if (rawUrl.startsWith("dtrue://")) {
      const urlWithoutScheme = rawUrl.replace("dtrue://", "");
      const [pathPart, searchPart] = urlWithoutScheme.split("?");
      const query: Record<string, string> = {};
      if (searchPart) {
        new URLSearchParams(searchPart).forEach((value, key) => {
          query[key] = value;
        });
      }
      return { path: pathPart || "", query, raw: rawUrl };
    }

    if (rawUrl.startsWith("http")) {
      const urlObj = new URL(rawUrl);
      if (!APP_HOSTS.includes(urlObj.hostname)) return null;
      const path = (urlObj.pathname || "/").slice(1);
      const query: Record<string, string> = {};
      urlObj.searchParams.forEach((value, key) => (query[key] = value));
      return { path, query, raw: rawUrl };
    }

    const parsed = ExpoLinking.parse(rawUrl);
    return {
      path: parsed.path || "",
      query: (parsed.queryParams as Record<string, string>) || {},
      raw: rawUrl,
    };
  } catch (err) {
    console.warn("[DEEP LINK] parseIncomingUrl error", err);
    return null;
  }
};

const handleDeepLinkNavigation = (
  path: string,
  query: Record<string, any>,
  router: any, // Using `any` for ExpoRouter.Router to keep it simple
  userId: string | null | undefined
) => {
  console.log(`[DEEP LINK] Navigating to path:`, path, "with query:", query);

  let destination: "debate" | "profile" | "trending" | undefined;

  if (path.startsWith("debate/")) {
    destination = "debate";
    const parts = path.split("/");
    const debateId = parts[1] || "";
    let debateImage = parts.slice(2).join("/");
    try {
      debateImage = decodeURIComponent(debateImage);
    } catch {}
    if (debateId) {
      router.push({
        pathname: "/(chat-room)/screen",
        params: { clerkId: userId, debateId, debateImage },
      });
    }
  } else if (path.startsWith("profile/")) {
    destination = "profile";
    const profileId = path.split("/")[1] || "";
    if (profileId) {
      router.push({
        pathname: "/(tabs)/[id]/page",
        params: { id: profileId },
      });
    }
  } else if (path === "trending") {
    destination = "trending";
    router.replace("/(tabs)/trending");
  }

  // Track deep link opened
  trackDeepLinkOpened({
    path,
    source: "external",
    destination,
  });

  if (!destination) {
    console.log("[DEEP LINK] Unknown path, ignoring:", path);
  }
};

function useRuntimeDeepLinkHandler() {
  const router = useRouter();
  const { isSignedIn, userId } = useAuth();

  useEffect(() => {
    const linkSub = RNLinking.addEventListener("url", (ev) => {
      if (!isSignedIn) return;
      const parsed = parseIncomingUrl(ev.url);
      if (parsed) {
        handleDeepLinkNavigation(parsed.path, parsed.query, router, userId);
      }
    });

    const notifSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const deeplink = response.notification.request.content.data?.deeplink;
        if (isSignedIn && deeplink) {
          const parsed = parseIncomingUrl(deeplink);
          if (parsed) {
            handleDeepLinkNavigation(parsed.path, parsed.query, router, userId);
          }
        }
      }
    );

    return () => {
      linkSub.remove();
      notifSub.remove();
    };
  }, [isSignedIn, userId, router]);
}
// --- END: DEEP LINKING & NAVIGATION HELPERS ---

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
    const tokenResp = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });
    const currentToken = tokenResp.data;

    if (!currentToken || storedToken === currentToken) return;

    const base = process.env.EXPO_PUBLIC_BASE_URL || "https://your-api.com";
    const url = `${base.replace(/\/$/, "")}/user/${clerkId}/push-token`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: currentToken, platform: Platform.OS }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res
        .text()
        .catch(() => "Failed to read error response");
      trackApiError({
        endpoint: "push-token",
        statusCode: res.status,
        error: errorText,
      });
      throw new Error(
        `Failed to POST push token: ${res.status} - ${errorText}`
      );
    }

    await AsyncStorage.setItem(STORAGE_KEY, currentToken);
    console.log("Registered new push token and saved locally");
  } catch (err: any) {
    // *** CORRECTED: Explicitly typed 'err' ***
    const errorMessage =
      err?.name === "AbortError"
        ? "Push token registration timed out"
        : "registerPushTokenIfNeeded error";
    console.error(errorMessage, err);
    trackApiError({
      endpoint: "push-token",
      error: errorMessage,
    });
    logError(err, { message: errorMessage, clerkId });
  }
}

/**
 * The central component for managing the app's initial state and navigation,
 * resolving all race conditions.
 */
function InitialStateNavigator() {
  const { isSignedIn, isLoaded, userId } = useAuth();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const hasNavigatedRef = useRef(false);

  const [appState, setAppState] = useState<{
    userStatus: UserStatus;
    isUserStatusChecked: boolean;
    initialUrl: string | null;
    isInitialUrlChecked: boolean;
    apiError: { message: string; isRetrying: boolean } | null;
    retryCount: number;
  }>({
    userStatus: UserStatus.UNKNOWN,
    isUserStatusChecked: false,
    initialUrl: null,
    isInitialUrlChecked: false,
    apiError: null,
    retryCount: 0,
  });

  const checkUserStatusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkUserStatus = useCallback(
    async (clerkId: string, forceRefresh = false) => {
      if (checkUserStatusTimeoutRef.current) {
        clearTimeout(checkUserStatusTimeoutRef.current);
      }

      if (!isSignedIn) {
        setAppState((s) => ({
          ...s,
          userStatus: UserStatus.NOT_SIGNED_IN,
          isUserStatusChecked: true,
        }));
        return;
      }

      if (!forceRefresh) {
        const cachedStatus = await getCachedUserStatus(clerkId);
        if (cachedStatus) {
          setAppState((s) => ({
            ...s,
            userStatus: cachedStatus,
            isUserStatusChecked: true,
          }));
          if (cachedStatus === UserStatus.SIGNED_IN_IN_DB) {
            registerPushTokenIfNeeded(clerkId).catch(console.error);
          }
          return;
        }
      }

      console.log("[API] Checking user status from server...");
      try {
        const controller = new AbortController();
        checkUserStatusTimeoutRef.current = setTimeout(
          () => controller.abort(),
          10000
        );

        const base = process.env.EXPO_PUBLIC_BASE_URL || "https://your-api.com";
        const res = await fetch(
          `${base.replace(/\/$/, "")}/user/find/${clerkId}`,
          {
            signal: controller.signal,
          }
        );
        clearTimeout(checkUserStatusTimeoutRef.current);

        let finalStatus: UserStatus;
        console.log(
          "[API] checkUserStatus response:",
          res.status,
          res.statusText
        );
        if (res.status === 404) {
          finalStatus = UserStatus.SIGNED_IN_NOT_IN_DB;
        } else if (res.ok) {
          finalStatus = UserStatus.SIGNED_IN_IN_DB;
          await registerPushTokenIfNeeded(clerkId);
        } else {
          throw new Error(`API Error: ${res.status}`);
        }

        await setCachedUserStatus(finalStatus, clerkId);
        setAppState((s) => ({
          ...s,
          userStatus: finalStatus,
          isUserStatusChecked: true,
          apiError: null,
          retryCount: 0,
        }));
      } catch (err: any) {
        // *** CORRECTED: Explicitly typed 'err' ***
        console.error("[API] checkUserStatus error", err);
        trackApiError({
          endpoint: "user-status",
          error: err?.message,
        });
        logError(err, { clerkId });
        setAppState((s) => ({ ...s, retryCount: s.retryCount + 1 }));
      }
    },
    [isSignedIn]
  );

  useEffect(() => {
    const { retryCount } = appState;
    if (retryCount === 0 || !userId) return;

    const MAX_RETRIES = 3;
    if (retryCount > MAX_RETRIES) {
      setAppState((s) => ({
        ...s,
        apiError: {
          message: "Unable to connect after multiple attempts.",
          isRetrying: false,
        },
        isUserStatusChecked: true,
      }));
      trackApiError({
        endpoint: "user-status",
        error: "retry_failed",
        retryCount,
      });
      return;
    }

    setAppState((s) => ({
      ...s,
      apiError: {
        message: `Retrying connection... (${retryCount})`,
        isRetrying: true,
      },
    }));
    const delay = 1000 * Math.pow(2, retryCount - 1);
    const timer = setTimeout(() => checkUserStatus(userId, true), delay);
    return () => clearTimeout(timer);
  }, [appState.retryCount, userId]);

  useEffect(() => {
    if (!isLoaded) return;
    setAppState((s) => ({
      ...s,
      isUserStatusChecked: false,
      apiError: null,
      retryCount: 0,
    }));
    if (userId) {
      checkUserStatus(userId);
    } else {
      setAppState((s) => ({
        ...s,
        userStatus: UserStatus.NOT_SIGNED_IN,
        isUserStatusChecked: true,
      }));
    }
  }, [isLoaded, isSignedIn, userId]); // Removed checkUserStatus to avoid re-triggering

  useEffect(() => {
    const getInitialUrl = async () => {
      try {
        const url = await RNLinking.getInitialURL();
        const response = await Notifications.getLastNotificationResponseAsync();
        const notificationDeeplink = response?.notification.request.content.data
          ?.deeplink as string;

        const launchSource = notificationDeeplink
          ? "notification"
          : url
          ? "link"
          : "cold_start";

        trackAppOpened({
          launchSource: launchSource as
            | "cold_start"
            | "notification"
            | "deep_link",
          isSignedIn: false, // Will be updated when auth state is known
        });

        setAppState((s) => ({
          ...s,
          initialUrl: notificationDeeplink || url,
          isInitialUrlChecked: true,
        }));
      } catch (e: any) {
        // *** CORRECTED: Explicitly typed 'e' ***
        console.error("[DEEP LINK] Failed to get initial URL", e);
        trackAppError({
          error: e?.message || "Failed to get initial URL",
          component: "InitialStateNavigator",
        });
        setAppState((s) => ({ ...s, isInitialUrlChecked: true }));
      }
    };
    getInitialUrl();
  }, []);

  useEffect(() => {
    const {
      isUserStatusChecked,
      isInitialUrlChecked,
      userStatus,
      initialUrl,
      apiError,
    } = appState;

    if (
      !isLoaded ||
      !navigationState?.key ||
      !isUserStatusChecked ||
      !isInitialUrlChecked ||
      hasNavigatedRef.current
    ) {
      return;
    }

    if (apiError && apiError.isRetrying) return;

    if (apiError && !apiError.isRetrying) {
      SplashScreen.hideAsync().catch(console.error);
      return;
    }

    hasNavigatedRef.current = true;
    const parsedUrl = parseIncomingUrl(initialUrl);

    if (parsedUrl && isSignedIn) {
      handleDeepLinkNavigation(parsedUrl.path, parsedUrl.query, router, userId);
    } else if (userStatus === UserStatus.SIGNED_IN_IN_DB) {
      router.replace("/(tabs)");
    } else if (userStatus === UserStatus.SIGNED_IN_NOT_IN_DB) {
      router.replace("/(auth)/(boarding)/boarding");
    } else {
      router.replace("/onboarding");
    }

    SplashScreen.hideAsync().catch(console.error);
  }, [appState, isLoaded, navigationState?.key, isSignedIn, userId, router]);

  if (appState.apiError && !appState.apiError.isRetrying) {
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
            {appState.apiError.message}
          </Text>
          <TouchableOpacity
            className='bg-blue-500 p-3 rounded-md mb-4'
            onPress={() => {
              if (userId) {
                setAppState((s) => ({
                  ...s,
                  retryCount: 1,
                  apiError: null,
                  isUserStatusChecked: false,
                }));
              }
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

  return null; // Render nothing while loading; the native splash screen is visible.
}

export default Sentry.wrap(function RootLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY");
  }

  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <ErrorBoundary>
        <ErrorProvider>
          <View className='flex-1 bg-gray-900'>
            <StatusBar
              barStyle='light-content'
              backgroundColor={cyberpunkTheme.colors.background.dark}
            />
            <PostHogProvider autocapture={false} client={posthog}>
              <LinearGradient
                colors={
                  cyberpunkTheme.colors.gradients.background as [string, string]
                }
                className='absolute inset-0'
              />

              <SentryUserWrapper />
              <AppOpenTracker />
              <InitialStateNavigator />
              <RuntimeDeepLinkHandlerWrapper />

              {/* Simple offline wrapper shows popup when offline */}
              <SimpleOfflineWrapper>
                {/* Slot renders the current page determined by the navigator */}
                <Slot />
              </SimpleOfflineWrapper>
            </PostHogProvider>
          </View>
        </ErrorProvider>
      </ErrorBoundary>
    </ClerkProvider>
  );
});

function RuntimeDeepLinkHandlerWrapper() {
  useRuntimeDeepLinkHandler();
  return null;
}

const invalidateUserCache = async (): Promise<void> => {
  try {
    await Promise.all([
      clearUserStatusCache(),
      AsyncStorage.removeItem("expoPushToken"),
    ]);
    console.log("[CACHE] Invalidated all user caches on sign out");
  } catch (error) {
    console.error("[CACHE] Error invalidating user caches:", error);
    logError(error, { context: "invalidateUserCache" });
  }
};

export { invalidateUserCache };
