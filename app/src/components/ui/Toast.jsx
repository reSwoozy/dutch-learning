import { create } from 'zustand';
import { useEffect, useRef } from 'react';

export const useToastStore = create((set) => ({
  message: null,
  type: 'success',
  show: (message, type = 'success') => {
    set({ message, type });
    setTimeout(() => set({ message: null }), 3000);
  },
}));

export function showToast(message, type = 'success') {
  useToastStore.getState().show(message, type);
}

export default function Toast() {
  const message = useToastStore((s) => s.message);
  const type = useToastStore((s) => s.type);
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    if (message) {
      ref.current.classList.add('toast--visible');
    } else {
      ref.current.classList.remove('toast--visible');
    }
  }, [message]);

  return (
    <div ref={ref} className={`toast toast--${type}`}>
      {message}
    </div>
  );
}
