import * as SecureStore from 'expo-secure-store';
import type { TokenStore } from './client';

const ACCESS_TOKEN_KEY = 'trekko.accessToken';
const REFRESH_TOKEN_KEY = 'trekko.refreshToken';

export const secureTokenStore: TokenStore = {
  getAccessToken: () => SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  async saveTokens(accessToken, refreshToken) {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  },
  async clear() {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },
};
