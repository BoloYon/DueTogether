import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { useCampus } from '@/shared/adapters';
import { routes } from '@/shared/navigation';
import type { CampusResult, Id, PartnerPost, Project, StudySession } from '@/shared/types';
import { postStatus, projectStatus, sessionStatus } from './model';

/**
 * The one set of Feed actions used by List rows and Graph details alike.
 * Every mutation is a shared campus action; no local shadow state.
 * Failures are reported per entity so the UI can show the domain message.
 */
export function useFeedActions(now: number) {
  const { state, dispatch } = useCampus();
  const [errors, setErrors] = useState<Record<Id, string>>({});

  const run = useCallback((key: Id, action: Parameters<typeof dispatch>[0]): CampusResult => {
    const result = dispatch(action);
    setErrors(current => {
      const next = { ...current };
      if (result.ok) delete next[key]; else next[key] = result.message;
      return next;
    });
    return result;
  }, [dispatch]);

  return {
    state,
    errors,
    toggleJoin(session: StudySession) {
      const status = sessionStatus(state, session, now);
      return run(session.id, { type: status.joined ? 'session/leave' : 'session/join', id: session.id });
    },
    toggleSave(session: StudySession) {
      return run(session.id, { type: state.savedSessionIds.includes(session.id) ? 'session/unsave' : 'session/save', id: session.id });
    },
    /** Connect opens or reuses the author's chat. A post already linked just opens it. */
    connect(post: PartnerPost) {
      const status = postStatus(state, post);
      if (status.kind === 'linked') { router.push(routes.chat(status.threadId)); return { ok: true, id: status.threadId } as CampusResult; }
      const result = run(post.id, { type: 'post/connect', postId: post.id });
      if (result.ok && result.id) router.push(routes.chat(result.id));
      return result;
    },
    message(threadId: Id) { router.push(routes.chat(threadId)); },
    toggleRequest(project: Project) {
      const status = projectStatus(state, project);
      if (status !== 'open' && status !== 'requested') return { ok: false, error: 'forbidden', message: 'You can’t request to join this project.' } as CampusResult;
      return run(project.id, { type: status === 'requested' ? 'project/cancel' : 'project/request', id: project.id });
    },
  };
}

export type FeedActions = ReturnType<typeof useFeedActions>;
