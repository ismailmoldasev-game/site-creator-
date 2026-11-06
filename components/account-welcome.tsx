import { chatGPTSignInPath, chatGPTSignOutPath } from '@/lib/studio/auth-paths';

export default function AccountWelcome({
  returnTo = '/',
  error = '',
}: {
  returnTo?: string;
  error?: string;
}) {
  return (
    <main className="account-welcome">
      <div className="account-card">
        <div className="account-brand">
          <img src="/favicon.svg?v=leaf" alt="" width="42" height="42" />
          site<span>studio</span>
        </div>
        <p className="account-eyebrow">ВАШЕ ЛИЧНОЕ ПРОСТРАНСТВО</p>
        <h1>
          Ваш сайт.
          <br />
          Ваш аккаунт.
        </h1>
        <p className="account-lead">
          Войдите, чтобы продолжить работу над своим сайтом. При первом входе мы создадим для вас
          отдельное личное пространство.
        </p>
        {error && (
          <p className="account-error" role="alert">
            {error}
          </p>
        )}
        <a className="btn primary account-enter" href={chatGPTSignInPath(returnTo)} target="_top">
          Продолжить с ChatGPT <span aria-hidden="true">↗</span>
        </a>
        <p className="account-hint">
          Вход и регистрация через аккаунт ChatGPT.
          <br />
          Дополнительный пароль не нужен.
        </p>
        <ul className="account-benefits">
          <li>
            <span aria-hidden="true">✓</span> Ваши страницы и изображения доступны в вашем аккаунте
          </li>
          <li>
            <span aria-hidden="true">✓</span> Изменения сохраняются автоматически
          </li>
          <li>
            <span aria-hidden="true">✓</span> Посетители опубликованного сайта не получают доступ к
            редактору
          </li>
        </ul>
        {error && (
          <a className="text-btn" href={chatGPTSignOutPath('/')} target="_top">
            Выйти и выбрать другой аккаунт
          </a>
        )}
      </div>
    </main>
  );
}
