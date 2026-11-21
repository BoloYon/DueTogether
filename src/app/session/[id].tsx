import { useLocalSearchParams } from 'expo-router';
import { SessionScreen } from '@/features/sessions';
import type { DetailParams } from '@/shared/navigation';

export default function Route() {
  const { id } = useLocalSearchParams<DetailParams>();
  return <SessionScreen id={id} />;
}
