import React from "react";
import { Stack } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { View, Dimensions } from "react-native";
import { cyberpunkTheme } from "@/constants/theme";

export default function AuthRoutesLayout() {
  const { width } = Dimensions.get("window");

  return (
    <View className='flex-1'>
      {/* Optimized cyberpunk background */}
      <LinearGradient
        colors={cyberpunkTheme.colors.gradients.background as [string, string]}
        className='absolute inset-0'
      />

      {/* Subtle decorative elements - reduced for better performance */}
      <View className='absolute inset-0 opacity-10'>
        {Array.from({ length: 12 }).map((_, i) => (
          <View
            key={`h-line-${i}`}
            className='absolute h-px bg-green-400/20'
            style={{ width: width, top: i * 60, left: 0 }}
          />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <View
            key={`v-line-${i}`}
            className='absolute w-px bg-green-400/20'
            style={{ height: "100%", left: i * 60, top: 0 }}
          />
        ))}
      </View>

      {/* Subtle accent elements */}
      <View className='absolute top-20 right-8 w-24 h-24 rounded-full bg-primary/3 blur-2xl' />
      <View className='absolute bottom-32 left-6 w-20 h-20 rounded-full bg-primary/3 blur-2xl' />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: "transparent",
          },
          animation: "slide_from_right",
          animationDuration: 300,
        }}
      />
    </View>
  );
}
