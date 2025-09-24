import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useNetworkStatus } from '@/hook/useNetworkStatus';
import OfflineScreen from './OfflineScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OfflineWrapperProps {
  children: React.ReactNode;
}

const LAST_SCREEN_KEY = 'last_screen';
const OFFLINE_DATA_KEY = 'offline_data';

export default function OfflineWrapper({ children }: OfflineWrapperProps) {
  const {
    networkStatus,
    isReconnecting,
    offlineData,
    saveOfflineState,
    saveUserAction,
    clearOfflineData,
    hasOfflineData,
  } = useNetworkStatus();

  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [lastScreen, setLastScreen] = useState<string>('Feed');
  const [isRestoring, setIsRestoring] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    if (networkStatus.isOffline && !isReconnecting && isSignedIn) {
      const saveState = async () => {
        try {
          // Only save state for authenticated routes
          if (isValidAuthenticatedRoute(pathname)) {
            // Get current screen data based on pathname
            const screenData = await getCurrentScreenData();
            await saveOfflineState(pathname, screenData);
            setLastScreen(getScreenName(pathname));
          }
        } catch (error) {
          console.error('Error saving offline state:', error);
        }
      };
      saveState();
    }
  }, [networkStatus.isOffline, isReconnecting, isSignedIn, pathname, saveOfflineState]);

  // Mark initial load as complete after auth is loaded
  useEffect(() => {
    if (isLoaded) {
      const timer = setTimeout(() => setIsInitialLoad(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoaded]);

  // Handle reconnection
  useEffect(() => {
    if (!networkStatus.isOffline && isReconnecting && isLoaded && !isInitialLoad) {
      const handleReconnection = async () => {
        try {
          setIsRestoring(true);
          
          // Only restore if user is properly authenticated
          if (isSignedIn) {
            // Check if we have offline data to restore
            const hasData = await hasOfflineData();
            if (hasData) {
              // Show restoration message
              Alert.alert(
                'Welcome Back!',
                'Restoring your previous session...',
                [{ text: 'OK' }]
              );
              
              // Restore the last screen only if it's a valid authenticated route
              const lastScreenData = await AsyncStorage.getItem(LAST_SCREEN_KEY);
              if (lastScreenData && isValidAuthenticatedRoute(lastScreenData)) {
                // Navigate to the last screen
                router.replace(lastScreenData as any);
              }
              
              // Clear offline data after restoration
              await clearOfflineData();
            }
          } else {
            // User is not authenticated, clear offline data and let auth flow handle navigation
            await clearOfflineData();
          }
        } catch (error) {
          console.error('Error handling reconnection:', error);
        } finally {
          setIsRestoring(false);
        }
      };

      // Delay to show the reconnecting animation
      const timer = setTimeout(handleReconnection, 1500);
      return () => clearTimeout(timer);
    }
  }, [networkStatus.isOffline, isReconnecting, isLoaded, isSignedIn, hasOfflineData, clearOfflineData, router, isInitialLoad]);

  // Get current screen data for caching
  const getCurrentScreenData = async () => {
    try {
      // This would contain the current state of the screen
      // For now, we'll return basic info
      return {
        pathname,
        timestamp: Date.now(),
        // Add more specific data based on the current screen
        ...(pathname.includes('(tabs)') && { 
          tabData: 'feed_data' // This would be the actual feed data
        }),
      };
    } catch (error) {
      console.error('Error getting current screen data:', error);
      return { pathname, timestamp: Date.now() };
    }
  };

  // Check if route is valid for authenticated users
  const isValidAuthenticatedRoute = (path: string) => {
    // Only allow authenticated routes for restoration
    const authenticatedRoutes = [
      '/(tabs)',
      '/(tabs)/index',
      '/(tabs)/trending',
      '/(tabs)/explore',
      '/(tabs)/rooms',
      '/(tabs)/profile',
      '/(chat-room)',
    ];
    
    return authenticatedRoutes.some(route => path.includes(route));
  };

  // Get user-friendly screen name
  const getScreenName = (path: string) => {
    if (path.includes('(tabs)')) return 'Feed';
    if (path.includes('trending')) return 'Trending';
    if (path.includes('explore')) return 'Explore';
    if (path.includes('rooms')) return 'Rooms';
    if (path.includes('profile')) return 'Profile';
    if (path.includes('(chat-room)')) return 'Debate Room';
    if (path.includes('(auth)')) return 'Authentication';
    return 'App';
  };

  // Handle retry action
  const handleRetry = useCallback(() => {
    // Force a network check
    if (!networkStatus.isOffline) {
      // If we're back online, the useEffect will handle restoration
      return;
    }
    
    // Show retry message
    Alert.alert(
      'Still Offline',
      'Please check your internet connection and try again.',
      [{ text: 'OK' }]
    );
  }, [networkStatus.isOffline]);

  // Track user actions while offline
  const trackOfflineAction = useCallback((action: string, data?: any) => {
    if (networkStatus.isOffline) {
      saveUserAction({
        type: 'interaction',
        data: { action, ...data },
        screen: pathname,
      });
    }
  }, [networkStatus.isOffline, saveUserAction, pathname]);

  // Show offline screen when offline, but not during auth flows
  if (networkStatus.isOffline && isSignedIn) {
    return (
      <OfflineScreen
        onRetry={handleRetry}
        isReconnecting={isReconnecting || isRestoring}
        lastScreen={lastScreen}
      />
    );
  }

  // Show restoration screen when reconnecting (only for authenticated users)
  if ((isReconnecting || isRestoring) && isSignedIn) {
    return (
      <OfflineScreen
        isReconnecting={true}
        lastScreen={lastScreen}
      />
    );
  }

  // Render children with offline tracking
  return (
    <View style={{ flex: 1 }}>
      {children}
      {/* Invisible overlay to track offline actions (only for authenticated users) */}
      {networkStatus.isOffline && isSignedIn && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'transparent',
          }}
          onTouchStart={() => trackOfflineAction('touch_start')}
        />
      )}
    </View>
  );
}
