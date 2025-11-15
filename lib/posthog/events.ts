/**
 * Streamlined PostHog Event Tracking
 *
 * This file defines all PostHog events used in the app.
 * Events are designed to be high-level, action-oriented, and focused on key user behaviors.
 * Total events: 20 (fits well within PostHog free tier)
 */

import { posthog } from "./posthog";

// Event types for type safety
export type EventProperties = Record<string, any>;

// Specific event property types
export interface UserAuthProperties {
  email?: string;
  method?: string;
}

export interface OnboardingProperties {
  hasProfileImage?: boolean;
  username?: string;
  timeToComplete?: number;
  step?: number;
  reason?: string;
}

export interface DebateProperties {
  debateId: string;
  title?: string;
  duration?: number;
  hasImage?: boolean;
  statementLength?: number;
  descriptionLength?: number;
  source?: "feed" | "explore" | "trending" | "profile" | "share" | "direct";
  debateTitle?: string;
  reason?: "timeout" | "completed" | "cancelled";
  participantCount?: number;
  opinionCount?: number;
  timeSpent?: number;
  hadSubmittedOpinion?: boolean;
}

export interface OpinionProperties {
  debateId: string;
  stance: "for" | "against";
  opinionLength?: number;
  hasEvidence?: boolean;
  likedUserId: string;
  opinionAuthorId: string;
}

export interface SocialProperties {
  type: "debate" | "profile";
  contentId: string;
  method?: "native" | "link";
  platform?: string;
  profileId: string;
  source?:
    | "explore"
    | "debate"
    | "followers"
    | "following"
    | "share"
    | "own_profile";
  isOwnProfile?: boolean;
  followedUserId: string;
}

export interface AppProperties {
  launchSource?: "cold_start" | "notification" | "deep_link";
  isSignedIn?: boolean;
  platform?: string;
  query: string;
  type?: "debates" | "profiles";
  resultsCount?: number;
  path: string;
  source?: "notification" | "share" | "external";
  destination?: "debate" | "profile" | "trending";
}

export interface ErrorProperties {
  error: string;
  component?: string;
  severity?: "low" | "medium" | "high";
  endpoint?: string;
  statusCode?: number;
  retryCount?: number;
  sessionDuration?: number;
  reason?: "manual" | "expired" | "error";
}

// Helper function to safely capture events with error handling
const captureEvent = (eventName: string, properties: EventProperties = {}) => {
  try {
    // Remove or redact sensitive data
    const sanitizedProperties = { ...properties };

    // Redact PII
    if (sanitizedProperties.email) {
      sanitizedProperties.email = "[REDACTED]";
    }
    if (sanitizedProperties.userId) {
      sanitizedProperties.userId = String(sanitizedProperties.userId).slice(
        0,
        8
      );
    }
    if (sanitizedProperties.debateId) {
      sanitizedProperties.debateId = String(sanitizedProperties.debateId).slice(
        0,
        8
      );
    }

    posthog.capture(eventName, sanitizedProperties);
  } catch (error) {
    console.warn("PostHog capture failed:", error);
  }
};

// ============================================================================
// 1. USER ACQUISITION & ONBOARDING (4 events)
// ============================================================================

export const trackUserSignedUp = (properties: UserAuthProperties = {}) => {
  captureEvent("user_signed_up", {
    timestamp: new Date().toISOString(),
    ...properties,
  });
};

export const trackUserSignedIn = (properties: UserAuthProperties = {}) => {
  captureEvent("user_signed_in", {
    timestamp: new Date().toISOString(),
    ...properties,
  });
};

export const trackOnboardingCompleted = (
  properties: OnboardingProperties = {}
) => {
  captureEvent("onboarding_completed", {
    timestamp: new Date().toISOString(),
    ...properties,
  });
};

export const trackOnboardingAbandoned = (
  properties: OnboardingProperties = {}
) => {
  captureEvent("onboarding_abandoned", {
    timestamp: new Date().toISOString(),
    ...properties,
  });
};

// ============================================================================
// 2. DEBATE CREATION & MANAGEMENT (4 events)
// ============================================================================

export const trackDebateCreated = (properties: DebateProperties) => {
  captureEvent("debate_created", {
    timestamp: new Date().toISOString(),
    ...properties,
  });
};

export const trackDebateCreationFailed = (properties: ErrorProperties) => {
  captureEvent("debate_creation_failed", {
    timestamp: new Date().toISOString(),
    ...properties,
  });
};

export const trackDebateJoined = (properties: DebateProperties) => {
  captureEvent("debate_joined", {
    timestamp: new Date().toISOString(),
    ...properties,
  });
};

export const trackDebateEnded = (properties: DebateProperties) => {
  captureEvent("debate_ended", {
    timestamp: new Date().toISOString(),
    ...properties,
  });
};

// ============================================================================
// 3. DEBATE PARTICIPATION (3 events)
// ============================================================================

export const trackOpinionSubmitted = (properties: OpinionProperties) => {
  captureEvent("opinion_submitted", {
    timestamp: new Date().toISOString(),
    ...properties,
  });
};

export const trackOpinionLiked = (properties: OpinionProperties) => {
  captureEvent("opinion_liked", {
    timestamp: new Date().toISOString(),
    ...properties,
  });
};

export const trackDebateAbandoned = (properties: DebateProperties) => {
  captureEvent("debate_abandoned", {
    timestamp: new Date().toISOString(),
    ...properties,
  });
};

// ============================================================================
// 4. SOCIAL & VIRAL ACTIONS (3 events)
// ============================================================================

export const trackContentShared = (
  properties: Pick<
    SocialProperties,
    "type" | "contentId" | "method" | "platform"
  >
) => {
  captureEvent("content_shared", {
    timestamp: new Date().toISOString(),
    ...properties,
  });
};

export const trackProfileViewed = (
  properties: Pick<SocialProperties, "profileId" | "source" | "isOwnProfile">
) => {
  captureEvent("profile_viewed", {
    timestamp: new Date().toISOString(),
    ...properties,
  });
};

export const trackUserFollowed = (
  properties: Pick<SocialProperties, "followedUserId" | "source">
) => {
  captureEvent("user_followed", {
    timestamp: new Date().toISOString(),
    ...properties,
  });
};

// ============================================================================
// 5. APP USAGE & RETENTION (3 events)
// ============================================================================

export const trackAppOpened = (
  properties: Pick<
    AppProperties,
    "launchSource" | "isSignedIn" | "platform"
  > = {}
) => {
  captureEvent("app_opened", {
    timestamp: new Date().toISOString(),
    ...properties,
  });
};

export const trackSearchPerformed = (
  properties: Pick<AppProperties, "query" | "type" | "resultsCount">
) => {
  captureEvent("search_performed", {
    timestamp: new Date().toISOString(),
    ...properties,
  });
};

export const trackDeepLinkOpened = (
  properties: Pick<AppProperties, "path" | "source" | "destination">
) => {
  captureEvent("deep_link_opened", {
    timestamp: new Date().toISOString(),
    ...properties,
  });
};

// ============================================================================
// 6. ERROR & SYSTEM (3 events)
// ============================================================================

export const trackAppError = (
  properties: Pick<ErrorProperties, "error" | "component" | "severity">
) => {
  captureEvent("app_error", {
    timestamp: new Date().toISOString(),
    ...properties,
  });
};

export const trackApiError = (
  properties: Partial<
    Pick<ErrorProperties, "endpoint" | "statusCode" | "error" | "retryCount">
  > = {}
) => {
  captureEvent("api_error", {
    timestamp: new Date().toISOString(),
    ...properties,
  });
};

export const trackUserLoggedOut = (
  properties: Pick<ErrorProperties, "sessionDuration" | "reason"> = {}
) => {
  captureEvent("user_logged_out", {
    timestamp: new Date().toISOString(),
    ...properties,
  });
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Identify user in PostHog with safe properties
 */
export const identifyUser = (
  userId: string,
  properties: {
    email?: string;
    username?: string;
    platform?: string;
  } = {}
) => {
  posthog.identify(userId, properties);
};

/**
 * Reset user identification (call on logout)
 */
export const resetUser = () => {
  try {
    posthog.reset();
  } catch (error) {
    console.warn("PostHog reset failed:", error);
  }
};

// ============================================================================
// 7. UPDATES & VERSIONING (custom events)
// ============================================================================

export const trackUpdateCheck = (properties: {
  packageName?: string | null;
  currentVersion?: string | null;
  latestVersion?: string | null;
  currentBuild?: number | null;
  minSupportedBuild?: number | null;
  required?: boolean;
  reason?: "store_version" | "min_build" | "none";
  retryCount?: number;
  error?: string;
} = {}) => {
  captureEvent("update_check", {
    timestamp: new Date().toISOString(),
    platform: properties?.packageName?.includes("com.") ? "android" : undefined,
    ...properties,
  });
};

export const trackForceUpdateRequired = (properties: {
  packageName?: string | null;
  currentVersion?: string | null;
  latestVersion?: string | null;
  currentBuild?: number | null;
  minSupportedBuild?: number | null;
  reason: "store_version" | "min_build";
}) => {
  captureEvent("force_update_required", {
    timestamp: new Date().toISOString(),
    ...properties,
  });
};