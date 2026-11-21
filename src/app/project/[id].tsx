import { useLocalSearchParams } from 'expo-router';
import { ProjectScreen } from '@/features/projects';
import type { DetailParams } from '@/shared/navigation';

export default function Route() {
  const { id } = useLocalSearchParams<DetailParams>();
  return <ProjectScreen id={id} />;
}
