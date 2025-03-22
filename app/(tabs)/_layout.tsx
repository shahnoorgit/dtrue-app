import React, { useRef } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  StatusBar,
  SafeAreaView,
  View,
  Text,
  Pressable,
  Animated,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";
import { SignedIn, useUser } from "@clerk/clerk-expo";
import * as Haptics from "expo-haptics"; // Import expo-haptics

// Create the bottom tab navigator
const Tab = createBottomTabNavigator();

// Custom Tab Button Component with Basic Animation
function TabButton({ icon, label, isFocused, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.9,
      duration: 100,
      useNativeDriver: true,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // Add haptic feedback
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
function CyberpunkTabBar({ state, descriptors, navigation }) {
  return (
    <View className='absolute bottom-6 left-4 right-4 rounded-2xl overflow-hidden h-20'>
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
          const label = options.title || route.name;
          const isFocused = state.index === index;

          // Improved cyberpunk-themed icons
          let iconName;
          if (route.name === "index") {
            iconName = "newspaper-variant-outline"; // Better Feed icon
          } else if (route.name === "Trending") {
            iconName = "fire"; // Fire flame for trending
          } else if (route.name === "Rooms") {
            iconName = "door-sliding"; // Better rooms icon
          } else if (route.name === "Profile") {
            iconName = "card-account-details-outline"; // Better profile icon
          }

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabButton
              key={index}
              icon={iconName}
              label={label}
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

// Layout component
export default function Layout() {
  const { user } = useUser();
  return (
    <SignedIn>
      <StatusBar barStyle='light-content' backgroundColor='#0A1115' />
      <SafeAreaView className='flex-1 bg-gray-900'>
        <Tab.Navigator
          tabBar={(props) => <CyberpunkTabBar {...props} />}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Tab.Screen
            name='index'
            component={require("./index").default}
            options={{ title: "Feed" }}
          />
          <Tab.Screen
            name='Trending'
            component={require("./trending").default}
            options={{ title: "Trending" }}
          />
          <Tab.Screen
            name='Rooms'
            component={require("./rooms").default}
            options={{ title: "Rooms" }}
          />
          <Tab.Screen
            name='Profile'
            component={require("./profile").default}
            options={{ title: "Profile" }}
          />
        </Tab.Navigator>
      </SafeAreaView>
    </SignedIn>
  );
}
