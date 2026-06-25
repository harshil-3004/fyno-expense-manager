import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TOKEN: '@fyno_token',
  USER: '@fyno_user',
  ONBOARDED: '@fyno_onboarded',
  THEME: '@fyno_theme_mode',
};

const storage = {
  async get(key) {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (e) {
      return null;
    }
  },

  async set(key, value) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // Silently fail
    }
  },

  async remove(key) {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      // Silently fail
    }
  },

  async clear() {
    try {
      await AsyncStorage.clear();
    } catch (e) {
      // Silently fail
    }
  },

  // Auth helpers
  async getToken() {
    return this.get(KEYS.TOKEN);
  },

  async setToken(token) {
    return this.set(KEYS.TOKEN, token);
  },

  async getUser() {
    return this.get(KEYS.USER);
  },

  async setUser(user) {
    return this.set(KEYS.USER, user);
  },

  async clearAuth() {
    await this.remove(KEYS.TOKEN);
    await this.remove(KEYS.USER);
  },

  async hasOnboarded() {
    const val = await AsyncStorage.getItem(KEYS.ONBOARDED);
    return val === 'true';
  },

  async setOnboarded() {
    await AsyncStorage.setItem(KEYS.ONBOARDED, 'true');
  },
};

export { KEYS };
export default storage;
