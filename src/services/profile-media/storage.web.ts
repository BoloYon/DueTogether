import type { DocumentPickerAsset } from 'expo-document-picker';

import { validFileSize, validMediaKey } from '@/shared/profile-media';

function runMediaRequest<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    const open = indexedDB.open('duetogether-profile-media', 1);
    open.onupgradeneeded = () => { open.result.createObjectStore('files'); };
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      try {
        const transaction = db.transaction('files', mode);
        const request = run(transaction.objectStore('files'));
        transaction.oncomplete = () => { db.close(); resolve(request.result); };
        transaction.onabort = () => { db.close(); reject(transaction.error); };
      } catch (error) {
        db.close();
        reject(error);
      }
    };
  });
}

export async function saveMedia(asset: DocumentPickerAsset, key: string) {
  if (!validMediaKey(key)) throw new Error('Invalid file reference.');
  const file = asset.file;
  if (!file || !validFileSize(file.size)) throw new Error('Choose a readable file up to 25 MB.');
  await runMediaRequest('readwrite', store => store.add(file, key));
  return file.size;
}

export function releasePickedMedia(asset: DocumentPickerAsset) {
  URL.revokeObjectURL(asset.uri);
}

export async function removeMedia(key: string) {
  await runMediaRequest('readwrite', store => store.delete(key));
}

export async function openMedia(key: string) {
  const file = await runMediaRequest<Blob | undefined>('readonly', store => store.get(key));
  if (!file) return;
  const blob = key.endsWith('.pdf') ? file.slice(0, file.size, 'application/pdf') : file;
  const uri = URL.createObjectURL(blob);
  return { uri, release: () => URL.revokeObjectURL(uri) };
}
