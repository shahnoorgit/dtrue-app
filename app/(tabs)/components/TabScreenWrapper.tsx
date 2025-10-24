import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TabScreenWrapperProps {
  children: React.ReactNode;
  style?: any;
}

const TabScreenWrapper: React.FC<TabScreenWrapperProps> = ({ children, style }) => {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  
  // Calculate the tab bar height (70px) plus safe area bottom
  const tabBarHeight = 70;
  const bottomPadding = tabBarHeight + insets.bottom;

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080F12', // Match the app background
  },
});

export default TabScreenWrapper;
