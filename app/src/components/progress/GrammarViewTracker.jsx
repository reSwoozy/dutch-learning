import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.js';
import { useProgressStore } from '@/stores/progress.js';

export default function GrammarViewTracker({ topicId }) {
  const user = useAuthStore((s) => s.user);
  const loaded = useProgressStore((s) => s.loaded);
  const markGrammarViewed = useProgressStore((s) => s.markGrammarViewed);
  const isViewed = useProgressStore((s) => s.isGrammarViewed(topicId));

  useEffect(() => {
    if (!loaded || isViewed) return;
    markGrammarViewed(topicId, user);
  }, [topicId, loaded, isViewed, user, markGrammarViewed]);

  return null;
}
