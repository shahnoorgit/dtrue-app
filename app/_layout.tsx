import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
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
import { ClerkProvider, useAuth, useClerk, useUser } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { cyberpunkTheme } from "@/constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import "./globals.css";
import * as Sentry from "@sentry/react-native";
import { setSentryUser, logError, clearSentryUser, testSentryIntegration } from "@/utils/sentry/sentry";
import { PostHogProvider } from "posthog-react-native";
import { posthog } from "@/lib/posthog/posthog";
import { AppOpenTracker } from "@/lib/posthog/PosthogWrapper";
import { ErrorProvider } from "@/contexts/ErrorContext";
import SimpleOfflineWrapper from "@/components/ui/SimpleOfflineWrapper";
import ForceUpdateGate from "@/components/ui/ForceUpdateGate";
import { useForceUpdate } from "@/hook/useForceUpdate";
import { useSimpleUpdates } from "@/hook/useSimpleUpdates";

// Prevent the splash screen from auto-hiding. We will control this manually.
SplashScreen.preventAutoHideAsync();


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
      clearSentryUser();
      resetUser();
    }
  }, [isLoaded, isSignedIn, userId]);

  // Test Sentry integration on app start (development only)
  useEffect(() => {
    if (__DEV__) {
      // Delay the test to ensure Sentry is fully initialized
      const timer = setTimeout(() => {
        testSentryIntegration();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, []);

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
    
    // Send to Sentry with enhanced context
    logError(error, {
      context: "ErrorBoundary",
      componentStack: info.componentStack,
      errorBoundary: true,
      tags: {
        errorType: 'unhandled',
        component: 'ErrorBoundary',
      }
    });
    
    // Send to PostHog
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
              backgroundColor={cyberpunkTheme.colors.background.primary}
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
  if (__DEV__) {
    console.log(`[DEEP LINK] Navigating to path:`, path, "with query:", query);
  }

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

  if (__DEV__ && !destination) {
    console.log("[DEEP LINK] Unknown path, ignoring:", path);
  }
};

function useRuntimeDeepLinkHandler() {
  const router = useRouter();
  const { isSignedIn, userId } = useAuth();

  // Memoize handlers to prevent unnecessary re-subscriptions
  const handleUrlEvent = useCallback((ev: { url: string }) => {
    if (!isSignedIn) return;
    const parsed = parseIncomingUrl(ev.url);
    if (parsed) {
      handleDeepLinkNavigation(parsed.path, parsed.query, router, userId);
    }
  }, [isSignedIn, userId, router]);

  const handleNotificationResponse = useCallback((response: any) => {
    const deeplink = response.notification.request.content.data?.deeplink;
    if (isSignedIn && deeplink) {
      const parsed = parseIncomingUrl(deeplink);
      if (parsed) {
        handleDeepLinkNavigation(parsed.path, parsed.query, router, userId);
      }
    }
  }, [isSignedIn, userId, router]);

  useEffect(() => {
    const linkSub = RNLinking.addEventListener("url", handleUrlEvent);
    const notifSub = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    return () => {
      linkSub.remove();
      notifSub.remove();
    };
  }, [handleUrlEvent, handleNotificationResponse]);
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
 * SIMPLIFIED: The central component for managing app navigation using Clerk metadata.
 * No more cache, no more complex API checks for routing!
 */
function InitialStateNavigator() {
  const { isSignedIn, isLoaded, user } = useUser(); // Use useUser() for metadata access
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const hasNavigatedRef = useRef(false);

  const [appState, setAppState] = useState<{
    initialUrl: string | null;
    isInitialUrlChecked: boolean;
  }>({
    initialUrl: null,
    isInitialUrlChecked: false,
  });

  // Register push token for onboarded users (only once when they become onboarded)
  const pushTokenRegisteredRef = useRef(false);
  useEffect(() => {
    if (
      isLoaded &&
      isSignedIn &&
      user?.unsafeMetadata?.onboarded === true &&
      !pushTokenRegisteredRef.current
    ) {
      pushTokenRegisteredRef.current = true;
      registerPushTokenIfNeeded(user.id).catch(console.error);
    }
    
    // Reset flag when user signs out
    if (!isSignedIn) {
      pushTokenRegisteredRef.current = false;
    }
  }, [isLoaded, isSignedIn, user?.unsafeMetadata?.onboarded, user?.id]);

  // Get initial URL only once on mount
  useEffect(() => {
    let mounted = true;
    
    const getInitialUrl = async () => {
      try {
        const [url, response] = await Promise.all([
          RNLinking.getInitialURL(),
          Notifications.getLastNotificationResponseAsync(),
        ]);
        
        if (!mounted) return;
        
        const notificationDeeplink = response?.notification.request.content.data
          ?.deeplink as string;

        const launchSource = notificationDeeplink
          ? "notification"
          : url
          ? "deep_link"
          : "cold_start";

        trackAppOpened({
          launchSource,
          isSignedIn: false, // Will be updated when auth state is known
        });

        setAppState((s) => ({
          ...s,
          initialUrl: notificationDeeplink || url,
          isInitialUrlChecked: true,
        }));
      } catch (e: any) {
        if (!mounted) return;
        console.error("[DEEP LINK] Failed to get initial URL", e);
        trackAppError({
          error: e?.message || "Failed to get initial URL",
          component: "InitialStateNavigator",
        });
        setAppState((s) => ({ ...s, isInitialUrlChecked: true }));
      }
    };
    
    getInitialUrl();
    
    return () => {
      mounted = false;
    };
  }, []);

  // SIMPLIFIED NAVIGATION LOGIC - No more API calls!
  // Memoize routing decision to prevent unnecessary re-calculations
  const onboarded = user?.unsafeMetadata?.onboarded;
  const userId = user?.id;
  
  useEffect(() => {
    const { isInitialUrlChecked, initialUrl } = appState;

    if (
      !isLoaded ||
      !navigationState?.key ||
      !isInitialUrlChecked ||
      hasNavigatedRef.current
    ) {
      return;
    }

    hasNavigatedRef.current = true;
    const parsedUrl = parseIncomingUrl(initialUrl);

    if (__DEV__) {
      console.log("[NAVIGATOR] Routing based on metadata...");
      console.log("[NAVIGATOR] isSignedIn:", isSignedIn, "onboarded:", onboarded);
    }

    // Navigate immediately without setTimeout for better perceived performance
    if (parsedUrl && isSignedIn) {
      // Deep link navigation
      handleDeepLinkNavigation(parsedUrl.path, parsedUrl.query, router, userId);
    } else if (!isSignedIn) {
      router.replace("/(auth)/sign-in");
    } else if (onboarded !== true) {
      router.replace("/(auth)/(boarding)/boarding");
    } else {
      router.replace("/(tabs)");
    }

    // Hide splash screen after navigation starts
    SplashScreen.hideAsync().catch(console.error);
  }, [
    appState.isInitialUrlChecked,
    appState.initialUrl,
    isLoaded,
    navigationState?.key,
    isSignedIn,
    onboarded,
    userId,
    router,
  ]);

  return null; // Render nothing while loading; the native splash screen is visible.
}

export default Sentry.wrap(function RootLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY");
  }

  // Initialize automatic updates (silent, no UI needed)
  useSimpleUpdates();

  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <ErrorBoundary>
        <ErrorProvider>
          <View className='flex-1 bg-gray-900'>
            <StatusBar
              barStyle='light-content'
              backgroundColor={cyberpunkTheme.colors.background.primary}
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
              {/* Force update check at launch - blocks navigation when required */}
              <ForceUpdateWrapper />
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

function ForceUpdateWrapper() {
  const state = useForceUpdate("com.shahnoor.dtrue");
  return (
    <ForceUpdateGate
      visible={!state.checking && state.required}
      latestVersion={state.latestVersion}
      currentVersion={state.currentVersion}
      storeUrl={state.playStoreUrl}
    />
  );
}

// Export function for manual cache cleanup if needed (e.g., on sign out)
export const clearUserDataOnSignOut = async (): Promise<void> => {
  try {
    // Clear push token cache
    await AsyncStorage.removeItem("expoPushToken");
    console.log("[CLEANUP] Cleared user data on sign out");
  } catch (error) {
    console.error("[CLEANUP] Error clearing user data on sign out:", error);
  }
};
