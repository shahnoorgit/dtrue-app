import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useOffline } from '@/contexts/OfflineContext';
import { cyberpunkTheme } from '@/constants/theme';

export default function OfflineTest() {
  const { networkStatus, saveUserAction, clearOfflineData } = useOffline();

  const handleTestAction = () => {
    saveUserAction({
      type: 'interaction',
      data: { action: 'test_button_pressed', timestamp: Date.now() },
      screen: 'test',
    });
  };

  const handleClearData = () => {
    clearOfflineData();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Offline Test Panel</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Network Status:</Text>
        <Text style={[
          styles.statusValue,
          { color: networkStatus.isOffline ? '#FF4757' : '#00FF94' }
        ]}>
          {networkStatus.isOffline ? 'Offline' : 'Online'}
        </Text>
      </View>

      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Connection Type:</Text>
        <Text style={styles.statusValue}>{networkStatus.type || 'Unknown'}</Text>
      </View>

      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Internet Reachable:</Text>
        <Text style={styles.statusValue}>
          {networkStatus.isInternetReachable === null 
            ? 'Unknown' 
            : networkStatus.isInternetReachable ? 'Yes' : 'No'
          }
        </Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleTestAction}>
        <Text style={styles.buttonText}>Test Offline Action</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={handleClearData}>
        <Text style={styles.buttonText}>Clear Offline Data</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLabel: {
    color: '#8F9BB3',
    fontSize: 14,
  },
  statusValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    backgroundColor: cyberpunkTheme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  clearButton: {
    backgroundColor: '#FF4757',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
