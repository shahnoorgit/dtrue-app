import { Redirect, Stack } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import { View, Dimensions } from "react-native";
import { cyberpunkTheme } from "@/constants/theme";

export default function AuthRoutesLayout() {
  const { isSignedIn } = useAuth();
  const { width } = Dimensions.get("window");

  if (isSignedIn) {
    return <Redirect href='/(tabs)' />;
  }

  return (
    <View className='flex-1'>
      {/* Cyberpunk background with animated gradient */}
      <LinearGradient
        colors={cyberpunkTheme.colors.gradients.background}
        className='absolute inset-0'
      />

      {/* Decorative grid lines */}
      <View className='absolute inset-0 opacity-20'>
        {Array.from({ length: 20 }).map((_, i) => (
          <View
            key={`h-line-${i}`}
            className='absolute h-px bg-green-400/30'
            style={{ width: width, top: i * 40, left: 0 }}
          />
        ))}
        {Array.from({ length: 15 }).map((_, i) => (
          <View
            key={`v-line-${i}`}
            className='absolute w-px bg-green-400/30'
            style={{ height: "100%", left: i * 40, top: 0 }}
          />
        ))}
      </View>

      {/* Decorative cyberpunk elements */}
      <View className='absolute top-10 right-10 w-40 h-40 rounded-full bg-primary/5 blur-xl' />
      <View className='absolute bottom-20 left-5 w-32 h-32 rounded-full bg-primary/5 blur-xl' />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: "transparent",
          },
          headerLeft: () => (
            <View className='ml-2 p-2 rounded-full bg-gray-800/50 border border-green-400/20' />
          ),
        }}
      />
    </View>
  );
}
