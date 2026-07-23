import { StorageAdapter } from './StorageAdapter';
import { GoogleDriveAdapter } from './GoogleDriveAdapter';
import { SupabaseStorageAdapter } from './SupabaseStorageAdapter';

export function getStorageAdapter(googleAccessToken?: string | null): StorageAdapter {
  if (googleAccessToken && googleAccessToken.trim().length > 0) {
    return new GoogleDriveAdapter(googleAccessToken);
  }
  return new SupabaseStorageAdapter();
}
