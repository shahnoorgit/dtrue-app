import { useState, useEffect } from 'react';
import * as Updates from 'expo-updates';
import { Alert } from 'react-native';

export const useSimpleUpdates = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Check for updates (silent, automatic)
  const checkForUpdates = async () => {
    try {
      

      setIsChecking(true);
      const update = await Updates.checkForUpdateAsync();
      
      // Automatically download if update is available
      if (update.isAvailable) {
        await downloadUpdate();
      }

      return update;
    } catch (error) {
      console.error('Error checking for updates:', error);
      return { isAvailable: false };
    } finally {
      setIsChecking(false);
    }
  };

  // Download and install update (silent, automatic)
  const downloadUpdate = async () => {
    try {

      setIsDownloading(true);
      const update = await Updates.fetchUpdateAsync();
      
      // Automatically restart app if update is new
      if (update.isNew) {
        console.log('Update downloaded, restarting app automatically...');
        // Small delay to ensure download is complete
        setTimeout(() => {
          Updates.reloadAsync();
        }, 1000);
      }
    } catch (error) {
      console.error('Error downloading update:', error);
      // Silent failure - don't show alerts to users
    } finally {
      setIsDownloading(false);
    }
  };

  // Auto-check for updates on app start and periodically
  useEffect(() => {
    if (!__DEV__) {
      // Check for updates 5 seconds after app starts
      const initialTimer = setTimeout(() => {
        checkForUpdates();
      }, 5000);

      // Check for updates every 10 minutes
      const periodicTimer = setInterval(() => {
        checkForUpdates();
      }, 10 * 60 * 1000);

      return () => {
        clearTimeout(initialTimer);
        clearInterval(periodicTimer);
      };
    }
  }, []);

  return {
    checkForUpdates,
    downloadUpdate,
    isChecking,
    isDownloading,
  };
};
