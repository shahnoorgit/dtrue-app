import PostHog from "posthog-react-native";
import Constants from "expo-constants";

const posthogApiKey = Constants.expoConfig?.extra?.posthogApiKey;

if (!posthogApiKey) {
  throw new Error("PostHog API key is missing in app config!");
}

export const posthog = new PostHog(posthogApiKey, {
  host: "https://us.i.posthog.com",
  flushAt: 10,
  flushInterval: 5000,
});
