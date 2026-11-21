
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Body, Button } from '@/components/campus';
import { usePalette } from '@/components/campus/palette';
import { routes } from '@/shared/navigation';

export type ConnectionConfirmation = { id: string; course?: string; reused: boolean };

export function useConnectionNotice() {
  const [confirmation, setConfirmation] = useState<ConnectionConfirmation | null>(null);
  useEffect(() => {
    if (!confirmation) return;
    const timer = setTimeout(() => setConfirmation(null), 8_000);
    return () => clearTimeout(timer);
  }, [confirmation]);
  return { confirmation, show: setConfirmation, dismiss: () => setConfirmation(null) };
}

export function ConnectionNotice({ confirmation, onDismiss }: { confirmation: ConnectionConfirmation; onDismiss: () => void }) {
  const router = useRouter();
  const palette = usePalette();
  return <View accessibilityLiveRegion="polite" style={[styles.notice, { backgroundColor: palette.backgroundElement, borderColor: palette.border }]}>
    <View style={styles.message}>
      <Body small>{confirmation.reused ? 'Added to your conversation' : 'Conversation added to Messages'}</Body>
    </View>
    <Button variant="ghost" label="View" onPress={() => {
      router.push(routes.chat(confirmation.id, confirmation.course));
      onDismiss();
    }} />
  </View>;
}

const styles = StyleSheet.create({
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 3, borderTopWidth: StyleSheet.hairlineWidth },
  message: { flex: 1 },
});
