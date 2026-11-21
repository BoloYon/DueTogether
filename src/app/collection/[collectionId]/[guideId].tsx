import { useLocalSearchParams } from 'expo-router';

import { GuidePreview } from '@/features/profile/guide-preview';

export default function Route() {
  const { collectionId, guideId } = useLocalSearchParams<{ collectionId: string; guideId: string }>();
  return <GuidePreview collectionId={collectionId} guideId={guideId} />;
}
