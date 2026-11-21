
import type { ReactNode } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from '@/features/feed/ui';

export function SectionToggle({ label, expanded, onPress, color, style, children }: {
  label: string; expanded: boolean; onPress: () => void; color: string;
  style: StyleProp<ViewStyle>; children: ReactNode;
}) {
  return <Pressable accessibilityRole="button" aria-expanded={expanded} accessibilityLabel={label}
    accessibilityHint={expanded ? 'Collapses the section' : 'Expands the section'} onPress={onPress} style={style}>
    <Icon name={expanded ? 'chevron-down' : 'chevron-right'} size={18} color={color} />
    {children}
  </Pressable>;
}
