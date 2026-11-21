import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { CANVAS_BASE_URL } from '@/shared/config';
import type { CalendarAdapter } from '@/shared/types';
import { errorCopy, isBusy } from '../calendar/status';
import { usePalette } from '../feed/palette';
import { Banner, Button, Card, Txt } from '../feed/ui';
import { validateCanvasBaseUrl } from './canvasUrl';

/**
 * Canvas connection form. The token lives only in this component's state as
 * transient input, is passed once to `calendar.connect`, and is cleared after
 * every attempt. It is never logged, echoed, or placed in labels.
 */
export function CanvasConnectForm({ calendar, replacing }: { calendar: CalendarAdapter; replacing: boolean }) {
  const palette = usePalette();
  const [baseUrl, setBaseUrl] = useState(CANVAS_BASE_URL);
  const [token, setToken] = useState('');
  const [touched, setTouched] = useState(false);
  const [result, setResult] = useState<{ ok: true; name: string } | { ok: false; title: string; body: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const url = validateCanvasBaseUrl(baseUrl);
  const busy = submitting || isBusy(calendar);
  const canSubmit = url.ok && token.trim().length > 0 && !busy;

  const submit = async () => {
    if (!url.ok || !token.trim()) return;
    setSubmitting(true);
    setResult(null);
    const credential = { baseUrl: url.origin, token: token.trim() };
    setToken('');
    try {
      const outcome = await calendar.connect(credential);
      setResult(outcome.ok ? { ok: true, name: outcome.value.name } : { ok: false, ...errorCopy(outcome.error) });
    } catch {
      setResult({ ok: false, title: 'Couldn’t connect', body: 'Something went wrong. Try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const input = [styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.backgroundElement }];

  return <Card>
    <Txt variant="heading">{replacing ? 'Connect a different account' : 'Connect your Canvas account'}</Txt>
    <Txt variant="small" tone="secondary">
      For the account holder’s own demo only. DueTogether reads your coursework with GET requests and never changes Canvas. Never ask classmates for their tokens.
    </Txt>

    <Txt variant="small" style={styles.label}>School Canvas address</Txt>
    <TextInput value={baseUrl} onChangeText={value => { setBaseUrl(value); setResult(null); }} onBlur={() => setTouched(true)}
      placeholder="https://your-school.instructure.com" placeholderTextColor={palette.textSecondary}
      autoCapitalize="none" autoCorrect={false} keyboardType="url" textContentType="URL" inputMode="url"
      accessibilityLabel="School Canvas address" accessibilityHint="Must start with https" style={input} />
    {touched && !url.ok && baseUrl.trim() !== '' && <Txt variant="small" tone="live">{url.message}</Txt>}

    <Txt variant="small" style={styles.label}>Personal access token</Txt>
    <TextInput value={token} onChangeText={value => { setToken(value); setResult(null); }} secureTextEntry
      placeholder="Paste your token" placeholderTextColor={palette.textSecondary}
      autoCapitalize="none" autoCorrect={false} autoComplete="off" textContentType="none" importantForAutofill="no" spellCheck={false}
      accessibilityLabel="Personal access token" accessibilityHint="Hidden. Stored only in this device’s secure storage." style={input} />
    <Txt variant="caption" tone="secondary">
      In Canvas, open Account › Settings › Approved Integrations › New Access Token, where your school allows it. Copy the token and paste it here.
    </Txt>

    {url.ok && <View style={[styles.destination, { borderColor: palette.accent, backgroundColor: palette.accentSoft }]} accessible accessibilityLabel={`Your token will be sent only to ${url.origin}`}>
      <Txt variant="caption" tone="secondary">Your token will be sent only to</Txt>
      <Txt variant="body" tone="accent" style={styles.origin}>{url.origin}</Txt>
    </View>}

    {result && (result.ok
      ? <Banner tone="accent" title={`Connected as ${result.name}`} body="Your coursework now comes from Canvas." />
      : <Banner tone="live" title={result.title} body={result.body} />)}

    <Button tone="primary" label={url.ok ? `Connect to ${url.host}` : 'Connect'} busy={busy} disabled={!canSubmit} onPress={submit}
      accessibilityHint={replacing ? 'Your current connection stays until the new account loads' : undefined} />
  </Card>;
}

const styles = StyleSheet.create({
  label: { fontWeight: '600', marginTop: 6 },
  input: { minHeight: 44, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, fontSize: 16 },
  destination: { borderRadius: 10, borderWidth: 1, padding: 10, gap: 2, marginTop: 4 },
  origin: { fontWeight: '700' },
});
