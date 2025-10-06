import React, { useState, useEffect, useRef } from 'react';
import { View, Animated, Dimensions, PanResponder, Platform } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

interface AnimatedTabNavigatorProps {
  children: React.ReactNode;
  currentIndex: number;
  onTabChange: (index: number) => void;
}

const TAB_ORDER = ['index', 'trending', 'explore', 'rooms', 'profile'];

export default function AnimatedTabNavigator({ 
  children, 
  currentIndex, 
  onTabChange 
}: AnimatedTabNavigatorProps) {
  const translateX = useRef(new Animated.Value(-currentIndex * width)).current;
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (!isTransitioning) {
      Animated.spring(translateX, {
        toValue: -currentIndex * width,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
        mass: 1,
      }).start();
    }
  }, [currentIndex, isTransitioning]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 50;
      },
      onPanResponderRelease: (evt, gestureState) => {
        const { dx, vx } = gestureState;
        
        // Determine swipe direction and threshold
        const threshold = width * 0.3;
        const shouldSwipe = Math.abs(dx) > threshold || Math.abs(vx) > 0.5;
        
        if (shouldSwipe) {
          const direction = dx > 0 ? -1 : 1;
          const newIndex = currentIndex + direction;
          
          // Check bounds
          if (newIndex >= 0 && newIndex < TAB_ORDER.length) {
            setIsTransitioning(true);
            
            // Subtle haptic feedback on actual tab change
            Haptics.selectionAsync();
            
            onTabChange(newIndex);
            
            // Reset transition state after animation
            setTimeout(() => setIsTransitioning(false), 300);
          }
        }
      },
    })
  ).current;

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      <Animated.View
        style={{
          flex: 1,
          flexDirection: 'row',
          width: width * TAB_ORDER.length,
          transform: [{ translateX }],
        }}
      >
        {children}
      </Animated.View>
    </View>
  );
}
