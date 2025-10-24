import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions } from 'react-native';

interface ScreenTransitionProps {
  children: React.ReactNode;
  isActive: boolean;
  direction?: 'left' | 'right';
}

const { width } = Dimensions.get('window');

export default function ScreenTransition({ 
  children, 
  isActive, 
  direction = 'right' 
}: ScreenTransitionProps) {
  const translateX = useRef(new Animated.Value(isActive ? 0 : (direction === 'right' ? width : -width))).current;
  const opacity = useRef(new Animated.Value(isActive ? 1 : 0.3)).current;

  useEffect(() => {
    const targetX = isActive ? 0 : (direction === 'right' ? width : -width);
    const targetOpacity = isActive ? 1 : 0.3;

    Animated.parallel([
      Animated.spring(translateX, {
        toValue: targetX,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
        mass: 1,
      }),
      Animated.timing(opacity, {
        toValue: targetOpacity,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isActive, direction]);

  return (
    <Animated.View
      style={{
        flex: 1,
        transform: [{ translateX }],
        opacity,
      }}
    >
      {children}
    </Animated.View>
  );
}
