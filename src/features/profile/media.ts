import { randomUUID } from 'expo-crypto';
import { getDocumentAsync } from 'expo-document-picker';
import { useEffect, useRef, useState } from 'react';

import { openMedia, releasePickedMedia, removeMedia, saveMedia } from '@/services/profile-media/storage';
import type { CampusResult } from '@/shared/types';

async function pickMedia(imagesOnly: boolean) {
  const result = await getDocumentAsync({
    type: imagesOnly ? 'image/*' : ['application/pdf', 'image/*'],
    copyToCacheDirectory: true,
    base64: false,
  });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return;
  try {
    const extension = asset.name.split('.').at(-1)?.toLowerCase();
    const kind = asset.mimeType === 'application/pdf' || extension === 'pdf' ? 'pdf' : 'image';
    if (imagesOnly && kind === 'pdf') throw new Error('Choose an image.');
    if (kind === 'image' && !asset.mimeType?.startsWith('image/') && !/^(png|jpe?g|heic|heif|webp|gif|avif|bmp|tiff?)$/.test(extension ?? '')) {
      throw new Error('Choose a PDF or image.');
    }
    const suffix = kind === 'pdf' ? 'pdf' : extension && /^[a-z0-9]{1,8}$/.test(extension) ? extension : 'img';
    const key = randomUUID() + '.' + suffix;
    const bytes = await saveMedia(asset, key);
    return { title: asset.name || 'Study guide', kind, source: { type: 'file', key, bytes } } as const;
  } finally {
    releasePickedMedia(asset);
  }
}

export function useMediaPicker() {
  const pending = useRef(false);
  const mounted = useRef(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function pick(imagesOnly: boolean, attach: (file: NonNullable<Awaited<ReturnType<typeof pickMedia>>>) => CampusResult) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(undefined);
    let key: string | undefined;
    try {
      const file = await pickMedia(imagesOnly);
      if (!file) return;
      key = file.source.key;
      if (!mounted.current) return;
      const result = attach(file);
      if (!result.ok) throw new Error(result.message);
      key = undefined;
    } catch (error) {
      if (mounted.current) setError(error instanceof Error ? error.message : 'Could not import the file.');
    } finally {
      if (key) await removeMedia(key).catch(() => {});
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return { busy, error, pick };
}

export function useMediaUri(key: string | undefined) {
  const [state, setState] = useState<{ key: string; uri?: string }>();
  useEffect(() => {
    if (!key) return;
    let disposed = false;
    let release: (() => void) | undefined;
    void openMedia(key).then(result => {
      if (disposed) {
        result?.release();
        return;
      }
      release = result?.release;
      setState({ key, uri: result?.uri });
    }).catch(() => {
      if (!disposed) setState({ key });
    });
    return () => { disposed = true; release?.(); };
  }, [key]);
  return state?.key === key ? state : undefined;
}
