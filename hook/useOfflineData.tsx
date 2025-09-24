import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOffline } from '@/contexts/OfflineContext';

interface OfflineDataManager {
  saveScreenData: (screen: string, data: any) => Promise<void>;
  getScreenData: (screen: string) => Promise<any>;
  clearScreenData: (screen: string) => Promise<void>;
  isDataAvailable: (screen: string) => Promise<boolean>;
  getLastScreen: () => Promise<string | null>;
}

const SCREEN_DATA_PREFIX = 'screen_data_';
const LAST_SCREEN_KEY = 'last_screen';

export function useOfflineData(): OfflineDataManager {
  const { networkStatus } = useOffline();

  const saveScreenData = useCallback(async (screen: string, data: any) => {
    try {
      const key = `${SCREEN_DATA_PREFIX}${screen}`;
      const screenData = {
        data,
        timestamp: Date.now(),
        screen,
      };
      await AsyncStorage.setItem(key, JSON.stringify(screenData));
      await AsyncStorage.setItem(LAST_SCREEN_KEY, screen);
    } catch (error) {
      console.error('Error saving screen data:', error);
    }
  }, []);

  const getScreenData = useCallback(async (screen: string) => {
    try {
      const key = `${SCREEN_DATA_PREFIX}${screen}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting screen data:', error);
      return null;
    }
  }, []);

  const clearScreenData = useCallback(async (screen: string) => {
    try {
      const key = `${SCREEN_DATA_PREFIX}${screen}`;
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error clearing screen data:', error);
    }
  }, []);

  const isDataAvailable = useCallback(async (screen: string) => {
    try {
      const key = `${SCREEN_DATA_PREFIX}${screen}`;
      const data = await AsyncStorage.getItem(key);
      return !!data;
    } catch (error) {
      return false;
    }
  }, []);

  const getLastScreen = useCallback(async () => {
    try {
      return await AsyncStorage.getItem(LAST_SCREEN_KEY);
    } catch (error) {
      return null;
    }
  }, []);

  return {
    saveScreenData,
    getScreenData,
    clearScreenData,
    isDataAvailable,
    getLastScreen,
  };
}
