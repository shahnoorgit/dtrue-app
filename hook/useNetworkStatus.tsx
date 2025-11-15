import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
  isOffline: boolean;
}

export interface OfflineData {
  timestamp: number;
  data: any;
  screen: string;
  userActions: UserAction[];
}

export interface UserAction {
  id: string;
  type: 'navigation' | 'interaction' | 'data_change';
  timestamp: number;
  data: any;
  screen: string;
}

const OFFLINE_DATA_KEY = 'offline_data';
const USER_ACTIONS_KEY = 'user_actions';
const LAST_SCREEN_KEY = 'last_screen';

export const useNetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    type: null,
    isOffline: false,
  });

  const [isReconnecting, setIsReconnecting] = useState(false);
  const [offlineData, setOfflineData] = useState<OfflineData | null>(null);

  // Save current screen state when going offline
  const saveOfflineState = useCallback(async (screen: string, data: any) => {
    try {
      const offlineState: OfflineData = {
        timestamp: Date.now(),
        data,
        screen,
        userActions: [],
      };
      
      await AsyncStorage.setItem(OFFLINE_DATA_KEY, JSON.stringify(offlineState));
      await AsyncStorage.setItem(LAST_SCREEN_KEY, screen);
      setOfflineData(offlineState);
    } catch (error) {
      console.error('Error saving offline state:', error);
    }
  }, []);

  // Save user action while offline
  const saveUserAction = useCallback(async (action: Omit<UserAction, 'id' | 'timestamp'>) => {
    try {
      const userAction: UserAction = {
        id: `${Date.now()}_${Math.random()}`,
        timestamp: Date.now(),
        ...action,
      };

      const existingActions = await AsyncStorage.getItem(USER_ACTIONS_KEY);
      const actions: UserAction[] = existingActions ? JSON.parse(existingActions) : [];
      actions.push(userAction);

      await AsyncStorage.setItem(USER_ACTIONS_KEY, JSON.stringify(actions));
    } catch (error) {
      console.error('Error saving user action:', error);
    }
  }, []);

  // Get saved offline data
  const getOfflineData = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(OFFLINE_DATA_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting offline data:', error);
      return null;
    }
  }, []);

  // Clear offline data when back online
  const clearOfflineData = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([OFFLINE_DATA_KEY, USER_ACTIONS_KEY, LAST_SCREEN_KEY]);
      setOfflineData(null);
    } catch (error) {
      console.error('Error clearing offline data:', error);
    }
  }, []);

  // Check if we have offline data to restore
  const hasOfflineData = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(OFFLINE_DATA_KEY);
      return !!data;
    } catch (error) {
      return false;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const isOffline = !state.isConnected || state.isInternetReachable === false;
      
      setNetworkStatus({
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        isOffline,
      });

      // Handle reconnection
      if (!isOffline && networkStatus.isOffline) {
        setIsReconnecting(true);
        // Clear reconnecting state after a short delay
        setTimeout(() => setIsReconnecting(false), 2000);
      }
    });

    return () => unsubscribe();
  }, [networkStatus.isOffline]);

  // Load offline data on mount
  useEffect(() => {
    const loadOfflineData = async () => {
      const data = await getOfflineData();
      if (data) {
        setOfflineData(data);
      }
    };
    loadOfflineData();
  }, [getOfflineData]);

  return {
    networkStatus,
    isReconnecting,
    offlineData,
    saveOfflineState,
    saveUserAction,
    getOfflineData,
    clearOfflineData,
    hasOfflineData,
  };
};
