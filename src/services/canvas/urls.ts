export function canvasOrigin(input: string): string | undefined {
  try {
    const url = new URL(input.trim());
    if (url.protocol === 'https:' && url.hostname && !url.username && !url.password &&
        url.pathname === '/' && !url.search && !url.hash && !input.trim().includes('@')) {
      return url.origin;
    }
  } catch {
    // The caller supplies a fixed error message.
  }
}

export function sameOriginUrl(input: string, base: string, origin: string): URL | undefined {
  try {
    const url = new URL(input, base);
    if (url.origin === origin && !url.username && !url.password) return url;
  } catch {
    // Malformed links are never followed.
  }
}
