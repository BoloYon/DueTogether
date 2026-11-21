import { useLocalSearchParams } from 'expo-router';
import { CreateScreen } from '@/shared/baselineScreens';
import type { CreateParams } from '@/shared/navigation';

export default function Route() {
  const { course, title, kind } = useLocalSearchParams<CreateParams>();
  return <CreateScreen course={course} title={title} kind={kind} />;
}
