import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Animated,
  Pressable,
  Dimensions,
  SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { cyberpunkTheme } from "./_layout";

const { width } = Dimensions.get("window");

const slides = [
  {
    id: "1",
    title: "Hey, Let’s Debate!",
    description:
      "Welcome to Lets Debate – your digital arena for structured, high-impact discussions. Connect with passionate debaters and ignite meaningful conversations.",
    icon: "database-eye",
  },
  {
    id: "2",
    title: "Timed Discussions",
    description:
      "Experience the power of focus. Our debates are time-bound – whether 24 hours or 3 days – ensuring every conversation is dynamic, engaging, and results-driven.",
    icon: "clock-outline",
  },
  {
    id: "3",
    title: "Give Your Opinion Before Voting",
    description:
      "Quality takes center stage. Share well-researched, fact-backed opinions before voting to earn reputation points and unlock exclusive badges.",
    icon: "check-decagram",
  },
  {
    id: "4",
    title: "Privacy & Security",
    description:
      "Your data is our priority. With robust encryption and tight security, join a community where privacy is paramount and every debate is secure.",
    icon: "shield-lock",
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef(null);

  const viewableItemsChanged = useRef(({ viewableItems }) => {
    setCurrentIndex(viewableItems[0].index);
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollTo = async () => {
    if (currentIndex < slides.length - 1) {
      slidesRef.current.scrollToIndex({ index: currentIndex + 1 });
    } else {
      try {
        await AsyncStorage.setItem("hasOnboarded", "true");
        router.replace("/(tabs)");
      } catch (err) {
        console.log("Error storing onboarding status:", err);
      }
    }
  };

  const skipOnboarding = async () => {
    try {
      await AsyncStorage.setItem("hasOnboarded", "true");
      router.replace("/(tabs)");
    } catch (err) {
      console.log("Error storing onboarding status:", err);
    }
  };

  return (
    <SafeAreaView className='flex-1 bg-gray-900'>
      <LinearGradient
        colors={cyberpunkTheme.colors.gradients.background}
        className='absolute inset-0'
      />

      <View className='absolute top-12 right-6 z-10'>
        <Pressable
          className='px-4 py-2 rounded-full border border-green-400/30'
          onPress={skipOnboarding}
        >
          <Text className='text-green-400 font-medium'>Skip</Text>
        </Pressable>
      </View>

      <Animated.FlatList
        data={slides}
        ref={slidesRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
        renderItem={({ item }) => (
          <View
            className='flex-1 justify-center items-center px-6'
            style={{ width }}
          >
            <View
              className='w-32 h-32 rounded-full bg-gray-800/50 items-center justify-center mb-8 border border-green-400/20'
              style={{
                shadowColor: cyberpunkTheme.colors.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.3,
                shadowRadius: 15,
              }}
            >
              <Icon
                name={item.icon}
                size={64}
                color={cyberpunkTheme.colors.primary}
              />
            </View>

            <Text className='text-white text-3xl font-bold text-center mb-4'>
              {item.title}
            </Text>

            <View className='px-4'>
              <Text className='text-gray-300 text-center text-base'>
                {item.description}
              </Text>
            </View>

            <LinearGradient
              colors={["rgba(0, 255, 148, 0.1)", "rgba(0, 255, 148, 0.01)"]}
              className='absolute bottom-0 left-0 right-0 h-40 opacity-30'
            />
          </View>
        )}
      />

      <View className='flex-row justify-between items-center px-6 pb-12'>
        <View className='flex-row'>
          {slides.map((_, index) => (
            <View
              key={index}
              className={`h-1 rounded-full mx-1 ${
                currentIndex === index ? "bg-green-400 w-8" : "bg-gray-600 w-2"
              }`}
            />
          ))}
        </View>

        <Pressable
          onPress={scrollTo}
          className='w-16 h-16 rounded-full items-center justify-center'
        >
          <LinearGradient
            colors={cyberpunkTheme.colors.gradients.primary}
            className='w-16 h-16 rounded-full items-center justify-center'
            style={{
              shadowColor: cyberpunkTheme.colors.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 10,
            }}
          >
            <Icon
              name={
                currentIndex === slides.length - 1 ? "check" : "chevron-right"
              }
              size={32}
              color='#0A1115'
            />
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
