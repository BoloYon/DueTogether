import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Avatar, Badge, Body, Row, Title } from '@/components/campus';
import { usePalette } from '@/components/campus/palette';
import { useCampus } from '@/shared/adapters';
import { contributionLevel, contributionTotal } from '@/shared/contributions';
import type { User } from '@/shared/types';

import { useMediaUri } from './media';

export function ProfileHeader({ user, dashed, children }: { user: User; dashed?: boolean; children?: ReactNode }) {
  const { state } = useCampus();
  const palette = usePalette();
  const avatar = useMediaUri(user.avatar);
  const banner = useMediaUri(user.banner);
  const stars = contributionTotal(state, user.id);

  return (
    <View style={{ gap: 12 }}>
      <View style={{ height: 110, borderRadius: 18, overflow: 'hidden', backgroundColor: palette.accentSoft }}>
        {banner?.uri && <Image source={banner.uri} contentFit="cover" style={{ flex: 1 }} accessible accessibilityLabel="Profile banner" />}
      </View>
      <Row>
        {avatar?.uri
          ? <Image source={avatar.uri} contentFit="cover" style={{ width: 64, height: 64, borderRadius: 32 }} />
          : <Avatar name={user.name} initials={user.initials} size={64} dashed={dashed} />}
        <View style={{ flex: 1, gap: 4 }}>
          <Title>{user.name}</Title>
          {(user.major || user.year) && <Body secondary>{[user.major, user.year].filter(Boolean).join(' · ')}</Body>}
          {children}
        </View>
      </Row>
      {user.bio ? <Body>{user.bio}</Body> : null}
      <Row wrap>
        <Badge label={contributionLevel(stars)} tone="accent" />
        <Body bold>{stars} {stars === 1 ? 'star' : 'stars'}</Body>
      </Row>
    </View>
  );
}
