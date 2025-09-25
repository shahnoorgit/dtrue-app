import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export interface SimpleNetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string | null;
  isOffline: boolean;
}

export const useSimpleNetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState<SimpleNetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    type: null,
    isOffline: false,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const isOffline = !state.isConnected || state.isInternetReachable === false;
      
      setNetworkStatus({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? false,
        type: state.type,
        isOffline,
      });
    });

    return () => unsubscribe();
  }, []);

  return {
    networkStatus,
  };
};
