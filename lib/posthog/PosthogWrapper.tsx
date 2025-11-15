// AppOpenTracker.tsx
import { useEffect } from "react";
import { useAuth, useClerk } from "@clerk/clerk-expo";
import { Platform } from "react-native";
import { trackAppOpened, identifyUser } from "./events";

export function AppOpenTracker() {
  const { isSignedIn, userId } = useAuth();
  const { user } = useClerk();

  useEffect(() => {
    // Track app opened event
    trackAppOpened({
      launchSource: 'cold_start',
      isSignedIn,
      platform: Platform.OS,
    });

    // Identify user if signed in
    if (isSignedIn && user && userId) {
      identifyUser(userId, {
        email: user.emailAddresses[0]?.emailAddress,
        platform: Platform.OS,
      });
    }
  }, [isSignedIn, userId, user]);

  return null;
}
