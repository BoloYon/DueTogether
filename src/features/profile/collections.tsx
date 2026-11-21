import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Body, Button, Card, ErrorBanner, ListRow, Notice, Row, Screen, Section, TextField } from '@/components/campus';
import { usePalette } from '@/components/campus/palette';
import { useCampus } from '@/shared/adapters';
import { routes } from '@/shared/navigation';
import { COLLECTION_NAME_LIMIT } from '@/shared/profile-media';
import type { CampusResult, ProfileCollection } from '@/shared/types';

import { useMediaPicker, useMediaUri } from './media';

function CollectionCover({ collection }: { collection: ProfileCollection }) {
  const palette = usePalette();
  const picture = useMediaUri(collection.cover);
  return (
    <View style={{ height: 106, backgroundColor: palette.accentSoft, borderRadius: 12, overflow: 'hidden' }}>
      {picture?.uri && <Image source={picture.uri} style={{ flex: 1 }} contentFit="cover" />}
    </View>
  );
}

export function ProfileCollections({ ownerId }: { ownerId: string }) {
  const { state, dispatch } = useCampus();
  const router = useRouter();
  const mine = ownerId === state.currentUser.id;
  const collections = state.collections.filter(item => item.ownerId === ownerId);
  const [creating, setCreating] = useState(false);

  return (
    <Section title={mine ? 'Collections' : 'Shared demo collections'}
      action={mine && !creating ? <Button compact variant="ghost" label="New collection" onPress={() => setCreating(true)} /> : undefined}>
      {!mine && <Body small secondary>Stars stay on this device.</Body>}
      {creating && (
        <Card>
          <CollectionNameForm label="Create collection" onCancel={() => setCreating(false)} onSave={name => {
            const result = dispatch({ type: 'collection/create', name });
            if (result.ok && result.id) {
              setCreating(false);
              router.push(routes.collection(result.id));
            }
            return result;
          }} />
        </Card>
      )}
      {!collections.length && <Body secondary>{mine ? 'Create a collection to add study guides.' : 'This classmate has no shared collections.'}</Body>}
      {collections.map(collection => (
        <Card key={collection.id} onPress={() => router.push(routes.collection(collection.id))}
          accessibilityLabel={collection.name} accessibilityHint="Opens collection">
          <CollectionCover collection={collection} />
          <Body bold>{collection.name}</Body>
          <Body secondary>{collection.guides.length} {collection.guides.length === 1 ? 'guide' : 'guides'}</Body>
        </Card>
      ))}
    </Section>
  );
}

function CollectionNameForm({ label, initialName = '', onSave, onCancel }: {
  label: string; initialName?: string; onSave: (name: string) => CampusResult; onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string>();
  return (
    <>
      <TextField label="Collection name" value={name} onChangeText={setName} maxLength={COLLECTION_NAME_LIMIT * 8} error={error} />
      <Row wrap>
        <Button label={label} onPress={() => {
          const result = onSave(name);
          if (!result.ok) setError(result.message);
        }} />
        <Button label="Cancel" variant="ghost" onPress={onCancel} />
      </Row>
    </>
  );
}

export function CollectionScreen({ id }: { id: string }) {
  const { state, dispatch } = useCampus();
  const router = useRouter();
  const { busy, error, pick } = useMediaPicker();
  const [editing, setEditing] = useState(false);
  const [failure, setFailure] = useState<string>();
  const collection = state.collections.find(item => item.id === id);
  if (!collection) return <Screen title="Collection"><Body>Collection unavailable.</Body></Screen>;
  const mine = collection.ownerId === state.currentUser.id;
  const owner = state.people.find(person => person.id === collection.ownerId);
  const setCover = (key?: string) => dispatch({ type: 'collection/cover', id, key });

  return (
    <Screen title={collection.name}>
      <CollectionCover collection={collection} />
      {mine ? (
        <>
          <Row wrap>
            <Button label={collection.cover ? 'Change cover' : 'Add cover'} variant="secondary" disabled={busy}
              onPress={() => void pick(true, file => setCover(file.source.key))} />
            {collection.cover && <Button label="Remove cover" variant="ghost" disabled={busy} onPress={() => {
              const result = setCover();
              setFailure(result.ok ? undefined : result.message);
            }} />}
            {!editing && <Button label="Rename" variant="ghost" onPress={() => setEditing(true)} />}
          </Row>
          {editing && <CollectionNameForm label="Save name" initialName={collection.name} onCancel={() => setEditing(false)} onSave={name => {
            const result = dispatch({ type: 'collection/update', id, name });
            if (result.ok) setEditing(false);
            return result;
          }} />}
        </>
      ) : <Notice tone="neutral">Shared by {owner?.name ?? 'a fictional classmate'} in the campus demo. Stars stay on this device.</Notice>}
      <Section title="Study guides and notes" count={collection.guides.length}>
        {collection.guides.map(guide => (
          <ListRow key={guide.id} title={guide.title}
            subtitle={`${guide.kind === 'pdf' ? 'PDF' : 'Image'} · ${guide.starredBy.length} ${guide.starredBy.length === 1 ? 'star' : 'stars'}`}
            onPress={() => router.push(routes.guide(id, guide.id))} accessibilityHint="Previews guide" />
        ))}
        {!collection.guides.length && <Body secondary>No files in this collection yet.</Body>}
        {mine && (
          <>
            <Body secondary>PDF or image · Up to 25 MB per file</Body>
            <Button label={busy ? 'Importing…' : 'Add PDF or image'} disabled={busy}
              onPress={() => void pick(false, guide => dispatch({ type: 'guide/add', collectionId: id, guide }))} />
          </>
        )}
        <ErrorBanner message={error ?? failure} />
      </Section>
    </Screen>
  );
}
