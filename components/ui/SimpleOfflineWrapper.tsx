import React from 'react';
import { View } from 'react-native';
import { useSimpleNetworkStatus } from '@/hook/useSimpleNetworkStatus';
import OfflinePopup from './OfflinePopup';

interface SimpleOfflineWrapperProps {
  children: React.ReactNode;
}

export default function SimpleOfflineWrapper({ children }: SimpleOfflineWrapperProps) {
  const { networkStatus } = useSimpleNetworkStatus();

  return (
    <View style={{ flex: 1 }}>
      {children}
      <OfflinePopup isVisible={networkStatus.isOffline} />
    </View>
  );
}
