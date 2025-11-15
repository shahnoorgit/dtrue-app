import { useState, useEffect } from 'react';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UPDATE_DOWNLOADED_KEY = 'update_downloaded';
const UPDATE_CHECKED_KEY = 'update_checked_this_session';

export const useSimpleUpdates = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Apply downloaded update on app start (if available) - ONLY if user explicitly wants it
  const applyPendingUpdate = async () => {
    try {
      const hasDownloadedUpdate = await AsyncStorage.getItem(UPDATE_DOWNLOADED_KEY);
      
      if (hasDownloadedUpdate === 'true') {
        console.log('Update is ready, will apply on next app restart');
        // DON'T apply immediately - let user continue with current session
        // Update will be applied when they close and reopen the app
        return false; // No immediate reload
      }
      return false; // No update to apply
    } catch (error) {
      console.error('Error checking for updates:', error);
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
        // Store that update is ready - but DON'T apply it now
        await AsyncStorage.setItem(UPDATE_DOWNLOADED_KEY, 'true');
        // The update will be applied when the app is completely restarted
      }
    } catch (error) {
      console.error('Error downloading update:', error);
      // Silent failure - don't interrupt user
    } finally {
      setIsDownloading(false);
    }
  };

  // Initialize update system - ONLY check once per session, NO immediate updates
  useEffect(() => {
    if (!__DEV__) {
      // Check if we've already checked for updates this session
      AsyncStorage.getItem(UPDATE_CHECKED_KEY).then((hasChecked) => {
        if (!hasChecked) {
          // Mark that we've checked this session
          AsyncStorage.setItem(UPDATE_CHECKED_KEY, 'true');
          // Check for updates only once per session - completely in background
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
