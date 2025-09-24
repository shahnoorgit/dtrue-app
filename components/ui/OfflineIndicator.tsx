import React, { useEffect, useState } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useOffline } from '@/contexts/OfflineContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { cyberpunkTheme } from '@/constants/theme';

interface OfflineIndicatorProps {
  showWhenOnline?: boolean;
  position?: 'top' | 'bottom';
}

export default function OfflineIndicator({ 
  showWhenOnline = false, 
  position = 'top' 
}: OfflineIndicatorProps) {
  const { networkStatus, isReconnecting } = useOffline();
  const [slideAnim] = useState(new Animated.Value(-100));
  const [opacityAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (networkStatus.isOffline || isReconnecting) {
      // Slide in animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (showWhenOnline) {
      // Slide out animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: position === 'top' ? -100 : 100,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [networkStatus.isOffline, isReconnecting, showWhenOnline, position, slideAnim, opacityAnim]);

  // Don't show if online and not requested
  if (!networkStatus.isOffline && !isReconnecting && !showWhenOnline) {
    return null;
  }

  const getStatusInfo = () => {
    if (isReconnecting) {
      return {
        text: 'Reconnecting...',
        icon: 'wifi-sync',
        color: '#FFA500',
      };
    }
    
    if (networkStatus.isOffline) {
      return {
        text: 'You\'re offline',
        icon: 'wifi-off',
        color: '#FF4757',
      };
    }
    
    return {
      text: 'Back online',
      icon: 'wifi',
      color: '#00FF94',
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          [position]: 0,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={[styles.indicator, { backgroundColor: statusInfo.color }]}>
        <Icon
          name={statusInfo.icon}
          size={16}
          color="#FFFFFF"
          style={styles.icon}
        />
        <Text style={styles.text}>{statusInfo.text}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
