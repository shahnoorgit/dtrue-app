/**
 * Responsive utility functions for adaptive UI sizing
 * Helps ensure UI elements scale appropriately across different screen sizes
 */

import { Dimensions, PixelRatio } from 'react-native';

// Base dimensions (iPhone 13 Pro as reference)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

/**
 * Get current screen dimensions
 */
export const getScreenDimensions = () => {
  const { width, height } = Dimensions.get('window');
  return { width, height };
};

/**
 * Scale a value based on screen width
 * @param size - The size to scale
 * @param factor - Optional scaling factor (default: 1)
 */
export const scaleWidth = (size: number, factor: number = 1): number => {
  const { width } = getScreenDimensions();
  const scale = width / BASE_WIDTH;
  return Math.round(PixelRatio.roundToNearestPixel(size * scale * factor));
};

/**
 * Scale a value based on screen height
 * @param size - The size to scale
 * @param factor - Optional scaling factor (default: 1)
 */
export const scaleHeight = (size: number, factor: number = 1): number => {
  const { height } = getScreenDimensions();
  const scale = height / BASE_HEIGHT;
  return Math.round(PixelRatio.roundToNearestPixel(size * scale * factor));
};

/**
 * Scale font size based on screen width with min/max constraints
 * @param size - Base font size
 * @param minSize - Minimum font size (default: size * 0.8)
 * @param maxSize - Maximum font size (default: size * 1.2)
 */
export const scaleFontSize = (
  size: number,
  minSize?: number,
  maxSize?: number
): number => {
  const { width } = getScreenDimensions();
  const scale = width / BASE_WIDTH;
  const scaledSize = size * scale;
  
  const min = minSize ?? size * 0.8;
  const max = maxSize ?? size * 1.2;
  
  return Math.round(Math.max(min, Math.min(max, scaledSize)));
};

/**
 * Get responsive padding based on screen width
 * @param base - Base padding value
 */
export const getResponsivePadding = (base: number = 24): number => {
  const { width } = getScreenDimensions();
  
  if (width < 375) return Math.max(12, base * 0.67); // Small phones
  if (width < 414) return Math.max(16, base * 0.83); // Medium phones
  if (width > 768) return base * 1.5; // Tablets
  
  return base; // Standard phones
};

/**
 * Get responsive margin based on screen width
 * @param base - Base margin value
 */
export const getResponsiveMargin = (base: number = 16): number => {
  const { width } = getScreenDimensions();
  
  if (width < 375) return Math.max(8, base * 0.67); // Small phones
  if (width < 414) return Math.max(12, base * 0.83); // Medium phones
  if (width > 768) return base * 1.5; // Tablets
  
  return base; // Standard phones
};

/**
 * Get responsive card width with constraints
 * @param marginHorizontal - Horizontal margin to subtract
 */
export const getResponsiveCardWidth = (marginHorizontal: number = 24): number => {
  const { width } = getScreenDimensions();
  const cardWidth = width - marginHorizontal;
  
  // Ensure minimum and maximum widths
  return Math.max(280, Math.min(cardWidth, 600));
};

/**
 * Get responsive modal max width
 */
export const getResponsiveModalMaxWidth = (): number => {
  const { width } = getScreenDimensions();
  
  if (width < 375) return width - 32; // Small phones: less margin
  if (width > 768) return 480; // Tablets: fixed max width
  
  return Math.min(width - 48, 400); // Standard phones
};

/**
 * Check if screen is small (iPhone SE size or smaller)
 */
export const isSmallScreen = (): boolean => {
  const { width, height } = getScreenDimensions();
  return width <= 375 || height <= 667;
};

/**
 * Check if screen is tablet size
 */
export const isTablet = (): boolean => {
  const { width } = getScreenDimensions();
  return width >= 768;
};

/**
 * Get minimum touch target size (44x44 for accessibility)
 */
export const MIN_TOUCH_TARGET = 44;

/**
 * Get responsive button height
 * @param base - Base button height
 */
export const getResponsiveButtonHeight = (base: number = 48): number => {
  return Math.max(MIN_TOUCH_TARGET, base);
};

/**
 * Get responsive icon size
 * @param base - Base icon size
 */
export const getResponsiveIconSize = (base: number = 24): number => {
  const { width } = getScreenDimensions();
  
  if (width < 375) return Math.max(20, base * 0.83);
  if (width > 768) return base * 1.2;
  
  return base;
};

/**
 * Get responsive line height for text
 * @param fontSize - Font size
 * @param multiplier - Line height multiplier (default: 1.5)
 */
export const getResponsiveLineHeight = (
  fontSize: number,
  multiplier: number = 1.5
): number => {
  return Math.round(fontSize * multiplier);
};

/**
 * Calculate responsive modal height (percentage of screen)
 * @param percentage - Percentage of screen height (0-1)
 * @param minHeight - Minimum height
 * @param maxHeight - Maximum height
 */
export const getResponsiveModalHeight = (
  percentage: number = 0.7,
  minHeight: number = 300,
  maxHeight?: number
): number => {
  const { height } = getScreenDimensions();
  const calculatedHeight = height * percentage;
  
  const max = maxHeight ?? height - 100;
  return Math.max(minHeight, Math.min(calculatedHeight, max));
};

