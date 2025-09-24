# Offline Functionality Implementation

This document describes the offline functionality implemented in the Dtrue debate app.

## Overview

The offline functionality provides:
- Network status detection
- Offline screen display when network is unavailable
- State persistence and restoration when back online
- User action tracking while offline
- Cached data management

## Components

### 1. Network Status Hook (`hook/useNetworkStatus.tsx`)

Main hook for network status management:

```typescript
const {
  networkStatus,
  isReconnecting,
  offlineData,
  saveOfflineState,
  saveUserAction,
  getOfflineData,
  clearOfflineData,
  hasOfflineData,
} = useNetworkStatus();
```

**Features:**
- Real-time network status monitoring
- Offline state persistence
- User action tracking
- Automatic reconnection handling

### 2. Offline Screen (`components/ui/OfflineScreen.tsx`)

Beautiful offline screen with:
- Animated icons and transitions
- Connection status indicators
- Last screen information
- Retry functionality
- User tips and guidance

### 3. Offline Wrapper (`components/ui/OfflineWrapper.tsx`)

Main wrapper component that:
- Wraps the entire app
- Handles offline/online transitions
- Manages state restoration
- Tracks user actions while offline

### 4. Offline Context (`contexts/OfflineContext.tsx`)

React context for sharing offline state across components:

```typescript
const { networkStatus, saveUserAction } = useOffline();
```

### 5. Offline Indicator (`components/ui/OfflineIndicator.tsx`)

Small indicator component for showing network status:
- Slides in/out animations
- Color-coded status
- Minimal UI impact

### 6. Offline Data Manager (`hook/useOfflineData.tsx`)

Utility hook for managing offline data:
- Screen data persistence
- Data retrieval and clearing
- Last screen tracking

## Usage

### Basic Implementation

The offline functionality is automatically enabled by wrapping your app with the `OfflineWrapper`:

```tsx
// In your main layout
<OfflineWrapper>
  <YourAppContent />
</OfflineWrapper>
```

### Using Offline Context

Access offline functionality in any component:

```tsx
import { useOffline } from '@/contexts/OfflineContext';

function MyComponent() {
  const { networkStatus, saveUserAction } = useOffline();
  
  const handleAction = () => {
    if (networkStatus.isOffline) {
      saveUserAction({
        type: 'interaction',
        data: { action: 'button_pressed' },
        screen: 'my_screen',
      });
    }
  };
}
```

### Network-Aware API Calls

Modify your API calls to respect offline status:

```tsx
const fetchData = async () => {
  if (networkStatus.isOffline) {
    console.log('Offline: Skipping API call');
    return;
  }
  
  try {
    const response = await api.getData();
    // Handle response
  } catch (error) {
    if (error.code === 'NETWORK_ERROR') {
      saveUserAction({
        type: 'interaction',
        data: { action: 'api_call_failed' },
        screen: 'current_screen',
      });
    }
  }
};
```

## Features

### 1. Automatic State Persistence

When the user goes offline:
- Current screen state is automatically saved
- User interactions are tracked
- Data is cached locally

### 2. Smart Restoration

When back online:
- User is shown a "Welcome Back" message
- Last screen is automatically restored
- Cached data is used to maintain continuity

### 3. User Action Tracking

While offline, user actions are tracked:
- Navigation events
- Button presses
- Form interactions
- Data changes

### 4. Visual Feedback

- Offline screen with clear messaging
- Status indicators
- Smooth animations
- Reconnection feedback

## Configuration

### Storage Keys

The following AsyncStorage keys are used:
- `offline_data`: Main offline state
- `user_actions`: Tracked user actions
- `last_screen`: Last visited screen
- `screen_data_*`: Screen-specific cached data

### Network Detection

Uses `@react-native-community/netinfo` for:
- Connection status
- Internet reachability
- Connection type detection
- Real-time updates

## Testing

### Manual Testing

1. **Go Offline**: Turn off WiFi/mobile data
2. **Verify**: Offline screen appears
3. **Interact**: Try using the app (actions are tracked)
4. **Go Online**: Restore network connection
5. **Verify**: App returns to previous state

### Test Component

Use the `OfflineTest` component for debugging:

```tsx
import OfflineTest from '@/components/ui/OfflineTest';

// Add to your screen for testing
<OfflineTest />
```

## Best Practices

### 1. API Calls
Always check network status before making API calls:

```tsx
if (!networkStatus.isOffline) {
  await fetchData();
}
```

### 2. User Actions
Track important user actions while offline:

```tsx
const handleImportantAction = () => {
  saveUserAction({
    type: 'interaction',
    data: { action: 'important_action', value: formData },
    screen: 'form_screen',
  });
};
```

### 3. Data Caching
Cache important data for offline use:

```tsx
const { saveScreenData } = useOfflineData();

// Save screen data when going offline
await saveScreenData('feed', { debates, cursor, hasNextPage });
```

## Troubleshooting

### Common Issues

1. **Offline screen not showing**: Check if `OfflineWrapper` is properly wrapping your app
2. **State not restoring**: Verify AsyncStorage permissions and data format
3. **Network detection issues**: Ensure `@react-native-community/netinfo` is properly installed

### Debug Information

Enable debug logging:

```tsx
// In your app initialization
console.log('Network Status:', networkStatus);
console.log('Offline Data:', offlineData);
```

## Dependencies

- `@react-native-community/netinfo`: Network status detection
- `@react-native-async-storage/async-storage`: Data persistence
- `expo-linear-gradient`: UI gradients
- `react-native-vector-icons`: Icons

## Future Enhancements

- Background sync when back online
- Conflict resolution for offline changes
- Offline queue management
- Advanced caching strategies
- Push notification handling
