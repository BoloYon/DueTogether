import { fetch } from 'expo/fetch';

export const canvasFetch = (url: string, init: RequestInit) =>
  fetch(url, { ...init, credentials: 'omit', redirect: 'manual' });
