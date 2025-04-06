import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { View, Dimensions } from "react-native";
import { cyberpunkTheme } from "@/constants/theme";
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

// FCM Token registration handler
const useFCMTokenRegistration = () => {
  useEffect(() => {
    registerForPushNotifications();
  }, []);

  const registerForPushNotifications = async () => {
    try {
      // Check if we already have a stored token
      const existingToken = await AsyncStorage.getItem('fcmToken');
      if (existingToken) {
        console.log("Retrieved existing FCM token from storage");
        return;
      }

      if (!Device.isDevice) {
        console.log("Push notifications require a physical device");
        return;
      }

      // Request notification permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Failed to get push notification permissions!");
        return;
      }

      // Get Expo push token
      const token = (await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID, // Add your project ID in .env
      })).data;
      
      console.log("FCM TOKEN:", token);
      
      // Save token to AsyncStorage
      await AsyncStorage.setItem('fcmToken', token);
      console.log("FCM token saved to AsyncStorage");
      
    } catch (error) {
      console.error("Error registering for push notifications:", error);
    }
  };
};

export default function AuthRoutesLayout() {
  const { width } = Dimensions.get("window");
  
  // Use the FCM token registration hook
  useFCMTokenRegistration();
  
  return (
    <View className='flex-1'>
      {/* Cyberpunk background with animated gradient */}
      <LinearGradient
        colors={cyberpunkTheme.colors.gradients.background as [string, string]}
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

// Helper function to get the FCM token from AsyncStorage
export const getFCMToken = async () => {
  try {
    const token = await AsyncStorage.getItem('fcmToken');
    return token;
  } catch (error) {
    console.error("Error retrieving FCM token:", error);
    return null;
  }
};