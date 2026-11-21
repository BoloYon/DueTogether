import { useLocalSearchParams } from 'expo-router';
import { PersonScreen } from '@/shared/baselineScreens';
import type { DetailParams } from '@/shared/navigation';

export default function Route() {
  const { id } = useLocalSearchParams<DetailParams>();
  return <PersonScreen id={id} />;
}
