import { useLocalSearchParams } from 'expo-router';
import { ChatScreen } from '@/shared/baselineScreens';
import type { DetailParams } from '@/shared/navigation';

export default function Route() {
  const { id } = useLocalSearchParams<DetailParams>();
  return <ChatScreen id={id} />;
}
