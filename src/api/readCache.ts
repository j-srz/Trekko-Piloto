import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError } from './errors';

export interface ReadCacheResult<T> {
  data: T;
  offline: boolean;
}

export async function readThroughCache<T>(
  key: string,
  request: () => Promise<T>,
  decode: (value: unknown) => T,
): Promise<ReadCacheResult<T>> {
  let data: T;
  try {
    data = await request();
  } catch (requestError: unknown) {
    if (!(requestError instanceof ApiError) || requestError.status !== 0) throw requestError;

    let cached: string | null;
    try {
      cached = await AsyncStorage.getItem(`trekko-read-v1:${key}`);
    } catch (storageError: unknown) {
      console.warn('No se pudo leer la caché local de Trekko.', storageError);
      throw requestError;
    }
    if (cached === null) throw requestError;

    try {
      const parsed: unknown = JSON.parse(cached);
      return { data: decode(parsed), offline: true };
    } catch (cacheError: unknown) {
      console.warn('No se pudo interpretar la caché local de Trekko.', cacheError);
      throw requestError;
    }
  }

  try {
    await AsyncStorage.setItem(`trekko-read-v1:${key}`, JSON.stringify(data));
  } catch (storageError: unknown) {
    console.warn('No se pudo guardar la caché local de Trekko.', storageError);
  }
  return { data, offline: false };
}
