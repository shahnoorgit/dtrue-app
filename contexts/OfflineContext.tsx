import React, { createContext, useContext, ReactNode } from 'react';
import { useNetworkStatus } from '@/hook/useNetworkStatus';

interface OfflineContextType {
  networkStatus: ReturnType<typeof useNetworkStatus>['networkStatus'];
  isReconnecting: boolean;
  offlineData: ReturnType<typeof useNetworkStatus>['offlineData'];
  saveOfflineState: ReturnType<typeof useNetworkStatus>['saveOfflineState'];
  saveUserAction: ReturnType<typeof useNetworkStatus>['saveUserAction'];
  getOfflineData: ReturnType<typeof useNetworkStatus>['getOfflineData'];
  clearOfflineData: ReturnType<typeof useNetworkStatus>['clearOfflineData'];
  hasOfflineData: ReturnType<typeof useNetworkStatus>['hasOfflineData'];
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

interface OfflineProviderProps {
  children: ReactNode;
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  const networkStatusHook = useNetworkStatus();

  return (
    <OfflineContext.Provider value={networkStatusHook}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}
