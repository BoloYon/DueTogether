import type { CalendarAdapter, CanvasError } from '@/shared/types';

/** User-facing copy for adapter errors. Messages never echo URLs, tokens or headers. */
export function errorCopy(error: CanvasError): { title: string; body: string; action: 'retry' | 'settings' | 'none' } {
  switch (error.code) {
    case 'auth': return { title: 'Canvas rejected the token', body: 'The token may have expired or been revoked. Create a new token in Canvas and reconnect in Settings.', action: 'settings' };
    case 'rate-limit': return { title: 'Canvas asked us to slow down', body: 'Wait a minute, then try again. Your last synced coursework is still shown.', action: 'retry' };
    case 'network': return { title: 'You appear to be offline', body: 'Check your connection and try again. Your last synced coursework is still shown.', action: 'retry' };
    case 'timeout': return { title: 'Canvas took too long to respond', body: 'Try again in a moment. Your last synced coursework is still shown.', action: 'retry' };
    case 'invalid-url':
    case 'unsafe-url': return { title: 'Check the Canvas address', body: 'Use your school’s https:// Canvas address without a username, password or query.', action: 'settings' };
    case 'server':
    case 'invalid-response': return { title: 'Canvas sent an unexpected response', body: 'Try again later. Your last synced coursework is still shown.', action: 'retry' };
    case 'storage': return { title: 'Couldn’t save on this device', body: 'Secure storage is unavailable. Try again, or use the sample calendar.', action: 'retry' };
    case 'cancelled': return { title: 'Sync cancelled', body: 'Pull to refresh or tap Sync now to try again.', action: 'retry' };
    case 'unavailable': return { title: 'Live Canvas isn’t available in this build', body: 'You can keep using the labeled sample calendar.', action: 'none' };
  }
}

export function statusLabel(calendar: Pick<CalendarAdapter, 'status' | 'mode'>) {
  switch (calendar.status) {
    case 'connecting': return 'Connecting…';
    case 'syncing': return 'Syncing…';
    case 'ready': return 'Up to date';
    case 'error': return 'Needs attention';
    case 'disconnected': return calendar.mode === 'sample' ? 'Sample mode' : 'Not connected';
  }
}

export const isBusy = (calendar: Pick<CalendarAdapter, 'status'>) => calendar.status === 'connecting' || calendar.status === 'syncing';
