/** @type {import('tailwindcss').Config} */
/**
 * Tailwind Configuration - Synced with Unified Cyberpunk Theme
 * 
 * This configuration mirrors the colors and values from constants/theme.ts
 * to ensure consistency across the application when using NativeWind.
 */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Primary Brand Colors
        primary: {
          DEFAULT: "#00FF94",
          dark: "#02C39A",
          light: "#33FFB0",
        },
        
        // Secondary & Accent Colors
        secondary: {
          DEFAULT: "#FF00E5",
          dark: "#B100FF",
        },
        accent: {
          DEFAULT: "#FFC700",
          dark: "#FF9500",
        },
        
        // Background Colors
        background: {
          DEFAULT: "#080F12",
          primary: "#080F12",
          secondary: "#03120F",
          tertiary: "#1A1A1A",
          surface: "#262626",
          elevated: "#333333",
        },
        
        // Text Colors
        text: {
          DEFAULT: "#FFFFFF",
          primary: "#FFFFFF",
          secondary: "#E0F0EA",
          tertiary: "#A3A3A3",
          muted: "#9CA3AB",
          disabled: "#6B7280",
          accent: "#00FF94",
          inverse: "#0A1115",
        },
        
        // Border Colors
        border: {
          DEFAULT: "#404040",
          primary: "#404040",
          secondary: "rgba(255, 255, 255, 0.1)",
          focus: "rgba(0, 255, 148, 0.4)",
          subtle: "rgba(0, 255, 148, 0.2)",
          elevated: "rgba(255, 255, 255, 0.08)",
        },
        
        // Semantic Colors
        success: {
          DEFAULT: "#10B981",
          light: "#34D399",
        },
        error: {
          DEFAULT: "#FF4757",
          light: "#FF6B7A",
        },
        warning: {
          DEFAULT: "#FFC700",
          light: "#FFD633",
        },
        info: {
          DEFAULT: "#3B82F6",
          light: "#60A5FA",
        },
      },
      
      // Spacing Scale
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        xxl: "48px",
      },
      
      // Border Radius Scale
      borderRadius: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
      },
    },
  },
  plugins: [],
};