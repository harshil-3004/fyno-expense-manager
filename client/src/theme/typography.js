import { Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    heading: 'Manrope_700Bold',
    headingMedium: 'Manrope_600SemiBold',
  },
  android: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    heading: 'Manrope_700Bold',
    headingMedium: 'Manrope_600SemiBold',
  },
  default: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    heading: 'Manrope_700Bold',
    headingMedium: 'Manrope_600SemiBold',
  },
});

const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
};

const lineHeight = {
  xs: 16,
  sm: 18,
  md: 22,
  base: 24,
  lg: 26,
  xl: 28,
  '2xl': 32,
  '3xl': 38,
  '4xl': 44,
  '5xl': 56,
};

const typography = {
  h1: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize['3xl'],
    lineHeight: lineHeight['3xl'],
  },
  h2: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight['2xl'],
  },
  h3: {
    fontFamily: fontFamily.headingMedium,
    fontSize: fontSize.xl,
    lineHeight: lineHeight.xl,
  },
  h4: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
  },
  bodyMedium: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
  },
  bodySemiBold: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
  },
  bodySmall: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
  },
  captionMedium: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
  },
  button: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
  },
  amount: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['4xl'],
    lineHeight: lineHeight['4xl'],
  },
  amountLarge: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['5xl'],
    lineHeight: lineHeight['5xl'],
  },
};

export { fontFamily, fontSize, lineHeight, typography };
export default typography;
