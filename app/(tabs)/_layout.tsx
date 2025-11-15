import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  useWindowDimensions,
  Platform,
} from "react-native";
import { Tabs } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import TabContentWrapper from "./components/TabContentWrapper";

const TAB_CONFIG = [
  { name: "index", label: "Feed", icon: "newspaper-variant-outline" },
  { name: "trending", label: "Trending", icon: "fire" },
  { name: "explore", label: "Explore", icon: "compass-outline" },
  { name: "rooms", label: "Rooms", icon: "door-sliding" },
  { name: "profile", label: "Profile", icon: "card-account-details-outline" },
];

interface TabButtonProps {
  icon: string;
  label: string;
  isFocused: boolean;
  onPress: () => void;
  index: number;
}

function TabButton({ icon, label, isFocused, onPress, index }: TabButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const iconScaleAnim = useRef(new Animated.Value(1)).current;
  const textOpacityAnim = useRef(new Animated.Value(isFocused ? 1 : 0.7)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(iconScaleAnim, {
        toValue: isFocused ? 1.05 : 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(textOpacityAnim, {
        toValue: isFocused ? 1 : 0.7,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isFocused]);

  const handlePress = () => {
    // Button press animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onPress();
  };

  return (
    <Animated.View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        transform: [{ scale: scaleAnim }],
      }}
    >
      <Pressable
        style={{ 
          alignItems: "center", 
          justifyContent: "center",
          paddingVertical: 6,
          paddingHorizontal: 2,
        }}
        onPress={handlePress}
        android_ripple={{ color: "rgba(255,255,255,0.1)", borderless: true }}
      >
        <Animated.View
          style={{
            transform: [{ scale: iconScaleAnim }],
          }}
        >
          <Icon name={icon} size={24} color={isFocused ? "#FFFFFF" : "#888"} />
        </Animated.View>
        <Animated.Text
          style={{
            marginTop: 4,
            fontSize: 13,
            fontWeight: isFocused ? "600" : "400",
            color: isFocused ? "#FFFFFF" : "#888",
            opacity: textOpacityAnim,
          }}
        >
          {label}
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

function CyberpunkTabBar({ state, navigation }: BottomTabBarProps) {
  const [previousIndex, setPreviousIndex] = useState(state.index);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const backgroundOpacity = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    // Set transitioning state
    if (state.index !== previousIndex) {
      setIsTransitioning(true);
      // Subtle background animation during transition
      Animated.sequence([
        Animated.timing(backgroundOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundOpacity, {
          toValue: 0.95,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Reset transitioning state after animation completes
        setIsTransitioning(false);
      });
    }

    setPreviousIndex(state.index);
  }, [state.index, previousIndex]);

  return (
    <View style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
      {/* Background with blur effect */}
      <Animated.View
        style={{
          height: 70,
          backgroundColor: "rgba(8, 15, 18, 0.95)",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 8,
          opacity: backgroundOpacity,
        }}
      >
        {/* Tab buttons */}
        <View
          style={{
            flexDirection: "row",
            height: "100%",
            paddingTop: 8,
          }}
        >
          {TAB_CONFIG.map(({ name, label, icon }, idx) => {
            const isFocused = state.index === idx;
            return (
              <TabButton
                key={name}
                icon={icon}
                label={label}
                isFocused={isFocused}
                index={idx}
                onPress={() => {
                  if (!isFocused && !isTransitioning) {
                    // Extra-light haptic feedback on actual tab change
                    Haptics.selectionAsync();
                    navigation.navigate(name);
                  }
                }}
              />
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

export default function TabsLayout() {
  const { isSignedIn } = useAuth();

  return (
    <Tabs
      tabBar={(props) => <CyberpunkTabBar {...props} />}
      screenOptions={{ 
        headerShown: false,
        tabBarStyle: { display: 'none' }, // Hide default tab bar since we have custom one
      }}
    >
      {TAB_CONFIG.map(({ name, label }) => (
        <Tabs.Screen 
          key={name} 
          name={name} 
          options={{ 
            title: label,
          }} 
        />
      ))}
    </Tabs>
  );
}
