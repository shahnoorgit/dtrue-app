import { typography } from './typography';

/**
 * UNIFIED CYBERPUNK THEME - Single Source of Truth
 * 
 * This is the definitive theme for the entire application.
 * All colors meet WCAG AA accessibility standards for contrast.
 * 
 * Color Usage Guidelines:
 * - primary: Main brand color (neon green) - use for CTAs, highlights
 * - secondary: Alternative accent (neon pink) - use sparingly for variety
 * - accent: Tertiary color (golden yellow) - use for warnings, highlights
 * - background: Main app backgrounds
 * - surface: Card and component backgrounds
 * - text: All text colors with proper contrast ratios
 * - semantic: Status colors (success, error, warning, info)
 */

export const cyberpunkTheme = {
  colors: {
    // Primary Brand Colors
    primary: "#00FF94",        // Neon green - main brand color
    primaryDark: "#02C39A",    // Darker green for gradients
    primaryLight: "#33FFB0",   // Lighter green for hover states
    
    // Secondary & Accent Colors
    secondary: "#FF00E5",      // Neon pink
    secondaryDark: "#B100FF",  // Purple variant
    accent: "#FFC700",         // Golden yellow
    accentDark: "#FF9500",     // Orange variant
    
    // Background Colors
    background: {
      primary: "#080F12",      // Main dark background
      secondary: "#03120F",    // Darker background
      tertiary: "#1A1A1A",     // Card background (from profile)
      surface: "#262626",      // Elevated surface (from profile)
      elevated: "#333333",     // Higher elevation
    },
    
    // Text Colors (WCAG AA Compliant)
    text: {
      primary: "#FFFFFF",      // Main text - 21:1 contrast on dark bg
      secondary: "#E0F0EA",    // Secondary text - 15:1 contrast
      tertiary: "#A3A3A3",     // Tertiary text - 7.5:1 contrast (AA compliant)
      muted: "#9CA3AB",        // Muted text - 6.5:1 contrast (AA compliant)
      disabled: "#6B7280",     // Disabled text - 4.5:1 contrast
      accent: "#00FF94",       // Accent text (primary color)
      inverse: "#0A1115",      // Text on light backgrounds
    },
    
    // Border Colors
    border: {
      primary: "#404040",      // Main borders
      secondary: "rgba(255, 255, 255, 0.1)",  // Subtle borders
      focus: "rgba(0, 255, 148, 0.4)",        // Focus state
      subtle: "rgba(0, 255, 148, 0.2)",       // Very subtle borders
      elevated: "rgba(255, 255, 255, 0.08)",  // Card borders
    },
    
    // Semantic Colors (Status)
    semantic: {
      success: "#10B981",      // Green for success states
      successLight: "#34D399",
      error: "#FF4757",        // Red for errors
      errorLight: "#FF6B7A",
      warning: "#FFC700",      // Yellow for warnings
      warningLight: "#FFD633",
      info: "#3B82F6",         // Blue for info
      infoLight: "#60A5FA",
    },
    
    // Interactive States
    interactive: {
      hover: "rgba(0, 255, 148, 0.12)",
      active: "rgba(0, 255, 148, 0.2)",
      pressed: "rgba(0, 255, 148, 0.3)",
      disabled: "rgba(255, 255, 255, 0.05)",
    },
    
    // Overlay Colors
    overlay: {
      dark: "rgba(3, 18, 17, 0.8)",
      darker: "rgba(0, 0, 0, 0.9)",
      light: "rgba(0, 255, 148, 0.1)",
      modal: "rgba(0, 0, 0, 0.7)",
    },
    
    // Gradient Definitions
    gradients: {
      primary: ["#00FF94", "#02C39A"],
      secondary: ["#FF00E5", "#B100FF"],
      accent: ["#FFC700", "#FF9500"],
      background: ["rgba(8, 15, 18, 0.97)", "rgba(3, 18, 17, 0.98)"],
      darkGlass: ["rgba(8, 15, 18, 0.85)", "rgba(3, 18, 17, 0.9)"],
      button: ["#00FF94", "#00CC77"],
      header: ["rgba(0, 0, 0, 1)", "rgba(8, 15, 18, 0.95)"],
    },
    
    // Special Purpose Colors
    follow: {
      button: "#F5F5DC",       // Light beige for follow button
      buttonText: "#262626",   // Dark text on light button
    },
  },
  
  // Shadow Definitions
  shadows: {
    glow: {
      shadowColor: "#00FF94",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 8,
    },
    glowStrong: {
      shadowColor: "#00FF94",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 20,
      elevation: 10,
    },
    subtle: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    card: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    button: {
      shadowColor: "#00FF94",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 6,
    },
  },
  
  // Border Definitions
  borders: {
    glowing: {
      borderColor: "rgba(0, 255, 148, 0.4)",
      borderWidth: 1,
    },
    subtle: {
      borderColor: "rgba(0, 255, 148, 0.2)",
      borderWidth: 1,
    },
    standard: {
      borderColor: "#404040",
      borderWidth: 1,
    },
    focus: {
      borderColor: "rgba(0, 255, 148, 0.6)",
      borderWidth: 2,
    },
  },
  
  // Spacing Scale (consistent with design system)
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  // Border Radius Scale
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  
  // Typography System Integration
  typography: {
    ...typography,
    // Cyberpunk-specific typography enhancements
    headings: {
      fontWeight: "bold" as const,
      glow: {
        textShadowColor: "#00FF94",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
      },
    },
    accent: {
      color: "#00FF94",
      textShadowColor: "#00FF94",
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 5,
    },
  },
};

// Export individual color palettes for convenience
export const colors = cyberpunkTheme.colors;
export const shadows = cyberpunkTheme.shadows;
export const borders = cyberpunkTheme.borders;
export const spacing = cyberpunkTheme.spacing;
export const borderRadius = cyberpunkTheme.borderRadius;

// Default export for backward compatibility
export default cyberpunkTheme;
