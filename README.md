# Dutch Learning System

Учебное приложение для нидерландского языка с нуля до B2. Покрывает путь **inburgering (B1)** и **Staatsexamen NT2 Programma II (B2)**.

Сайт собран на **Astro 6** + **React** (интерактивные экраны), разворачивается как статика на GitHub Pages. Прогресс хранится в **Firebase** (Auth + Firestore).

## Два пути обучения

| Цель | Путь | Что использовать |
|---|---|---|
| **Inburgering (B1 + KNM)** | A1 → A2 → B1 + KNM | Уроки A1–B1, грамматика, core/extended словарь, KNM-статьи и mock-тесты, чтение и письмо B1 |
| **Staatsexamen NT2 II (B2)** | A1 → A2 → B1 → B2 | Весь путь выше + уроки B2, расширенная грамматика и лексика B2 |

## Продакшен

**https://reswoozy.github.io/dutch-learning/**

Вход через Google. Сессия кешируется в браузере; повторный вход не нужен, пока не нажать «Выйти».

## Локальный запуск

```bash
cd app
cp .env.example .env
# заполнить PUBLIC_FB_* из Firebase Console
npm install
npm run dev
```

Открыть **http://localhost:4321/ru/** (или порт, который покажет Astro).

Сборка для проверки продакшен-артефакта:

```bash
cd app
npm run build
npm run preview
```

## Структура репозитория

```
app/                          Astro-приложение (источник продакшена)
  src/
    pages/[lang]/             маршруты: уроки, грамматика, карточки, тесты…
    content/                  MDX-уроки, грамматика, словарь, культура, тесты
    components/               Astro + React (карточки, аккаунт, тесты…)
    stores/                   Zustand: auth, progress
    lib/                      Firebase, SRS (SM-2), legacy-ids, vocab-sets
    styles/                   base, layout, components, pages
  public/                     favicon, иконки
  .env.example                шаблон переменных Firebase
  astro.config.mjs

.github/workflows/deploy.yml  CI: lint, build app/, deploy app/dist на Pages
firestore.rules               правила Firestore (users/{uid})
```

Каталог `site/` — прежняя JSON-SPA-версия; в деплой не входит, оставлена как архив контента.

## Firebase

- **Authentication** — Google Sign-in; без входа прогресс не сохраняется.
- **Firestore** — документ `users/{uid}` с полем `progress` и `updatedAt`.
- Оффлайн: IndexedDB persistence в клиенте Firebase.

### Переменные окружения (`app/.env`)

```
PUBLIC_FB_API_KEY=
PUBLIC_FB_AUTH_DOMAIN=
PUBLIC_FB_PROJECT_ID=
PUBLIC_FB_STORAGE_BUCKET=
PUBLIC_FB_MESSAGING_SENDER_ID=
PUBLIC_FB_APP_ID=
```

В CI те же значения передаются из GitHub Secrets (`FIREBASE_*`) в workflow `deploy.yml`.

### Правила Firestore

Файл `firestore.rules`: чтение/запись только своего `users/{uid}`, поля `progress` и `updatedAt`, проверка `progress.version >= 4`.

## Прогресс (схема v8)

При первом входе данные подтягиваются из Firestore; при отсутствии — миграция из `localStorage` (`dutch-progress-buffer`) с маппингом legacy ID уроков и SRS-ключей.

Основные поля:

- `lessonsCompleted`, `grammarViewed`, `readingRead`, `writingSeen`
- `testResults`, `exerciseHistory`
- `srs` — интервальное повторение (SM-2): ключ `setId::слово`
- `streak`, `totalCorrect`, `totalAnswered`, `lastActiveDate`

## Карточки и SRS

- Наборы: уроки, core, extended, темы; фильтры по уровню и типу.
- В сессии слова с оценкой «Хорошо»/«Легко» считаются выученными в наборе; «Не знаю»/«Трудно» попадают в SRS.
- **Повторение** — только карточки с наступившим `nextReview`, не случайный набор.
- **Мои слова** — список всего, что уже оценивалось в SRS.

## CI и деплой

На push в `main`:

1. `npm ci` и `npm run lint` в `app/`
2. `npm run build` с `BASE_PATH=/<repo>/` и секретами Firebase
3. публикация `app/dist` на GitHub Pages

В настройках репозитория: **Settings → Pages → Source: GitHub Actions**.

## Технологии

- Astro 6, `@astrojs/react`, `@astrojs/mdx`
- React 19, Zustand
- Firebase Web SDK 10.14 (Auth + Firestore) через ESM с gstatic
- ESLint, Prettier

## Лицензия и использование

Образовательный проект для личной подготовки к inburgeringsexamen и Staatsexamen NT2 Programma II.
