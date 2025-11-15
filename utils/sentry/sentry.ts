// src/utils/sentry.ts
import * as Sentry from "@sentry/react-native";
import { version } from "../../package.json"; // adjust path
import Constants from "expo-constants";

// Determine environment
const getEnvironment = () => {
  if (__DEV__) return "development";
  if (Constants.expoConfig?.extra?.eas?.projectId) return "production";
  return "preview";
};

Sentry.init({
  dsn: "https://fe2717b02cd57befbb4dc7320f907217@o4509945466978305.ingest.us.sentry.io/4509945471041536",
  release: `dtrue@${version}`,
  environment: getEnvironment(),
  tracesSampleRate: __DEV__ ? 1.0 : 0.2, // Higher sampling in dev for debugging
  enableAutoSessionTracking: true,
  sessionTrackingIntervalMillis: 10000,
  replaysSessionSampleRate: __DEV__ ? 1.0 : 0.1,
  replaysOnErrorSampleRate: 1.0,
  enableNative: true,
  enableNativeCrashHandling: true,
  enableNativeFramesTracking: true,
  beforeSend(event) {
    // Filter out warnings in production
    if (!__DEV__ && event.level === "warning") return null;
    
    // Add additional context
    event.tags = {
      ...event.tags,
      platform: Constants.platform?.ios ? 'ios' : 'android',
      appVersion: version,
    };
    
    return event;
  },
  beforeBreadcrumb(breadcrumb) {
    // Filter out noisy breadcrumbs
    if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
      return null;
    }
    return breadcrumb;
  },
});

// Set logged-in user for better debugging
export const setSentryUser = (clerkId: string) => {
  Sentry.setUser({ 
    id: clerkId,
    username: `user_${clerkId.slice(0, 8)}` // Add a readable username
  });
  
  // Set additional user context
  Sentry.setContext("user", {
    clerkId,
    loginTime: new Date().toISOString(),
  });
};

// Clear user data on logout
export const clearSentryUser = () => {
  Sentry.setUser(null);
  Sentry.setContext("user", null);
};

// Capture handled errors with enhanced context
export const logError = (error: unknown, context?: Record<string, any>) => {
  const enhancedContext = {
    timestamp: new Date().toISOString(),
    ...context,
  };
  
  Sentry.captureException(error, { 
    extra: enhancedContext,
    tags: {
      errorType: 'handled',
      ...context?.tags,
    }
  });
};

// Capture custom messages
export const logMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) => {
  const enhancedContext = {
    timestamp: new Date().toISOString(),
    ...context,
  };
  
  Sentry.captureMessage(message, { 
    level,
    extra: enhancedContext,
    tags: {
      messageType: 'custom',
      ...context?.tags,
    }
  });
};

// Performance monitoring helpers
export const startTransaction = (name: string, op: string = 'navigation') => {
  return Sentry.startSpan({ name, op }, () => {});
};

export const addBreadcrumb = (message: string, category: string = 'user', level: 'info' | 'warning' | 'error' = 'info', data?: Record<string, any>) => {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
};

// API error tracking with context
export const logApiError = (endpoint: string, error: unknown, context?: Record<string, any>) => {
  logError(error, {
    ...context,
    tags: {
      errorType: 'api',
      endpoint,
      ...context?.tags,
    },
    extra: {
      endpoint,
      ...context?.extra,
    }
  });
};

// Navigation tracking
export const logNavigation = (from: string, to: string) => {
  addBreadcrumb(`Navigated from ${from} to ${to}`, 'navigation');
};

// User action tracking
export const logUserAction = (action: string, context?: Record<string, any>) => {
  addBreadcrumb(`User action: ${action}`, 'user', 'info', context);
};

// Test function to verify Sentry is working (for development)
export const testSentryIntegration = () => {
  if (__DEV__) {
    console.log("Testing Sentry integration...");
    
    // Test custom message
    logMessage("Sentry integration test", "info", {
      testType: "integration",
      timestamp: new Date().toISOString(),
    });
    
    // Test breadcrumb
    addBreadcrumb("Sentry test breadcrumb", "test");
    
    // Test error (non-throwing)
    try {
      throw new Error("Test error for Sentry integration");
    } catch (error) {
      logError(error, {
        testType: "integration",
        context: "testSentryIntegration",
      });
    }
    
    console.log("Sentry test completed - check your Sentry dashboard");
  }
};
