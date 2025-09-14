// AppOpenTracker.tsx
import { useEffect } from "react";
import { posthog } from "@/lib/posthog/posthog";
import { useAuth, useClerk } from "@clerk/clerk-expo";
import { Platform } from "react-native";

export function AppOpenTracker() {
  const { isSignedIn, userId } = useAuth();
  const { user } = useClerk();

  useEffect(() => {
    const props: Record<string, any> = {
      platform: Platform.OS,
      timestamp: new Date().toISOString(),
      signedIn: isSignedIn,
    };

    if (isSignedIn && user) {
      props.userId = userId;
      props.email = user.emailAddresses[0]?.emailAddress || null;

      // Identify the user in PostHog
      posthog.identify(userId, {
        email: props.email,
        platform: Platform.OS,
      });
    }

    // Capture App Opened event
    posthog.capture("App Opened", props);
  }, [isSignedIn, userId, user]);

  return null;
}
