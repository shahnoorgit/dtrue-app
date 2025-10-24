import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

interface TabContentWrapperProps {
  children: React.ReactNode;
  isActive: boolean;
}

export default function TabContentWrapper({ children, isActive }: TabContentWrapperProps) {
  const fadeAnim = useRef(new Animated.Value(isActive ? 1 : 0.8)).current;
  const scaleAnim = useRef(new Animated.Value(isActive ? 1 : 0.98)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: isActive ? 1 : 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: isActive ? 1 : 0.98,
        useNativeDriver: true,
        tension: 300,
        friction: 20,
      }),
    ]).start();
  }, [isActive]);

  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
      }}
    >
      {children}
    </Animated.View>
  );
}
