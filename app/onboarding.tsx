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
import {
  trackOnboardingCompleted,
  trackOnboardingAbandoned,
} from "@/lib/posthog/events";

const { width } = Dimensions.get("window");

const slides = [
  {
    id: "1",
    title: "Welcome to Dtrue",
    description: "Ignite your intellect and join a revolution in online discourse. Experience debates that are structured, meaningful, and designed to spark real insights.",
    icon: "forum",
  },
  {
    id: "2",
    title: "Time-Bound Conversations",
    description: "Say goodbye to endless arguments. Our debates run on strict time limits, ensuring discussions remain focused and decisions are reached.",
    icon: "clock-outline",
  },
  {
    id: "3",
    title: "Join the Debate",
    description: "Back your opinions with facts. Every vote requires evidence, promoting quality, accountability, and smarter debates. Ready to start your journey?",
    icon: "shield-lock",
    buttonText: "JOIN THE DEBATE",
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef(null);

  // Enhanced animation values
  const iconScale = useRef(new Animated.Value(0.5)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const descriptionTranslateY = useRef(new Animated.Value(20)).current;
  const skipButtonAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const buttonTextOpacity = useRef(new Animated.Value(1)).current;
  const backgroundPulse = useRef(new Animated.Value(1)).current;

  const isLastSlide = currentIndex === slides.length - 1;

  const animateContent = useCallback(() => {
    // Show text immediately, only animate icon
    titleOpacity.setValue(1);
    descriptionTranslateY.setValue(0);
    
    // Only animate icon with spring
    Animated.spring(iconScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, [iconScale, titleOpacity, descriptionTranslateY]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (!viewableItems[0]) return;
    const newIndex = viewableItems[0].index;
    setCurrentIndex(newIndex);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateContent();
  }).current;

  useEffect(() => {
    // Initial animations
    Animated.parallel([
      Animated.timing(skipButtonAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(backgroundPulse, {
        toValue: 1.05,
        duration: 2000,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.ease),
      }),
    ]).start();

    // Set initial values for immediate text display
    titleOpacity.setValue(1);
    descriptionTranslateY.setValue(0);
    buttonTextOpacity.setValue(1);
    
    // Animate content for first slide
    animateContent();

    // Enhanced button pulse animation
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
      backgroundPulse.stopAnimation();
    };
  }, [isLastSlide, buttonScale, skipButtonAnim, animateContent, backgroundPulse]);

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollTo = useCallback(() => {
    if (currentIndex < slides.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      try {
        slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
      } catch (error: any) {
        console.error("Scroll error:", error);
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
          trackOnboardingCompleted({ step: currentIndex });
          router.replace("/(auth)/sign-in");
        } catch (error: any) {
          console.error("Navigation error:", error);
          logError(error, {
            context: "OnboardingScreen.scrollTo",
            action: "navigate_to_signin",
          });
        }
      });
    }
  }, [currentIndex, buttonScale, buttonTextOpacity]);

  const skipOnboarding = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    trackOnboardingAbandoned({
      step: currentIndex,
      reason: "skipped",
    });
    try {
      router.replace("/(auth)/sign-in");
    } catch (error: any) {
      console.error("Navigation error:", error);
      logError(error, {
        context: "OnboardingScreen.skipOnboarding",
        action: "skip_to_signin",
      });
    }
  }, [currentIndex]);

  // Use consistent background color for all 3 slides
  const backgroundColor = "rgba(0, 255, 148, 0.1)";

  const buttonRotation = scrollX.interpolate({
    inputRange: [0, (slides.length - 2) * width, (slides.length - 1) * width],
    outputRange: ["0deg", "180deg", "0deg"],
    extrapolate: "clamp",
  });

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={cyberpunkTheme.colors.gradients.background}
        style={styles.backgroundGradient}
      />
      
      {/* Enhanced background with pulse */}
      <Animated.View
        style={[
          styles.backgroundOverlay,
          { 
            backgroundColor,
            transform: [{ scale: backgroundPulse }],
          },
        ]}
      />

      {/* Skip button with enhanced animation */}
      <Animated.View
        style={[
          styles.skipButtonContainer,
          {
            opacity: skipButtonAnim,
            transform: [
              {
                translateY: skipButtonAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Pressable
          style={styles.skipButton}
          onPress={skipOnboarding}
          onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
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
          <View style={styles.slideContainer}>
            {/* Enhanced icon with better styling */}
            <Animated.View
              style={[
                styles.iconContainer,
                {
                  transform: [{ scale: iconScale }],
                  shadowColor: cyberpunkTheme.colors.primary,
                },
              ]}
            >
              <LinearGradient
                colors={[cyberpunkTheme.colors.primary, `${cyberpunkTheme.colors.primary}80`]}
                style={styles.iconGradient}
              >
                <Icon
                  name={item.icon}
                  size={48}
                  color="#FFFFFF"
                />
              </LinearGradient>
            </Animated.View>

            {/* Enhanced title */}
            <Animated.Text
              style={[
                styles.title,
                { opacity: titleOpacity },
              ]}
            >
              {item.title}
            </Animated.Text>

            {/* Enhanced description */}
            <Animated.View
              style={[
                styles.descriptionContainer,
                { transform: [{ translateY: descriptionTranslateY }] },
              ]}
            >
              <Text style={styles.description}>{item.description}</Text>
            </Animated.View>

            {/* Subtle gradient overlay */}
            <LinearGradient
              colors={["rgba(0, 255, 148, 0.1)", "rgba(0, 255, 148, 0.01)"]}
              style={styles.gradientOverlay}
            />
          </View>
        )}
      />

      {/* Enhanced bottom controls */}
      <View style={styles.bottomControls}>
        {/* Enhanced progress dots */}
        <View style={styles.dotsContainer}>
          {slides.map((_, index) => {
            const isActive = index === currentIndex;
            return (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  {
                    width: isActive ? 32 : 8,
                    opacity: isActive ? 1 : 0.3,
                    transform: [{ scale: isActive ? 1.2 : 0.8 }],
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Enhanced action button */}
        <Animated.View
          style={[
            styles.buttonContainer,
            { transform: [{ scale: buttonScale }] },
          ]}
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
            style={styles.actionButton}
          >
            <View style={styles.buttonContent}>
              <LinearGradient
                colors={cyberpunkTheme.colors.gradients.primary}
                style={styles.buttonGradient}
              >
                <Animated.View
                  style={{ transform: [{ rotate: buttonRotation }] }}
                >
                  <Icon name="chevron-right" size={32} color="#0A1115" />
                </Animated.View>
              </LinearGradient>
            </View>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#0A0A1A",
  },
  backgroundGradient: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundOverlay: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.5,
  },
  skipButtonContainer: {
    position: "absolute" as const,
    top: 60,
    right: 20,
    zIndex: 10,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 255, 148, 0.3)",
    backgroundColor: "rgba(0, 255, 148, 0.1)",
  },
  skipButtonText: {
    color: cyberpunkTheme.colors.primary,
    fontSize: 14,
    fontWeight: "600" as const,
  },
  slideContainer: {
    flex: 1,
    width,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    paddingHorizontal: 32,
    position: "relative" as const,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 32,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
  },
  iconGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 60,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  title: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    textAlign: "center" as const,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  descriptionContainer: {
    paddingHorizontal: 16,
  },
  description: {
    fontSize: 16,
    color: "#A3A3A3",
    textAlign: "center" as const,
    lineHeight: 24,
  },
  gradientOverlay: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    opacity: 0.3,
  },
  bottomControls: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  dotsContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  progressDot: {
    height: 4,
    borderRadius: 2,
    backgroundColor: cyberpunkTheme.colors.primary,
    marginHorizontal: 4,
  },
  buttonContainer: {
    position: "relative" as const,
  },
  actionButton: {
    borderRadius: 32,
    overflow: "hidden" as const,
  },
  buttonContent: {
    height: 64,
    width: 64,
  },
  buttonGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 15,
  },
};