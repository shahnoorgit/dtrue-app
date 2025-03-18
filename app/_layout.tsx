import React, { useEffect, useState } from "react";
import { StatusBar, View, Text, Button } from "react-native";
import { Stack } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import "./globals.css";

// Cyberpunk theme configuration - can be used throughout the app
export const cyberpunkTheme = {
  colors: {
    primary: "#00FF94",
    primaryDark: "#02C39A",
    background: {
      dark: "#080F12",
      darker: "#03120F",
    },
    text: {
      light: "#E0F0EA",
      muted: "#8F9BB3",
      accent: "#00FF94",
    },
    gradients: {
      primary: ["#00FF94", "#02C39A"],
      background: ["rgba(8, 15, 18, 0.97)", "rgba(3, 18, 17, 0.98)"],
    },
  },
  shadows: {
    glow: {
      shadowColor: "#00FF94",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 8,
    },
  },
};

export default function RootLayout() {
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);
  const [forceOnboarding, setForceOnboarding] = useState(false);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const value = await AsyncStorage.getItem("hasOnboarded");
        if (value === null) {
          setIsFirstLaunch(true);
        } else {
          setIsFirstLaunch(false);
        }
      } catch (error) {
        console.log("Error checking onboarding status:", error);
        setIsFirstLaunch(false);
      }
    };

    checkOnboardingStatus();
  }, []);


  if (isFirstLaunch === null) {
    return null;
  }

  return (
    <View className='flex-1 bg-gray-900'>
      <StatusBar
        barStyle='light-content'
        backgroundColor={cyberpunkTheme.colors.background.dark}
      />

      {/* Background gradient */}
      <LinearGradient
        colors={cyberpunkTheme.colors.gradients.background}
        className='absolute inset-0'
      />


      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: cyberpunkTheme.colors.background.dark,
          },
          headerTintColor: cyberpunkTheme.colors.text.accent,
          headerTitleStyle: {
            fontWeight: "bold",
          },
          headerShadowVisible: false,
          headerBackTitleVisible: false,
          animation: "slide_from_right",
          contentStyle: {
            backgroundColor: "transparent",
          },
        }}
      >
        {forceOnboarding || isFirstLaunch ? (
          <Stack.Screen
            name='onboarding'
            options={{
              headerShown: false,
              gestureEnabled: false,
            }}
          />
        ) : (
          <Stack.Screen
            name='(tabs)'
            options={{
              headerShown: false,
            }}
          />
        )}
      </Stack>
    </View>
  );
}