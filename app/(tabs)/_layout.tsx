import React, { useRef } from 'react';
import { Tabs } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { View, Text, Pressable, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { cyberpunkTheme } from '@/constants/theme';
import { BottomTabBarProps, BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';

// Types for tab button
interface TabButtonProps {
  icon: string;
  label: string;
  isFocused: boolean;
  onPress: () => void;
}

// Custom Tab Button Component with Animation
function TabButton({ icon, label, isFocused, onPress }: TabButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.9,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  // Bright neon green when active, light gray when inactive
  const iconColor = isFocused ? "#00FF94" : "#8F9BB3";

  return (
    <Pressable
      className='flex-1 items-center justify-center relative'
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
        }}
        className='items-center justify-center py-1'
      >
        {isFocused && (
          <LinearGradient
            colors={["#00FF94", "#02C39A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className='absolute top-0 w-12 h-1 rounded-full'
            style={{
              shadowColor: "#00FF94",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 10,
              elevation: 8,
            }}
          />
        )}

        <View className='w-10 h-10 items-center justify-center'>
          <Icon name={icon} size={28} color={iconColor} />
        </View>

        {isFocused ? (
          <Text
            className='text-xs font-bold mt-1 text-green-400'
            style={{
              textShadowColor: "rgba(0, 255, 148, 0.5)",
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 10,
            }}
          >
            {label}
          </Text>
        ) : (
          <Text className='text-xs mt-1 text-gray-400'>{label}</Text>
        )}

        {isFocused && (
          <View
            className='absolute w-16 h-16 rounded-full'
            style={{
              backgroundColor: "rgba(0, 255, 148, 0.08)",
              zIndex: -1,
            }}
          />
        )}
      </Animated.View>
    </Pressable>
  );
}

// Custom Tab Bar Component
function CyberpunkTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View className='absolute bottom-[-1] left-0 right-0 rounded-2xl overflow-hidden h-20'>
      <LinearGradient
        colors={["rgba(8, 15, 18, 0.97)", "rgba(3, 18, 17, 0.98)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className='flex-1 flex-row border border-green-900/20 rounded-2xl overflow-hidden'
        style={{
          shadowColor: "#00FF94",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.15,
          shadowRadius: 15,
          elevation: 5,
        }}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel || options.title || route.name;
          const isFocused = state.index === index;

          // Get icon name based on route name
          let iconName = "";
          if (route.name === "index") {
            iconName = "newspaper-variant-outline"; // Feed icon
          } else if (route.name === "trending") {
            iconName = "fire"; // Fire flame for trending
          } else if (route.name === "rooms") {
            iconName = "door-sliding"; // Rooms icon
          } else if (route.name === "profile") {
            iconName = "card-account-details-outline"; // Profile icon
          }

          const onPress = () => {
            // Handle navigation without using event emit directly
            if (!isFocused) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabButton
              key={index}
              icon={iconName}
              label={label as string}
              isFocused={isFocused}
              onPress={onPress}
            />
          );
        })}
      </LinearGradient>

      {/* Decorative cyberpunk elements */}
      <View
        className='absolute top-0 left-10 w-20 h-1 rounded-full opacity-30'
        style={{ backgroundColor: "#00FF94" }}
      />
      <View
        className='absolute top-0 right-10 w-12 h-1 rounded-full opacity-20'
        style={{ backgroundColor: "#00FF94" }}
      />
    </View>
  );
}

export default function TabsLayout() {
  const { isSignedIn } = useAuth();

  return (
    <Tabs
      tabBar={props => <CyberpunkTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Feed",
        }}
      />
      <Tabs.Screen
        name="trending"
        options={{
          title: "Trending",
        }}
      />
      <Tabs.Screen
        name="rooms"
        options={{
          title: "Rooms",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
        }}
      />
    </Tabs>
  );
}