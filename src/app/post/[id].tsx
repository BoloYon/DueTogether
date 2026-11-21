
import { useLocalSearchParams } from 'expo-router';
import { PostScreen } from '@/features/partners/PostScreen';
import type { DetailParams } from '@/shared/navigation';

export default function Route() {
  const { id } = useLocalSearchParams<DetailParams>();
  return <PostScreen id={id} />;
}
