import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cyberpunkTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface MenuOption {
  id: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
}

interface ThreeDotsMenuProps {
  options: MenuOption[];
  disabled?: boolean;
}

const { width } = Dimensions.get('window');

export default function ThreeDotsMenu({ options, disabled = false }: ThreeDotsMenuProps) {
  const [visible, setVisible] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(0));
  const [opacityAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  const showMenu = () => {
    if (disabled) return;
    setVisible(true);
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideMenu = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
    });
  };

  const handleOptionPress = (option: MenuOption) => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    hideMenu();
    setTimeout(() => {
      option.onPress();
    }, 150);
  };

  return (
    <>
      <TouchableOpacity
        onPress={showMenu}
        disabled={disabled}
        style={{
          padding: 8,
          borderRadius: 20,
          opacity: disabled ? 0.5 : 1,
        }}
        activeOpacity={0.7}
      >
        <Ionicons
          name="ellipsis-horizontal"
          size={20}
          color={disabled ? cyberpunkTheme.colors.text.muted : cyberpunkTheme.colors.text.light}
        />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={hideMenu}
        statusBarTranslucent
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: cyberpunkTheme.colors.overlay.dark,
            opacity: opacityAnim,
          }}
        >
          <TouchableWithoutFeedback onPress={hideMenu}>
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>
          
          <Animated.View
            style={{
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim }
              ],
              alignSelf: 'center',
              marginHorizontal: 20,
              marginBottom: 50,
            }}
          >
            <View
              style={{
                backgroundColor: cyberpunkTheme.colors.background.dark,
                borderRadius: 16,
                minWidth: 200,
                maxWidth: width * 0.8,
                ...cyberpunkTheme.shadows.glow,
                borderWidth: 1,
                borderColor: cyberpunkTheme.colors.primary + '40',
              }}
            >
              <LinearGradient
                colors={cyberpunkTheme.colors.gradients.darkGlass as [string, string]}
                style={{
                  borderRadius: 16,
                  overflow: 'hidden',
                }}
              >
                {options.map((option, index) => (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => handleOptionPress(option)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 20,
                      paddingVertical: 16,
                      borderBottomWidth: index < options.length - 1 ? 1 : 0,
                      borderBottomColor: cyberpunkTheme.colors.primary + '20',
                    }}
                    activeOpacity={0.7}
                  >
                    {option.icon && (
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: option.destructive 
                            ? cyberpunkTheme.colors.secondary + '20'
                            : cyberpunkTheme.colors.overlay.light,
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: 16,
                        }}
                      >
                        <Ionicons
                          name={option.icon}
                          size={18}
                          color={option.destructive ? cyberpunkTheme.colors.secondary : cyberpunkTheme.colors.primary}
                        />
                      </View>
                    )}
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: option.destructive ? cyberpunkTheme.colors.secondary : cyberpunkTheme.colors.text.light,
                        flex: 1,
                      }}
                    >
                      {option.label}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={option.destructive ? cyberpunkTheme.colors.secondary : cyberpunkTheme.colors.text.muted}
                    />
                  </TouchableOpacity>
                ))}
              </LinearGradient>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}
