
import { useLocalSearchParams } from 'expo-router';
import { ChatScreen } from '@/features/chat';
import type { ChatParams } from '@/shared/navigation';

export default function Route() {
  const { id, course } = useLocalSearchParams<ChatParams>();
  return <ChatScreen key={JSON.stringify([id, course])} id={id} course={course} />;
}
