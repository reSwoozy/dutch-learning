import { useEffect } from 'react';
import { useProgressStore } from '@/stores/progress.js';

export default function NavStreak() {
  const streak = useProgressStore((s) => s.data?.streak ?? 0);

  useEffect(() => {
    const el = document.getElementById('nav-account-streak');
    const val = document.getElementById('nav-account-streak-value');
    if (!el || !val) return;
    if (streak > 0) {
      el.hidden = false;
      val.textContent = String(streak);
    } else {
      el.hidden = true;
    }
  }, [streak]);

  return null;
}
