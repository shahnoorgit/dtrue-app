import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { cyberpunkTheme } from '@/constants/theme';

interface OfflineScreenProps {
  onRetry?: () => void;
  isReconnecting?: boolean;
  lastScreen?: string;
}

const { width, height } = Dimensions.get('window');

export default function OfflineScreen({ 
  onRetry, 
  isReconnecting = false,
  lastScreen = 'Feed'
}: OfflineScreenProps) {
  const [pulseAnim] = useState(new Animated.Value(1));
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Pulse animation for the icon
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, [pulseAnim, fadeAnim]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={cyberpunkTheme.colors.gradients.background as [string, string]}
        style={styles.gradient}
      />
      
      <Animated.View 
        style={[
          styles.content,
          { opacity: fadeAnim }
        ]}
      >
        {/* Animated Icon */}
        <Animated.View
          style={[
            styles.iconContainer,
            { transform: [{ scale: pulseAnim }] }
          ]}
        >
          <View style={styles.iconBackground}>
            <Icon
              name="wifi-off"
              size={60}
              color={cyberpunkTheme.colors.primary}
            />
          </View>
        </Animated.View>

        {/* Main Message */}
        <Text style={styles.title}>
          {isReconnecting ? 'Reconnecting...' : 'You\'re Offline'}
        </Text>
        
        <Text style={styles.subtitle}>
          {isReconnecting 
            ? 'Getting you back online...' 
            : 'Check your internet connection and try again'
          }
        </Text>

        {/* Last Screen Info */}
        {lastScreen && !isReconnecting && (
          <View style={styles.lastScreenContainer}>
            <Icon
              name="history"
              size={16}
              color={cyberpunkTheme.colors.primary}
              style={styles.historyIcon}
            />
            <Text style={styles.lastScreenText}>
              Last seen on: {lastScreen}
            </Text>
          </View>
        )}

        {/* Connection Status Indicator */}
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusDot,
            { backgroundColor: isReconnecting ? '#FFA500' : '#FF4757' }
          ]} />
          <Text style={styles.statusText}>
            {isReconnecting ? 'Reconnecting' : 'No Connection'}
          </Text>
        </View>

        {/* Retry Button (only show when not reconnecting) */}
        {!isReconnecting && onRetry && (
          <Animated.View style={styles.retryContainer}>
            <View style={styles.retryButton}>
              <Icon
                name="refresh"
                size={20}
                color="#FFFFFF"
                style={styles.retryIcon}
              />
              <Text style={styles.retryText}>Try Again</Text>
            </View>
          </Animated.View>
        )}

        {/* Tips */}
        {!isReconnecting && (
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>Quick Tips:</Text>
            <View style={styles.tipItem}>
              <Icon name="check-circle" size={16} color="#00FF94" />
              <Text style={styles.tipText}>Check your WiFi or mobile data</Text>
            </View>
            <View style={styles.tipItem}>
              <Icon name="check-circle" size={16} color="#00FF94" />
              <Text style={styles.tipText}>Move to an area with better signal</Text>
            </View>
            <View style={styles.tipItem}>
              <Icon name="check-circle" size={16} color="#00FF94" />
              <Text style={styles.tipText}>Your data is saved locally</Text>
            </View>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080F12',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 255, 148, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 148, 0.3)',
    shadowColor: cyberpunkTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#8F9BB3',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  lastScreenContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 148, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 148, 0.2)',
  },
  historyIcon: {
    marginRight: 8,
  },
  lastScreenText: {
    color: cyberpunkTheme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#8F9BB3',
    fontSize: 14,
    fontWeight: '500',
  },
  retryContainer: {
    marginBottom: 32,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 148, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 148, 0.4)',
  },
  retryIcon: {
    marginRight: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tipsContainer: {
    width: '100%',
    maxWidth: 300,
  },
  tipsTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  tipText: {
    color: '#8F9BB3',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
});
