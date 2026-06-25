import React, { useRef, useState } from 'react';
import { View, Text, FlatList, Dimensions, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../../theme';
import { useDispatch } from 'react-redux';
import { setOnboarded } from '../../redux/slices/authSlice';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    emoji: '🧘',
    title: 'Track Less',
    description: 'Let Fyno organize your financial life.\nNo spreadsheets. No stress.',
  },
  {
    id: '2',
    emoji: '💡',
    title: 'Understand More',
    description: 'See clear insights without\ncomplicated reports.',
  },
  {
    id: '3',
    emoji: '🧠',
    title: 'Remember Everything',
    description: 'Fyno is your financial memory.\nYou live your life. Fyno remembers your money.',
  },
];

const OnboardingScreen = () => {
  const { colors, spacing, typography, fontSize, borderRadius } = useTheme();
  const dispatch = useDispatch();
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      dispatch(setOnboarded());
    }
  };

  const handleSkip = () => {
    dispatch(setOnboarded());
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const renderSlide = ({ item }) => (
    <View style={[styles.slide, { width }]}>
      <Text style={{ fontSize: 80, marginBottom: spacing['2xl'] }}>{item.emoji}</Text>
      <Text
        style={{
          fontFamily: typography.h1.fontFamily,
          fontSize: fontSize['3xl'],
          color: colors.textPrimary,
          textAlign: 'center',
          marginBottom: spacing.base,
        }}
      >
        {item.title}
      </Text>
      <Text
        style={{
          fontFamily: typography.body.fontFamily,
          fontSize: fontSize.lg,
          color: colors.textSecondary,
          textAlign: 'center',
          lineHeight: 28,
          paddingHorizontal: spacing['3xl'],
        }}
      >
        {item.description}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Skip button */}
      <Pressable onPress={handleSkip} style={[styles.skip, { top: spacing['4xl'], right: spacing.xl }]}>
        <Text
          style={{
            fontFamily: typography.bodyMedium.fontFamily,
            fontSize: fontSize.md,
            color: colors.textMuted,
          }}
        >
          Skip
        </Text>
      </Pressable>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
      />

      {/* Dots */}
      <View style={styles.dots}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor: index === currentIndex ? colors.accent : colors.border,
                width: index === currentIndex ? 24 : 8,
                borderRadius: 4,
              },
            ]}
          />
        ))}
      </View>

      {/* Next / Get Started button */}
      <Pressable
        onPress={handleNext}
        style={({ pressed }) => [
          styles.nextButton,
          {
            backgroundColor: colors.accent,
            borderRadius: borderRadius.lg,
            marginHorizontal: spacing['2xl'],
            marginBottom: spacing['4xl'],
            paddingVertical: spacing.base,
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        <Text
          style={{
            fontFamily: typography.button.fontFamily,
            fontSize: fontSize.lg,
            color: colors.primary,
            textAlign: 'center',
          }}
        >
          {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  skip: { position: 'absolute', zIndex: 10 },
  slide: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: 32 },
  dot: { height: 8, marginHorizontal: 4 },
  nextButton: {},
});

export default OnboardingScreen;
