
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useCampus } from '@/shared/adapters';
import { otherSessionAttendees } from '@/shared/selectors';
import type { Id } from '@/shared/types';
import { usePalette } from './palette';
import { Body, Button, Card, ErrorBanner, MIN_TOUCH, Row } from './primitives';

export function ManagePostMenu({ kind, id }: { kind: 'request' | 'session'; id: Id }) {
  const { state, dispatch } = useCampus();
  const palette = usePalette();
  const [step, setStep] = useState<'closed' | 'menu' | 'confirm'>('closed');
  const [error, setError] = useState<string | null>(null);
  const session = kind === 'session' ? state.sessions.find(item => item.id === id && item.hostId === state.currentUser.id) : undefined;
  const post = kind === 'request' ? state.posts.find(item => item.id === id && item.authorId === state.currentUser.id) : undefined;
  const target = session ?? post;
  if (!target) return null;

  const actionLabel = session ? 'Cancel session' : 'Delete post';
  const affected = session ? otherSessionAttendees(session).length : 0;
  const close = () => { setStep('closed'); setError(null); };
  const confirm = () => {
    const result = dispatch({ type: session ? 'session/cancel' : 'post/delete', id });
    if (!result.ok) { setError(result.message); return; }
    close();
  };

  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`Manage ${target.title}`}
      accessibilityState={{ expanded: step !== 'closed' }} style={styles.trigger} onPress={() => setStep('menu')}>
      <Text style={[styles.glyph, { color: palette.textSecondary }]}>⋯</Text>
    </Pressable>
    {step !== 'closed' && <Modal transparent visible animationType="fade" onRequestClose={close}>
      <View style={styles.overlay} accessibilityViewIsModal>
        <Pressable style={StyleSheet.absoluteFill} accessible={false} importantForAccessibility="no" onPress={close} />
        <Card style={styles.card}>
          {step === 'menu' ? <>
            <Body bold>{target.title}</Body>
            <Button variant="danger" label={actionLabel} onPress={() => setStep('confirm')} />
            <Button variant="ghost" label="Close" onPress={close} />
          </> : <>
            <Body bold>{actionLabel}?</Body>
            <Body>{session
              ? `“${target.title}” will be removed from active listings. ${affected === 1 ? '1 other attendee is affected.' : `${affected} other attendees are affected.`}`
              : `“${target.title}” will be removed. Existing chats and their course context are kept.`}</Body>
            <ErrorBanner message={error} />
            <Row wrap>
              <Button variant="secondary" label={session ? 'Keep session' : 'Keep post'} onPress={close} />
              <Button variant="danger" label={actionLabel} onPress={confirm} />
            </Row>
          </>}
        </Card>
      </View>
    </Modal>}
  </>;
}

const styles = StyleSheet.create({
  trigger: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  glyph: { fontSize: 23, fontWeight: '700' },
  overlay: { flex: 1, justifyContent: 'center', padding: 16, backgroundColor: '#0007' },
  card: { width: '100%', maxWidth: 400, alignSelf: 'center' },
});
