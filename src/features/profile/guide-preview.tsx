import { Asset } from 'expo-asset';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Body, Button, ErrorBanner, Row } from '@/components/campus';
import { usePalette } from '@/components/campus/palette';
import { useCampus } from '@/shared/adapters';
import type { StudyGuide } from '@/shared/types';

import { useMediaUri } from './media';
import { PdfPreview } from './pdf-preview';

const sampleAssets = {
  matrix: require('../../../assets/sample-guides/matrix.pdf') as number,
  wave: require('../../../assets/sample-guides/wave.pdf') as number,
};

function GuideContent({ guide }: { guide: StudyGuide }) {
  const sampleId = guide.source.type === 'sample' ? sampleAssets[guide.source.key] : undefined;
  const file = useMediaUri(guide.source.type === 'file' ? guide.source.key : undefined);
  const [sample, setSample] = useState<{ uri?: string }>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (sampleId === undefined) return;
    let active = true;
    const asset = Asset.fromModule(sampleId);
    void asset.downloadAsync().then(() => {
      if (active) setSample({ uri: asset.localUri ?? asset.uri });
    }).catch(() => { if (active) setSample({}); });
    return () => { active = false; };
  }, [sampleId]);

  const source = sampleId === undefined ? file : sample;
  if (failed || (source && !source.uri)) return <Body>This file could not be opened.</Body>;
  if (!source?.uri) return <ActivityIndicator accessibilityLabel="Loading preview" />;
  if (guide.kind === 'pdf') return <PdfPreview uri={source.uri} onError={() => setFailed(true)} />;
  return <Image source={source.uri} style={{ flex: 1, width: '100%' }} contentFit="contain"
    accessible accessibilityLabel={guide.title} onError={() => setFailed(true)} />;
}

export function GuidePreview({ collectionId, guideId }: { collectionId: string; guideId: string }) {
  const { state, dispatch } = useCampus();
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const [error, setError] = useState<string>();
  const collection = state.collections.find(item => item.id === collectionId);
  const guide = collection?.guides.find(item => item.id === guideId);
  const starred = guide?.starredBy.includes(state.currentUser.id) ?? false;

  return (
    <View style={{ flex: 1, paddingBottom: insets.bottom, backgroundColor: palette.background }}>
      <Stack.Screen options={{ title: guide?.title ?? 'Study guide' }} />
      {guide && collection ? (
        <>
          <View style={{ padding: 12, gap: 8, borderBottomWidth: 1, borderColor: palette.border }}>
            <Row wrap>
              <Body bold>{guide.starredBy.length} {guide.starredBy.length === 1 ? 'star' : 'stars'}</Body>
              {collection.ownerId !== state.currentUser.id && (
                <Button compact label={starred ? 'Remove star' : 'Star guide'} variant={starred ? 'secondary' : 'primary'}
                  onPress={() => {
                    const result = dispatch({ type: 'guide/star', collectionId, guideId, starred: !starred });
                    setError(result.ok ? undefined : result.message);
                  }} />
              )}
            </Row>
            <ErrorBanner message={error} />
          </View>
          <GuideContent key={guide.id} guide={guide} />
        </>
      ) : <Body>Guide unavailable.</Body>}
    </View>
  );
}
