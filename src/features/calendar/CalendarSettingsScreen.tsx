import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import { useCalendar } from '@/shared/adapters';
import type { Clock } from '@/shared/types';
import { useFocusedNow } from '../feed/hooks';
import { usePalette } from '../feed/palette';
import { Button, Card, Txt } from '../feed/ui';
import { CanvasConnectForm } from '../onboarding/CanvasConnectForm';
import { CalendarStatus } from './CalendarScreen';
import { lastSyncedLabel } from './model';
import { isBusy, statusLabel } from './status';

/** Calendar Settings owns the Canvas connection controls. All effects go through the calendar adapter. */
export function CalendarSettingsScreen({ clock }: { clock?: Clock } = {}) {
  const calendar = useCalendar();
  const palette = usePalette();
  const now = useFocusedNow(clock, 30_000);
  const [message, setMessage] = useState<string | null>(null);
  const live = calendar.mode === 'live';

  const disconnect = () => {
    const run = async () => {
      const result = await calendar.disconnect();
      setMessage(result.ok ? 'Disconnected. Your token and cached coursework were removed from this device.' : 'Couldn’t disconnect. Try again.');
    };
    const body = 'This removes your Canvas token and cached coursework from this device.';
    if (Platform.OS === 'web') { if ((globalThis as { confirm?: (text: string) => boolean }).confirm?.(`Disconnect Canvas? ${body}`) ?? true) run(); return; }
    Alert.alert('Disconnect Canvas?', body, [{ text: 'Cancel', style: 'cancel' }, { text: 'Disconnect', style: 'destructive', onPress: () => { run(); } }]);
  };

  return <ScrollView style={{ backgroundColor: palette.page }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <CalendarStatus calendar={calendar} now={now} compact />

    <Card>
      <Txt variant="heading">Connection</Txt>
      <Row label="Mode" value={live ? 'Live Canvas' : 'Sample calendar (fictional)'} />
      <Row label="Status" value={statusLabel(calendar)} />
      {live && calendar.account && <>
        <Row label="Account" value={calendar.account.name} />
        <Row label="School" value={calendar.account.origin} />
        <Row label="Sync" value={lastSyncedLabel(calendar.lastSyncedAt, now)} />
      </>}
      <View style={styles.actions}>
        {live && <Button tone="primary" icon="refresh" label="Sync now" busy={calendar.status === 'syncing'} disabled={isBusy(calendar)} onPress={() => { setMessage(null); calendar.sync(); }} />}
        {live && <Button tone="danger" label="Disconnect" disabled={isBusy(calendar)} onPress={disconnect} />}
        {!live && <Button label="Reload sample calendar" accessibilityHint="Loads fictional coursework for a no-network demo" onPress={() => { calendar.enterSampleMode(); setMessage('Sample calendar loaded. It contains fictional coursework only.'); }} />}
      </View>
      {message && <Txt variant="small" tone="secondary">{message}</Txt>}
    </Card>

    <CanvasConnectForm calendar={calendar} replacing={live} />

    <Txt variant="caption" tone="secondary">
      Your token is kept in this device’s secure storage and is never shown again, logged or shared. Grades and submissions are not read. Coursework is cached on this device so the calendar works offline.
    </Txt>
  </ScrollView>;
}

function Row({ label, value }: { label: string; value: string }) {
  return <View style={styles.row} accessible accessibilityLabel={`${label}: ${value}`}>
    <Txt variant="small" tone="secondary" style={styles.rowLabel}>{label}</Txt>
    <Txt variant="small" style={styles.rowValue}>{value}</Txt>
  </View>;
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48, gap: 14 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  row: { flexDirection: 'row', gap: 12, paddingVertical: 2 },
  rowLabel: { width: 72 },
  rowValue: { flex: 1, fontWeight: '600' },
});
