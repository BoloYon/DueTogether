import { useLocalSearchParams } from 'expo-router';
import { ChatScreen } from '@/features/chat';
import type { DetailParams } from '@/shared/navigation';

export default function Route() {
  const { id } = useLocalSearchParams<DetailParams>();
  return <ChatScreen id={id} />;
}
