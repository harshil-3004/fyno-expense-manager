import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

/**
 * Fynn Suggestion Chips
 * Horizontal scrollable row of tappable suggestion chips
 */
const FynnSuggestionChips = ({ suggestions, onPress }) => {
  const { colors, borderRadius, spacing, fontSize, fontFamily } = useTheme();

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <View style={[styles.container, { paddingLeft: spacing.xl + 36 }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {suggestions.map((suggestion, index) => (
          <Pressable
            key={`${suggestion}_${index}`}
            onPress={() => onPress(suggestion)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: pressed ? colors.accent + '30' : colors.accent + '15',
                borderColor: colors.accent + '40',
                borderRadius: borderRadius.full,
                transform: [{ scale: pressed ? 0.95 : 1 }],
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color: colors.accent,
                  fontSize: fontSize.xs,
                  fontFamily: fontFamily.medium,
                },
              ]}
              numberOfLines={1}
            >
              {suggestion}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
    marginTop: -2,
  },
  scrollContent: {
    paddingRight: 24,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
  },
  chipText: {
    letterSpacing: 0.1,
  },
});

export default FynnSuggestionChips;
