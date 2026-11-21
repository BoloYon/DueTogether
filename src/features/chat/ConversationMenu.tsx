
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, ErrorBanner, Row } from '@/components/campus';
import { usePalette } from '@/components/campus/palette';
import { useCampus } from '@/shared/adapters';
import type { CampusAction, Thread } from '@/shared/types';

export function ConversationOptionsButton({ name, expanded, onPress }: { name: string; expanded: boolean; onPress: () => void }) {
  const palette = usePalette();
  return <Pressable accessibilityRole="button" accessibilityLabel={`Conversation options for ${name}`}
    accessibilityState={{ expanded }} style={styles.menuButton} onPress={onPress}>
    <Text style={[styles.ellipsis, { color: palette.textSecondary }]}>⋯</Text>
  </Pressable>;
}

export function ConversationMenu({ thread, name, onClose, onDelete }: { thread: Thread; name: string; onClose: () => void; onDelete?: () => void }) {
  const { dispatch } = useCampus();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apply = (action: CampusAction) => {
    const result = dispatch(action);
    if (!result.ok) { setError(result.message); return; }
    onClose();
    if (action.type === 'chat/delete') onDelete?.();
  };

  return <Modal transparent visible animationType="fade" onRequestClose={onClose}>
    <View style={styles.overlay} accessibilityViewIsModal>
      <Pressable style={StyleSheet.absoluteFill} accessible={false} importantForAccessibility="no" onPress={onClose} />
      <Card style={styles.card}>
        <Body bold>{confirming ? 'Disconnect and delete chat?' : name}</Body>
        {confirming ? <>
          <Body>This removes the conversation and its messages from this device. You can connect again from a partner post.</Body>
          <Row wrap>
            <Button compact variant="secondary" label="Cancel" onPress={onClose} />
            <Button compact variant="danger" label="Delete chat" onPress={() => apply({ type: 'chat/delete', threadId: thread.id })} />
          </Row>
        </> : <>
          <Button compact variant="secondary" label={thread.pinned ? 'Unpin' : 'Pin'}
            onPress={() => apply({ type: 'chat/pin', threadId: thread.id, pinned: !thread.pinned })} />
          <Button compact variant="danger" label="Disconnect and delete chat" onPress={() => setConfirming(true)} />
          <Button compact variant="ghost" label="Close" accessibilityLabel="Close conversation options" onPress={onClose} />
        </>}
        <ErrorBanner message={error} />
      </Card>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', padding: 16, backgroundColor: '#0007' },
  card: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  menuButton: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  ellipsis: { fontSize: 23, fontWeight: '700' },
});
