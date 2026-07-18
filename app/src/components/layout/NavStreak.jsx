import { useEffect } from 'react';
import { useProgressStore } from '@/stores/progress.js';

export default function NavStreak() {
  const streak = useProgressStore((s) => s.data?.streak ?? 0);

  useEffect(() => {
    const el = document.getElementById('nav-account-streak');
    const val = document.getElementById('nav-account-streak-value');
    if (!el || !val) return;

    if (streak > 0) {
      if (val.textContent !== String(streak)) val.textContent = String(streak);
      if (el.hidden) el.hidden = false;
    } else if (!el.hidden) {
      el.hidden = true;
    }
  }, [streak]);

  return null;
}
