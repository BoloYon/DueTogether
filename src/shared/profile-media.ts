import { countGraphemes } from 'unicode-segmenter/grapheme';

import type { CampusState } from './types';

export { countGraphemes };
export const BIO_LIMIT = 150;
export const FILE_LIMIT = 25_000_000;
export const COLLECTION_NAME_LIMIT = 60;

export function validFileSize(bytes: number) {
  return Number.isSafeInteger(bytes) && bytes > 0 && bytes <= FILE_LIMIT;
}

export function validMediaKey(key: string) {
  return /^[0-9a-f-]{36}\.[a-z0-9]{1,8}$/.test(key);
}

export function campusMediaKeys(state: CampusState) {
  const keys = new Set<string>();
  for (const { avatar, banner } of [state.currentUser, ...state.people]) {
    if (avatar) keys.add(avatar);
    if (banner) keys.add(banner);
  }
  for (const collection of state.collections) {
    if (collection.cover) keys.add(collection.cover);
    for (const guide of collection.guides) {
      if (guide.source.type === 'file') keys.add(guide.source.key);
    }
  }
  return keys;
}
