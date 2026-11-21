
import { useRouter } from 'expo-router';
import { Button, EmptyState, Screen } from '@/components/campus';
import { useCampus } from '@/shared/adapters';
import { routes, type DetailParams } from '@/shared/navigation';
import { PostCard } from './parts';

export function PostScreen({ id }: DetailParams) {
  const { state } = useCampus();
  const router = useRouter();
  const post = state.posts.find(item => item.id === id);
  return <Screen title={post?.title ?? 'Partner post'}>
    {post ? <PostCard post={post} detail /> : <EmptyState title="This post is no longer available"
      body="Any related conversation is still available in Messages."
      action={<Button label="Open Messages" variant="secondary" onPress={() => router.navigate(routes.messages)} />} />}
  </Screen>;
}
