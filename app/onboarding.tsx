import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Animated,
  Pressable,
  Dimensions,
  SafeAreaView,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { cyberpunkTheme } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import { logError } from "@/utils/sentry/sentry";
import { posthog } from "@/lib/posthog/posthog";

const { width } = Dimensions.get("window");

const slides = [
  {
    id: "1",
    title: "Welcome to Dtrue",
    description:
      "Ignite your intellect and join a revolution in online discourse. Experience debates that are structured, meaningful, and designed to spark real insights.",
    icon: "forum",
    bgColor: "rgba(0, 255, 148, 0.1)",
  },
  {
    id: "2",
    title: "Time-Bound Conversations",
    description:
      "Say goodbye to endless arguments. Our debates run on strict time limits, ensuring discussions remain focused and decisions are reached.",
    icon: "clock-outline",
    bgColor: "rgba(0, 180, 255, 0.1)",
  },
  {
    id: "3",
    title: "Evidence-Driven Insights",
    description:
      "Back your opinions with facts. Every vote requires evidence, promoting quality, accountability, and smarter debates.",
    icon: "check-decagram",
    bgColor: "rgba(255, 100, 255, 0.1)",
  },
  {
    id: "4",
    title: "Secure & Exclusive Spaces",
    description:
      "Debate with confidence. Our platform prioritizes your privacy, with verified voices and state-of-the-art security keeping discussions safe and impactful.",
    icon: "shield-lock",
    bgColor: "rgba(255, 210, 0, 0.1)",
    buttonText: "JOIN THE DEBATE",
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current; // <-- fixed: declare scrollX
  const slidesRef = useRef(null);

  // Animation values (kept for polish)
  const iconScale = useRef(new Animated.Value(0.5)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const descriptionTranslateY = useRef(new Animated.Value(20)).current;
  const skipButtonAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const buttonWidth = useRef(new Animated.Value(64)).current;
  const buttonTextOpacity = useRef(new Animated.Value(0)).current;

  const isLastSlide = currentIndex === slides.length - 1;

  const animateContent = useCallback(() => {
    iconScale.setValue(0.5);
    titleOpacity.setValue(0);
    descriptionTranslateY.setValue(20);
    Animated.sequence([
      Animated.timing(iconScale, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(descriptionTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.exp),
        }),
      ]),
    ]).start();
  }, [iconScale, titleOpacity, descriptionTranslateY]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (!viewableItems[0]) return;
    const newIndex = viewableItems[0].index;
    setCurrentIndex(newIndex);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateContent();
  }).current;

  useEffect(() => {
    // Minimal analytics: record the screen once on mount.
    try {
      posthog.screen("Onboarding");
    } catch (err) {
      console.warn("PostHog screen call failed", err);
    }

    Animated.timing(skipButtonAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();

    const pulseButton = () => {
      Animated.sequence([
        Animated.timing(buttonScale, {
          toValue: isLastSlide ? 1.05 : 1.08,
          duration: isLastSlide ? 1200 : 800,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(buttonScale, {
          toValue: 1,
          duration: isLastSlide ? 1200 : 800,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ]).start(() => pulseButton());
    };

    pulseButton();
    return () => {
      buttonScale.stopAnimation();
      skipButtonAnim.stopAnimation();
    };
  }, [isLastSlide, buttonScale, skipButtonAnim]);

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollTo = useCallback(() => {
    if (currentIndex < slides.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      try {
        slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
        // Track user progressing through onboarding
        try {
          posthog.capture("onboarding_next", { nextIndex: currentIndex + 1 });
        } catch (e) {
          console.warn("PostHog capture failed", e);
        }
      } catch (error: any) {
        console.error("Scroll error:", error);
      }
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.sequence([
        Animated.timing(buttonScale, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(buttonTextOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        try {
          // Track completion
          try {
            posthog.capture("onboarding_completed");
          } catch (e) {
            console.warn("PostHog capture failed", e);
          }
          router.replace("/(auth)/sign-in");
        } catch (error: any) {
          console.error("Navigation error:", error);
          logError(error, {
            context: "OnboardingScreen.scrollTo",
            action: "navigate_to_signin",
          });
          try {
            posthog.capture("onboarding_navigation_error", {
              message: error?.message,
            });
          } catch (e) {
            /* ignore */
          }
        }
      });
    }
  }, [currentIndex, buttonScale, buttonTextOpacity]);

  const skipOnboarding = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      posthog.capture("onboarding_skipped");
    } catch (e) {
      console.warn("PostHog capture failed", e);
    }
    try {
      router.replace("/(auth)/sign-in");
    } catch (error: any) {
      console.error("Navigation error:", error);
      logError(error, {
        context: "OnboardingScreen.skipOnboarding",
        action: "skip_to_signin",
      });
      try {
        posthog.capture("onboarding_navigation_error", {
          message: error?.message,
        });
      } catch (e) {
        /* ignore */
      }
    }
  }, []);

  const inputRange = slides.map((_, i) => i * width);
  const backgroundColor = scrollX.interpolate({
    inputRange,
    outputRange: slides.map((slide) => slide.bgColor),
    extrapolate: "clamp",
  });

  const buttonRotation = scrollX.interpolate({
    inputRange: [0, (slides.length - 2) * width, (slides.length - 1) * width],
    outputRange: ["0deg", "180deg", "0deg"],
    extrapolate: "clamp",
  });

  return (
    <SafeAreaView className='flex-1 bg-gray-900'>
      <LinearGradient
        colors={cyberpunkTheme.colors.gradients.background}
        className='absolute inset-0'
      />
      <Animated.View
        className='absolute inset-0 opacity-50'
        style={{ backgroundColor }}
      />
      <Animated.View
        className='absolute top-12 right-6 z-10'
        style={{
          opacity: skipButtonAnim,
          transform: [
            {
              translateY: skipButtonAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            },
          ],
        }}
      >
        <Pressable
          className='px-4 py-2 rounded-full border border-green-400/30'
          onPress={skipOnboarding}
          onPressIn={() =>
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          }
        >
          <Text className='text-green-400 font-medium'>Skip</Text>
        </Pressable>
      </Animated.View>

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
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfig}
        renderItem={({ item }) => (
          <View
            className='flex-1 justify-center items-center px-6'
            style={{ width }}
          >
            <Animated.View
              className='w-32 h-32 rounded-full bg-gray-800/50 items-center justify-center mb-8 border border-green-400/20'
              style={{
                shadowColor: cyberpunkTheme.colors.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.3,
                shadowRadius: 15,
                transform: [{ scale: iconScale }],
              }}
            >
              <Icon
                name={item.icon}
                size={64}
                color={cyberpunkTheme.colors.primary}
              />
            </Animated.View>
            <Animated.Text
              className='text-white text-3xl font-bold text-center mb-4'
              style={{ opacity: titleOpacity }}
            >
              {item.title}
            </Animated.Text>
            <Animated.View
              className='px-4'
              style={{ transform: [{ translateY: descriptionTranslateY }] }}
            >
              <Text className='text-gray-300 text-center text-base'>
                {item.description}
              </Text>
            </Animated.View>
            <LinearGradient
              colors={["rgba(0, 255, 148, 0.1)", "rgba(0, 255, 148, 0.01)"]}
              className='absolute bottom-0 left-0 right-0 h-40 opacity-30'
            />
          </View>
        )}
      />

      <View className='flex-row justify-between items-center px-6 pb-12'>
        <Animated.View className='flex-row'>
          {slides.map((_, index) => {
            const dotInput = [
              (index - 1) * width,
              index * width,
              (index + 1) * width,
            ];
            const dotWidth = scrollX.interpolate({
              inputRange: dotInput,
              outputRange: [8, 32, 8],
              extrapolate: "clamp",
            });
            const dotOpacity = scrollX.interpolate({
              inputRange: dotInput,
              outputRange: [0.3, 1, 0.3],
              extrapolate: "clamp",
            });
            return (
              <Animated.View
                key={index}
                className='h-1 rounded-full mx-1 bg-green-400'
                style={{ width: dotWidth, opacity: dotOpacity }}
              />
            );
          })}
        </Animated.View>
        <Animated.View
          style={{ transform: [{ scale: buttonScale }], position: "relative" }}
        >
          <Pressable
            onPress={scrollTo}
            onPressIn={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Animated.spring(buttonScale, {
                toValue: 0.95,
                useNativeDriver: true,
              }).start();
            }}
            onPressOut={() => {
              if (!isLastSlide) {
                Animated.spring(buttonScale, {
                  toValue: 1,
                  useNativeDriver: true,
                }).start();
              }
            }}
            className='rounded-full items-center justify-center overflow-hidden'
          >
            <Animated.View style={{ width: buttonWidth, height: 64 }}>
              <LinearGradient
                colors={cyberpunkTheme.colors.gradients.primary}
                className='h-full w-full items-center justify-center flex-row'
                style={{
                  shadowColor: cyberpunkTheme.colors.primary,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.5,
                  shadowRadius: 10,
                }}
              >
                {isLastSlide ? (
                  <Animated.View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "100%",
                    }}
                  >
                    <Animated.Text
                      style={{
                        color: "#0A1115",
                        fontWeight: "bold",
                        fontSize: 16,
                        opacity: buttonTextOpacity,
                      }}
                    >
                      JOIN THE DEBATE
                    </Animated.Text>
                  </Animated.View>
                ) : (
                  <Animated.View
                    style={{ transform: [{ rotate: buttonRotation }] }}
                  >
                    <Icon name='chevron-right' size={32} color='#0A1115' />
                  </Animated.View>
                )}
              </LinearGradient>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
