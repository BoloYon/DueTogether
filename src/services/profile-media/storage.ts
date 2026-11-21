import { Directory, File, Paths } from 'expo-file-system';
import type { DocumentPickerAsset } from 'expo-document-picker';

import { validFileSize, validMediaKey } from '@/shared/profile-media';

const directory = () => new Directory(Paths.document, 'campus-profile-media');

function storedFile(key: string) {
  if (!validMediaKey(key)) throw new Error('Invalid file reference.');
  return new File(directory(), key);
}

export async function saveMedia(asset: DocumentPickerAsset, key: string) {
  const source = new File(asset.uri);
  const target = storedFile(key);
  try {
    directory().create({ idempotent: true, intermediates: true });
    const bytes = source.size;
    if (!validFileSize(bytes)) throw new Error('Choose a readable file up to 25 MB.');
    await source.copy(target);
    if (target.size !== bytes) throw new Error('The file could not be copied completely.');
    return bytes;
  } catch (error) {
    await removeMedia(key).catch(() => {});
    throw error;
  }
}

export function releasePickedMedia(asset: DocumentPickerAsset) {
  const cache = Paths.cache.uri.replace(/\/$/, '') + '/';
  if (!asset.uri.startsWith(cache)) return;
  try { new File(asset.uri).delete(); } catch { /* The OS can reclaim the temporary copy. */ }
}

export async function removeMedia(key: string) {
  const file = storedFile(key);
  if (file.exists) file.delete();
}

export async function openMedia(key: string) {
  const file = storedFile(key);
  return file.exists ? { uri: file.uri, release() {} } : undefined;
}
