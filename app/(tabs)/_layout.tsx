import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  useWindowDimensions,
} from "react-native";
import { Tabs } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const TAB_CONFIG = [
  { name: "index", label: "Feed", icon: "newspaper-variant-outline" },
  { name: "trending", label: "Trending", icon: "fire" },
  { name: "explore", label: "Explore", icon: "compass-outline" },
  { name: "rooms", label: "Rooms", icon: "door-sliding" },
  { name: "profile", label: "Profile", icon: "card-account-details-outline" },
];

function TabButton({ icon, label, isFocused, onPress }) {
  return (
    <Pressable
      style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
      onPress={onPress}
      android_ripple={{ color: "rgba(255,255,255,0.1)", borderless: true }}
    >
      <Icon name={icon} size={30} color={isFocused ? "#FFF" : "#888"} />
      <Text
        style={{
          marginTop: 4,
          fontSize: 13,
          fontWeight: isFocused ? "600" : "400",
          color: isFocused ? "#FFF" : "#888",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function CyberpunkTabBar({ state, navigation }: BottomTabBarProps) {
  const { width } = useWindowDimensions();
  const tabCount = TAB_CONFIG.length;
  const indicatorAnim = useRef(new Animated.Value(state.index)).current;

  useEffect(() => {
    Animated.spring(indicatorAnim, {
      toValue: state.index,
      useNativeDriver: true,
      stiffness: 250,
      damping: 25,
    }).start();
  }, [state.index]);

  return (
    <View style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
      <View
        style={{
          height: 80,
          flexDirection: "row",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          backgroundColor: "transparent", // transparent background
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
              onPress={() => !isFocused && navigation.navigate(name)}
            />
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { isSignedIn } = useAuth();

  return (
    <Tabs
      tabBar={(props) => <CyberpunkTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {TAB_CONFIG.map(({ name, label }) => (
        <Tabs.Screen key={name} name={name} options={{ title: label }} />
      ))}
    </Tabs>
  );
}
