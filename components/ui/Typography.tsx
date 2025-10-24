import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { typography } from '@/constants/typography';

interface TypographyProps extends TextProps {
  variant?: keyof typeof typography.textStyles;
  component?: keyof typeof typography.components;
  size?: keyof typeof typography.fontSize;
  weight?: keyof typeof typography.fontWeight;
  color?: string;
  align?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: keyof typeof typography.lineHeight;
  letterSpacing?: keyof typeof typography.letterSpacing;
}

export const Typography: React.FC<TypographyProps> = ({
  variant,
  component,
  size,
  weight,
  color,
  align,
  lineHeight,
  letterSpacing,
  style,
  children,
  ...props
}) => {
  const getTextStyle = () => {
    let textStyle: any = {};

    // Use variant if provided
    if (variant) {
      textStyle = { ...typography.textStyles[variant] };
    }
    // Use component if provided
    else if (component) {
      textStyle = { ...typography.components[component] };
    }
    // Use individual properties if provided
    else {
      if (size) textStyle.fontSize = typography.fontSize[size];
      if (weight) textStyle.fontWeight = typography.fontWeight[weight];
      if (lineHeight) textStyle.lineHeight = typography.lineHeight[lineHeight];
      if (letterSpacing) textStyle.letterSpacing = typography.letterSpacing[letterSpacing];
    }

    // Override with custom properties
    if (color) textStyle.color = color;
    if (align) textStyle.textAlign = align;

    return textStyle;
  };

  return (
    <Text style={[getTextStyle(), style]} {...props}>
      {children}
    </Text>
  );
};

// Predefined text components for common use cases
export const Heading1: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h1" {...props} />
);

export const Heading2: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h2" {...props} />
);

export const Heading3: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h3" {...props} />
);

export const Heading4: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h4" {...props} />
);

export const Heading5: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h5" {...props} />
);

export const Heading6: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h6" {...props} />
);

export const Body: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="body" {...props} />
);

export const BodyLarge: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="bodyLarge" {...props} />
);

export const BodySmall: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="bodySmall" {...props} />
);

export const Caption: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="caption" {...props} />
);

export const Label: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="label" {...props} />
);

export const Button: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="button" {...props} />
);

export const ButtonSmall: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="buttonSmall" {...props} />
);

export const Subtitle: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="subtitle" {...props} />
);

export const Overline: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="overline" {...props} />
);

// Component-specific text components
export const TabLabel: React.FC<Omit<TypographyProps, 'component'>> = (props) => (
  <Typography component="tabLabel" {...props} />
);

export const HeaderTitle: React.FC<Omit<TypographyProps, 'component'>> = (props) => (
  <Typography component="headerTitle" {...props} />
);

export const CardTitle: React.FC<Omit<TypographyProps, 'component'>> = (props) => (
  <Typography component="cardTitle" {...props} />
);

export const CardDescription: React.FC<Omit<TypographyProps, 'component'>> = (props) => (
  <Typography component="cardDescription" {...props} />
);

export const CardMeta: React.FC<Omit<TypographyProps, 'component'>> = (props) => (
  <Typography component="cardMeta" {...props} />
);

export const InputLabel: React.FC<Omit<TypographyProps, 'component'>> = (props) => (
  <Typography component="inputLabel" {...props} />
);

export const InputError: React.FC<Omit<TypographyProps, 'component'>> = (props) => (
  <Typography component="inputError" {...props} />
);

export const PrimaryButton: React.FC<Omit<TypographyProps, 'component'>> = (props) => (
  <Typography component="primaryButton" {...props} />
);

export const SecondaryButton: React.FC<Omit<TypographyProps, 'component'>> = (props) => (
  <Typography component="secondaryButton" {...props} />
);

export const LinkButton: React.FC<Omit<TypographyProps, 'component'>> = (props) => (
  <Typography component="linkButton" {...props} />
);

export const SuccessText: React.FC<Omit<TypographyProps, 'component'>> = (props) => (
  <Typography component="success" {...props} />
);

export const ErrorText: React.FC<Omit<TypographyProps, 'component'>> = (props) => (
  <Typography component="error" {...props} />
);

export const WarningText: React.FC<Omit<TypographyProps, 'component'>> = (props) => (
  <Typography component="warning" {...props} />
);

export default Typography;
