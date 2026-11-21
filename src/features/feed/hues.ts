/** Course/cluster hues for graph planets and calendar markers (readable on both schemes). Pure: safe to import in tests. */
export const clusterHues = ['#3b7be8', '#d9641e', '#2f9e6a', '#a54fd0', '#c23a6b', '#1f9bb0'] as const;

export function hueFor(key: string): string {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  return clusterHues[hash % clusterHues.length];
}
