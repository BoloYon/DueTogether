import { useLocalSearchParams } from 'expo-router';

import { CollectionScreen } from '@/features/profile/collections';

export default function Route() {
  const { collectionId } = useLocalSearchParams<{ collectionId: string }>();
  return <CollectionScreen id={collectionId} />;
}
