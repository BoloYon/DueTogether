import type { Clock } from '../../shared/types';
import type { CampusStore } from './store';

export function watchCampusDelivery(store: CampusStore, clock: Clock) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  function schedule() {
    clearTimeout(timer);
    const { threads, invites } = store.getState();
    const times = [
      ...threads.flatMap(thread => thread.pendingReply ? [thread.pendingReply.dueAt] : []),
      ...invites.flatMap(invite =>
        invite.status === 'pending' && invite.acceptAt !== undefined ? [invite.acceptAt] : []),
    ];
    if (!times.length) return;
    const delay = Math.min(...times) - clock();
    timer = setTimeout(() => {
      store.advance();
      // Reschedule even if the callback ran early or the clock moved back.
      schedule();
    }, Math.min(2_147_483_647, Math.max(0, delay)));
  }

  const unsubscribe = store.subscribe(schedule);
  schedule();
  return () => {
    unsubscribe();
    clearTimeout(timer);
  };
}
