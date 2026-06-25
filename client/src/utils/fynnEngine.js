/**
 * Fynn Response Engine
 * 
 * Local NLP engine that matches user input against the knowledge base
 * and returns contextual responses. Designed for easy Phase 2 swap
 * to OpenAI by keeping the same input/output interface.
 * 
 * Input:  (userMessage: string, context?: object)
 * Output: { text: string, suggestions?: string[], navigateTo?: string }
 */

import fynnKnowledge from '../constants/fynnKnowledge';

/**
 * Normalize input: lowercase, strip punctuation, trim
 */
const normalize = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Tokenize a string into words
 */
const tokenize = (text) => {
  return normalize(text).split(' ').filter(Boolean);
};

/**
 * Score a category against user input tokens.
 * Uses weighted keyword matching — longer keyword phrases score higher.
 */
const scoreCategory = (category, inputTokens, normalizedInput) => {
  let score = 0;

  for (const keyword of category.keywords) {
    const normalizedKeyword = normalize(keyword);

    // Exact phrase match (weighted higher)
    if (normalizedInput.includes(normalizedKeyword)) {
      // Longer phrases get more weight
      const wordCount = normalizedKeyword.split(' ').length;
      score += wordCount * 3;
    }

    // Individual token match
    const keyTokens = tokenize(keyword);
    for (const kt of keyTokens) {
      if (inputTokens.includes(kt)) {
        score += 1;
      }
    }
  }

  return score;
};

/**
 * Pick a random item from an array
 */
const pickRandom = (arr) => {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
};

/**
 * Check if input matches a special intent (greetings, thanks, goodbye, motivation)
 */
const checkSpecialIntent = (normalizedInput, inputTokens) => {
  const { greetings, thanks, goodbye, motivation } = fynnKnowledge;

  // Check greetings
  for (const kw of greetings.keywords) {
    if (normalizedInput === kw || inputTokens.includes(kw)) {
      return {
        text: pickRandom(greetings.responses),
        suggestions: ['How to add expense?', 'What are streaks?', 'Tell me about Insights'],
      };
    }
  }

  // Check thanks
  for (const kw of thanks.keywords) {
    if (normalizedInput.includes(kw)) {
      return {
        text: pickRandom(thanks.responses),
        suggestions: ['What else can you do?', 'Give me tips', 'Tell me about Fyno'],
      };
    }
  }

  // Check goodbye
  for (const kw of goodbye.keywords) {
    if (normalizedInput === kw || inputTokens.includes(kw)) {
      return {
        text: pickRandom(goodbye.responses),
      };
    }
  }

  // Check motivation
  for (const kw of motivation.keywords) {
    if (normalizedInput.includes(kw)) {
      return {
        text: pickRandom(motivation.responses),
        suggestions: ['Give me tips', 'What are streaks?', 'How to add expense?'],
      };
    }
  }

  return null;
};

/**
 * Main response function.
 * 
 * @param {string} userMessage - The user's input text
 * @param {object} context - Optional context (user data, current screen, etc.)
 *                           Reserved for Phase 2 OpenAI integration.
 * @returns {{ text: string, suggestions?: string[], navigateTo?: string }}
 */
export const getResponse = (userMessage, context = {}) => {
  if (!userMessage || !userMessage.trim()) {
    return {
      text: pickRandom(fynnKnowledge.fallbacks),
      suggestions: fynnKnowledge.quickActions.slice(0, 3).map(a => a.label),
    };
  }

  const normalizedInput = normalize(userMessage);
  const inputTokens = tokenize(userMessage);

  // 1. Check special intents first
  const specialResponse = checkSpecialIntent(normalizedInput, inputTokens);
  if (specialResponse) {
    return specialResponse;
  }

  // 2. Score all categories
  const scores = fynnKnowledge.categories.map((category) => ({
    category,
    score: scoreCategory(category, inputTokens, normalizedInput),
  }));

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  const bestMatch = scores[0];

  // 3. If best score is above threshold, return that category's response
  if (bestMatch.score >= 2) {
    const { category } = bestMatch;
    const responseText = pickRandom(category.responses);
    
    return {
      text: responseText,
      suggestions: category.suggestions || [],
    };
  }

  // 4. Partial match — score between 1 and 2
  if (bestMatch.score >= 1) {
    const { category } = bestMatch;
    const responseText = pickRandom(category.responses);
    
    return {
      text: responseText,
      suggestions: category.suggestions || [],
    };
  }

  // 5. Fallback
  return {
    text: pickRandom(fynnKnowledge.fallbacks),
    suggestions: ['How to add expense?', 'What are Insights?', 'Tell me about Fyno'],
  };
};

/**
 * Get the welcome message for Fynn's initial greeting.
 */
export const getWelcomeMessage = () => ({
  text: "Hi 👋\n\nI'm Fynn, your personal finance buddy inside Fyno.\n\nAsk me anything about the app — features, tips, or how things work!",
});

/**
 * Get the quick actions for the welcome screen.
 */
export const getQuickActions = () => fynnKnowledge.quickActions;

export default { getResponse, getWelcomeMessage, getQuickActions };
