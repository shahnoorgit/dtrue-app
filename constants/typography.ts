// Instagram-inspired typography system
export const typography = {
  // Font families (Instagram uses system fonts)
  fontFamily: {
    // Primary font (Instagram uses SF Pro on iOS, Roboto on Android)
    primary: 'System', // Will use platform default
    // Fallback fonts
    secondary: 'Helvetica Neue',
    mono: 'Menlo',
  },

  // Font sizes (Instagram's scale)
  fontSize: {
    xs: 12,      // Small labels, captions
    sm: 14,      // Body text, descriptions
    base: 16,    // Primary body text
    lg: 18,      // Large body text
    xl: 20,      // Small headings
    '2xl': 24,   // Medium headings
    '3xl': 28,   // Large headings
    '4xl': 32,   // Extra large headings
    '5xl': 36,   // Hero text
  },

  // Font weights (Instagram's weight scale)
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    heavy: '800',
  },

  // Line heights (Instagram's spacing)
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
    loose: 1.8,
  },

  // Letter spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
  },

  // Text styles (Instagram's component styles)
  textStyles: {
    // Headings
    h1: {
      fontSize: 32,
      fontWeight: '700',
      lineHeight: 1.2,
      letterSpacing: -0.5,
    },
    h2: {
      fontSize: 28,
      fontWeight: '600',
      lineHeight: 1.3,
      letterSpacing: -0.3,
    },
    h3: {
      fontSize: 24,
      fontWeight: '600',
      lineHeight: 1.3,
      letterSpacing: -0.2,
    },
    h4: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 1.4,
      letterSpacing: 0,
    },
    h5: {
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 1.4,
      letterSpacing: 0,
    },
    h6: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 1.4,
      letterSpacing: 0,
    },

    // Body text
    body: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 1.5,
      letterSpacing: 0,
    },
    bodyLarge: {
      fontSize: 18,
      fontWeight: '400',
      lineHeight: 1.5,
      letterSpacing: 0,
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 1.4,
      letterSpacing: 0,
    },

    // UI text
    button: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 1.2,
      letterSpacing: 0.2,
    },
    buttonSmall: {
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 1.2,
      letterSpacing: 0.2,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 1.3,
      letterSpacing: 0.1,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 1.3,
      letterSpacing: 0.1,
    },

    // Special text
    overline: {
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 1.2,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    subtitle: {
      fontSize: 16,
      fontWeight: '500',
      lineHeight: 1.4,
      letterSpacing: 0,
    },
  },

  // Component-specific styles
  components: {
    // Navigation
    tabLabel: {
      fontSize: 12,
      fontWeight: '500',
      lineHeight: 1.2,
      letterSpacing: 0.1,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 1.2,
      letterSpacing: -0.2,
    },

    // Cards
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 1.3,
      letterSpacing: 0,
    },
    cardDescription: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 1.4,
      letterSpacing: 0,
    },
    cardMeta: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 1.3,
      letterSpacing: 0.1,
    },

    // Forms
    input: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 1.4,
      letterSpacing: 0,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 1.3,
      letterSpacing: 0.1,
    },
    inputError: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 1.3,
      letterSpacing: 0,
    },

    // Buttons
    primaryButton: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 1.2,
      letterSpacing: 0.2,
    },
    secondaryButton: {
      fontSize: 16,
      fontWeight: '500',
      lineHeight: 1.2,
      letterSpacing: 0.1,
    },
    linkButton: {
      fontSize: 16,
      fontWeight: '500',
      lineHeight: 1.2,
      letterSpacing: 0,
    },

    // Status
    success: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 1.3,
      letterSpacing: 0,
    },
    error: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 1.3,
      letterSpacing: 0,
    },
    warning: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 1.3,
      letterSpacing: 0,
    },
  },
};

// Helper function to get text style
export const getTextStyle = (style: keyof typeof typography.textStyles) => {
  return typography.textStyles[style];
};

// Helper function to get component style
export const getComponentStyle = (component: keyof typeof typography.components) => {
  return typography.components[component];
};

// Helper function to create custom text style
export const createTextStyle = (
  fontSize: number,
  fontWeight: string,
  lineHeight?: number,
  letterSpacing?: number
) => ({
  fontSize,
  fontWeight,
  lineHeight: lineHeight || 1.4,
  letterSpacing: letterSpacing || 0,
});
