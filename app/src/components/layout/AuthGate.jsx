import { useAuthStore } from '@/stores/auth.js';

const ERROR_MESSAGES = {
  ru: {
    'auth/popup-closed-by-user': 'Окно входа закрыто. Нажмите кнопку, чтобы попробовать снова.',
    'auth/cancelled-popup-request': 'Окно входа закрыто. Нажмите кнопку, чтобы попробовать снова.',
    'auth/popup-blocked': 'Браузер заблокировал всплывающее окно. Разрешите их для этого сайта.',
    'auth/network-request-failed': 'Нет связи с серверами Google. Проверьте интернет.',
    'auth/unauthorized-domain': 'Домен не добавлен в Authorized domains проекта Firebase.',
    default: 'Не удалось войти. Попробуйте ещё раз.',
  },
  en: {
    'auth/popup-closed-by-user': 'Sign-in window was closed. Click the button to try again.',
    'auth/cancelled-popup-request': 'Sign-in window was closed. Click the button to try again.',
    'auth/popup-blocked': 'Browser blocked the popup. Allow popups for this site.',
    'auth/network-request-failed': 'Cannot connect to Google. Check your internet.',
    'auth/unauthorized-domain': 'This domain is not in Firebase Authorized domains.',
    default: 'Sign-in failed. Please try again.',
  },
};

function mapError(err, locale) {
  const msgs = ERROR_MESSAGES[locale] || ERROR_MESSAGES.ru;
  return msgs[err?.code] || msgs.default;
}

export default function AuthGate({ locale = 'ru', subtitle }) {
  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.authReady);
  const signIn = useAuthStore((s) => s.signIn);

  if (!authReady || user) return null;

  const handleSignIn = async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      await signIn();
    } catch (err) {
      console.error('[auth] sign-in failed', err);
      const msg = mapError(err, locale);
      const sub = btn.closest('.auth-gate')?.querySelector('.auth-gate__subtitle');
      if (sub) sub.textContent = msg;
    } finally {
      btn.disabled = false;
    }
  };

  const labels = {
    ru: { title: 'Вход', button: 'Войти через Google' },
    en: { title: 'Sign in', button: 'Sign in with Google' },
  };
  const l = labels[locale] || labels.ru;

  return (
    <div className="auth-gate">
      <div className="auth-gate__card">
        <div className="auth-gate__brand">
          <span className="logo-mark">NL</span>
          <span>Dutch Learning System</span>
        </div>
        <h1 className="auth-gate__title">{l.title}</h1>
        <p className="auth-gate__subtitle">{subtitle || (locale === 'en'
          ? 'Sign in with Google to sync your progress across devices.'
          : 'Войдите через Google, чтобы синхронизировать прогресс между устройствами.')}</p>
        <button type="button" className="auth-gate__btn" onClick={handleSignIn}>
          <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92c1.71-1.57 2.68-3.88 2.68-6.61z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.33 0-4.31-1.57-5.02-3.68H.96v2.33A9 9 0 0 0 9 18z" />
            <path fill="#FBBC05" d="M3.98 10.74A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.19.3-1.74V4.93H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.07l3.02-2.33z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.93l3.02 2.33C4.69 5.15 6.67 3.58 9 3.58z" />
          </svg>
          <span>{l.button}</span>
        </button>
      </div>
    </div>
  );
}
