import { typography } from './typography';

// Cyberpunk theme configuration with Instagram-inspired typography
export const cyberpunkTheme = {
  colors: {
    primary: "#00FF94",
    primaryDark: "#02C39A",
    secondary: "#FF00E5",
    accent: "#FFC700",
    background: {
      dark: "#080F12",
      darker: "#03120F",
    },
    text: {
      light: "#E0F0EA",
      muted: "#8F9BB3",
      accent: "#00FF94",
    },
    gradients: {
      primary: ["#00FF94", "#02C39A"],
      secondary: ["#FF00E5", "#B100FF"],
      accent: ["#FFC700", "#FF9500"],
      background: ["rgba(8, 15, 18, 0.97)", "rgba(3, 18, 17, 0.98)"],
      darkGlass: ["rgba(8, 15, 18, 0.85)", "rgba(3, 18, 17, 0.9)"],
    },
    overlay: {
      dark: "rgba(3, 18, 17, 0.8)",
      light: "rgba(0, 255, 148, 0.1)",
    },
  },
  shadows: {
    glow: {
      shadowColor: "#00FF94",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 8,
    },
    subtle: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
  },
  // Enhanced typography system
  typography: {
    ...typography,
    // Keep existing cyberpunk-specific typography
    headings: {
      fontWeight: "bold",
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
  // New border settings
  borders: {
    glowing: {
      borderColor: "rgba(0, 255, 148, 0.4)",
      borderWidth: 1,
    },
    subtle: {
      borderColor: "rgba(0, 255, 148, 0.2)",
      borderWidth: 1,
    },
  },
};
