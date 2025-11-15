import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

interface ErrorModalProps {
  visible: boolean;
  title: string;
  message: string;
  type?: 'error' | 'success' | 'warning' | 'info';
  onClose: () => void;
  onRetry?: () => void;
  showRetry?: boolean;
}

const THEME = {
  colors: {
    primary: '#00FF94',
    background: '#080F12',
    surface: '#1A1A1A',
    text: '#FFFFFF',
    textSecondary: '#A3A3A3',
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
    info: '#3B82F6',
  },
  borderRadius: { md: 12, lg: 16 },
};

export default function ErrorModal({
  visible,
  title,
  message,
  type = 'error',
  onClose,
  onRetry,
  showRetry = false,
}: ErrorModalProps) {
  const getIconAndColor = () => {
    switch (type) {
      case 'success':
        return { icon: 'checkmark-circle', color: THEME.colors.success };
      case 'warning':
        return { icon: 'warning', color: THEME.colors.warning };
      case 'info':
        return { icon: 'information-circle', color: THEME.colors.info };
      default:
        return { icon: 'alert-circle', color: THEME.colors.error };
    }
  };

  const { icon, color } = getIconAndColor();

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleRetry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRetry?.();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <LinearGradient
          colors={['rgba(0, 0, 0, 0.8)', 'rgba(0, 0, 0, 0.9)']}
          style={styles.gradient}
        />
        
        <View style={styles.container}>
          <View style={styles.modal}>
            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
              <Ionicons name={icon as any} size={48} color={color} />
            </View>

            {/* Title */}
            <Text style={styles.title}>{title}</Text>

            {/* Message */}
            <Text style={styles.message}>{message}</Text>

            {/* Actions */}
            <View style={styles.actions}>
              {showRetry && onRetry && (
                <TouchableOpacity
                  style={[styles.button, styles.retryButton]}
                  onPress={handleRetry}
                >
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.button, styles.closeButton]}
                onPress={handleClose}
              >
                <Text style={styles.closeButtonText}>
                  {showRetry ? 'Cancel' : 'OK'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    width: width * 0.85,
    maxWidth: 400,
  },
  modal: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: THEME.colors.primary,
  },
  retryButtonText: {
    color: THEME.colors.background,
    fontWeight: '600',
    fontSize: 16,
  },
  closeButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: THEME.colors.textSecondary,
  },
  closeButtonText: {
    color: THEME.colors.text,
    fontWeight: '500',
    fontSize: 16,
  },
});
