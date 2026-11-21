import { useLocalSearchParams } from 'expo-router';
import { ProjectScreen } from '@/shared/baselineScreens';
import type { DetailParams } from '@/shared/navigation';

export default function Route() {
  const { id } = useLocalSearchParams<DetailParams>();
  return <ProjectScreen id={id} />;
}
