
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Platform } from 'react-native';
import { usePalette } from '@/components/campus/palette';
import { threadSummaries } from '@/features/chat/logic';
import { useCampus } from '@/shared/adapters';

export default function TabLayout() {
  const palette = usePalette();
  const { state } = useCampus();
  const unread = threadSummaries(state).filter(thread => thread.unread > 0).length;
  const manualInsets = Platform.OS === 'ios';
  return (
    <NativeTabs backgroundColor={palette.background} tintColor={palette.accent} disableTransparentOnScrollEdge
      iconColor={{ default: palette.textSecondary, selected: palette.accent }}
      labelStyle={{ default: { color: palette.textSecondary }, selected: { color: palette.accent, fontWeight: '700' } }}
      badgeBackgroundColor={palette.danger} labelVisibilityMode="labeled">
      <NativeTabs.Trigger name="index" disableAutomaticContentInsets={manualInsets}>
        <NativeTabs.Trigger.Label>Feed</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="partners" disableAutomaticContentInsets={manualInsets}>
        <NativeTabs.Trigger.Label>Partners</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} md="group" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="messages" disableAutomaticContentInsets={manualInsets}>
        <NativeTabs.Trigger.Label>Messages</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'bubble.left', selected: 'bubble.left.fill' }} md="chat_bubble" />
        {unread > 0 && <NativeTabs.Trigger.Badge>{String(unread)}</NativeTabs.Trigger.Badge>}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="projects" disableAutomaticContentInsets={manualInsets}>
        <NativeTabs.Trigger.Label>Projects</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'square.stack.3d.up', selected: 'square.stack.3d.up.fill' }} md="layers" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="calendar" disableAutomaticContentInsets={manualInsets}>
        <NativeTabs.Trigger.Label>Calendar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
