/**
 * Validates the school Canvas base URL before a token is handed to it.
 * Accepts only an HTTPS origin (optional port). Rejects credentials in the
 * URL, other schemes, query strings and fragments. A path is accepted but
 * reduced to the origin so the user sees exactly where the token goes.
 * Implemented without `URL` because React Native's URL support is partial.
 */
export type CanvasUrlResult = { ok: true; origin: string; host: string } | { ok: false; message: string };

const HOST_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function validateCanvasBaseUrl(input: string): CanvasUrlResult {
  const raw = input.trim();
  if (!raw) return { ok: false, message: 'Enter your school’s Canvas address.' };
  if (/\s/.test(raw)) return { ok: false, message: 'The address cannot contain spaces.' };
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(raw);
  let rest: string;
  if (scheme) {
    if (scheme[1].toLowerCase() !== 'https') return { ok: false, message: 'Use a secure https:// address. Other schemes are not allowed.' };
    if (!raw.slice(scheme[0].length).startsWith('//')) return { ok: false, message: 'Enter a full address such as https://school.instructure.com.' };
    rest = raw.slice(scheme[0].length + 2);
  } else {
    if (raw.startsWith('//')) return { ok: false, message: 'Enter a full address such as https://school.instructure.com.' };
    rest = raw;
  }
  const authorityEnd = rest.search(/[/?#]/);
  const authority = authorityEnd === -1 ? rest : rest.slice(0, authorityEnd);
  const tail = authorityEnd === -1 ? '' : rest.slice(authorityEnd);
  if (authority.includes('@')) return { ok: false, message: 'Remove the username or password from the address.' };
  if (/[?#]/.test(tail)) return { ok: false, message: 'Remove the query or fragment (anything after ? or #).' };
  const match = /^([^:]+)(?::(\d{1,5}))?$/.exec(authority);
  if (!match) return { ok: false, message: 'That does not look like a web address.' };
  const host = match[1].toLowerCase().replace(/\.$/, '');
  const port = match[2];
  const labels = host.split('.');
  if (labels.length < 2 || !labels.every(label => HOST_LABEL.test(label)) || /^\d+$/.test(labels.at(-1)!)) {
    return { ok: false, message: 'Enter your school’s Canvas host name, such as school.instructure.com.' };
  }
  if (port !== undefined && (Number(port) < 1 || Number(port) > 65535)) return { ok: false, message: 'The port number is not valid.' };
  const origin = `https://${host}${port && port !== '443' ? `:${port}` : ''}`;
  return { ok: true, origin, host };
}
