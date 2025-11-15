import React from 'react';
import { Linking, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cyberpunkTheme } from '@/constants/theme';

type Props = {
  visible: boolean;
  latestVersion: string | null;
  currentVersion: string | null;
  storeUrl: string | null;
};

export default function ForceUpdateGate({ visible, latestVersion, currentVersion, storeUrl }: Props) {
  if (!visible) return null;

  return (
    <View className='absolute inset-0 z-50 items-center justify-center bg-gray-900'>
      <LinearGradient
        colors={cyberpunkTheme.colors.gradients.background as [string, string]}
        className='absolute inset-0'
      />
      <StatusBar barStyle='light-content' backgroundColor={cyberpunkTheme.colors.background.primary} />
      <View className='p-6 bg-gray-800 rounded-lg w-4/5 max-w-md'>
        <Text className='text-white text-2xl font-bold mb-3'>Update Required</Text>
        <Text className='text-gray-300 mb-4'>A newer version of the app is available.</Text>
        {currentVersion || latestVersion ? (
          <Text className='text-gray-400 mb-6'>Current: {currentVersion ?? '-'} • Latest: {latestVersion ?? '-'}</Text>
        ) : null}

        <TouchableOpacity
          className='bg-blue-500 p-3 rounded-md'
          onPress={() => {
            if (storeUrl) {
              Linking.openURL(storeUrl).catch(() => {});
            }
          }}
        >
          <Text className='text-white text-center font-medium'>Update on Play Store</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


