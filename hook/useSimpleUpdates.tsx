import { useState, useEffect } from 'react';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UPDATE_DOWNLOADED_KEY = 'update_downloaded';

export const useSimpleUpdates = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Apply downloaded update on app start (if available) - ZERO DELAY
  const applyPendingUpdate = async () => {
    try {
      const hasDownloadedUpdate = await AsyncStorage.getItem(UPDATE_DOWNLOADED_KEY);
      
      if (hasDownloadedUpdate === 'true') {
        console.log('Applying downloaded update...');
        await AsyncStorage.removeItem(UPDATE_DOWNLOADED_KEY);
        // Apply the update immediately
        Updates.reloadAsync();
        return true; // Update was applied
      }
      return false; // No update to apply
    } catch (error) {
      console.error('Error applying update:', error);
      return false;
    }
  };

  // Check for updates in background (completely silent, no UI blocking)
  const checkForUpdates = async () => {
    try {
      setIsChecking(true);
      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        console.log('Update available, downloading silently...');
        // Download immediately in background
        await downloadUpdateInBackground();
      }

      return update;
    } catch (error) {
      console.error('Error checking for updates:', error);
      return { isAvailable: false };
    } finally {
      setIsChecking(false);
    }
  };

  // Download update in background (completely silent, no restart)
  const downloadUpdateInBackground = async () => {
    try {
      setIsDownloading(true);
      console.log('Downloading update in background...');
      
      const update = await Updates.fetchUpdateAsync();
      
      if (update.isNew) {
        console.log('Update downloaded successfully, will apply on next app open');
        // Store that update is ready
        await AsyncStorage.setItem(UPDATE_DOWNLOADED_KEY, 'true');
      }
    } catch (error) {
      console.error('Error downloading update:', error);
      // Silent failure - don't interrupt user
    } finally {
      setIsDownloading(false);
    }
  };

  // Initialize update system - ONLY on app open, NO timers
  useEffect(() => {
    if (!__DEV__) {
      // First, apply any pending updates (if any)
      applyPendingUpdate().then((updateWasApplied) => {
        // Only check for new updates if no update was just applied
        if (!updateWasApplied) {
          // Check for updates immediately after app opens (no delay)
          checkForUpdates();
        }
      });
    }
  }, []);

  return {
    checkForUpdates,
    downloadUpdateInBackground,
    applyPendingUpdate,
    isChecking,
    isDownloading,
  };
};
