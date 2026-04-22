# Dutch Learning System

Учебное приложение для нидерландского языка с нуля до B2. Покрывает путь **inburgering (B1)** и **Staatsexamen NT2 Programma II (B2)**.

Текущий объём: 53 урока, 38 грамматических тем, ~5900 слов в tier-структуре, 108 неправильных глаголов, 22 статьи о стране (включая 7 KNM-досье), 15 тестов (12 уровневых + 3 KNM-mock), 20 градуированных текстов для чтения, 13 материалов по письму, 46 внешних ресурсов. Живёт как статический SPA на GitHub Pages с Firebase-бэкендом (Auth + Firestore), устанавливается как PWA и работает оффлайн.

## Два пути обучения

| Цель | Путь | Что из проекта использовать |
|---|---|---|
| **Inburgering (B1 + KNM)** | A1 → A2 → B1 + KNM | Уроки A1–B1, грамматика A1–B1, core/A1–B1 + extended/B1, темы «работа / здоровье / жильё / образование / муниципалитет / финансы», 7 KNM-досье, 3 KNM mock-теста, чтение A1–B1, письмо (formeel), культура |
| **Staatsexamen NT2 II (B2)** | A1 → A2 → B1 → B2 | Весь путь выше + уроки B2, грамматика B2, core/B2 + extended/B2, темы «медиа / экология / academisch B2», чтение B2 (публицистика, betoog, beschouwing), письмо (middellange schrijftaak, argumentatief B2) |

## Как открыть

Продакшен живёт на GitHub Pages: **https://reswoozy.github.io/dutch-learning/**

При первом заходе сайт показывает экран входа через Google. Firebase Auth сам кеширует сессию — при повторных заходах вход уже не требуется, пока явно не нажать «Выйти» в меню аватара в шапке.

## Архитектура

SPA без сборки и зависимостей в рантайме. Весь клиентский код — ES-модули, подключаемые одним entry-файлом `site/js/main.js`. Бэкенд — Firebase (Auth + Firestore), раздаётся как `<script type="module">` с `gstatic.com`.

```
.github/workflows/deploy.yml   CI: валидация JSON, пересборка индексов, inject Firebase config, deploy на Pages
firestore.rules                правила Firestore: read/write только своего users/{uid}
scripts/
  rebuild-vocab-index.mjs      пересборка vocabulary/index.json и search-index.json
  normalize-lesson-titles.mjs  унификация заголовков уроков
  server.py                    необязательный локальный dev-сервер (статика, без прогресса)

site/
  index.html                   единственный HTML; подключает css/*.css и js/main.js как module
  manifest.webmanifest         PWA-манифест + shortcuts (карточки, уроки, чтение, ресурсы)
  sw.js                        service worker, cache-first / stale-while-revalidate; v10
  icons/icon.svg
  css/
    base.css                   переменные, reset, типографика, анимации
    layout.css                 header / nav drawer / footer / auth-gate / user-badge
    components.css             карточки, бейджи, кнопки, тосты, поиск, flashcards chrome
    pages.css                  стили секций (verbs/tests/grammar-exercise/lesson/reading/writing/culture)
  js/
    main.js                    bootstrap: импортирует модули, слушает onAuth, показывает gate / badge, запускает App.init
    core/
      app.js                   App singleton (state, init, pageHero, escapeHtml)
      router.js                hash-роутер
      data.js                  fetchJSON, vocabSetPath, loadVocabSet
      auth.js                  gate-UI, signIn/signOut, onAuth
      progress.js              Firestore-backed Progress (users/{uid}.progress, debounced save, offline via IndexedDB)
      srs.js                   алгоритм SM-2
    firebase/
      config.example.js        шаблон конфига с __FB_*__-плейсхолдерами (коммитится)
      config.js                реальный конфиг — gitignored, генерится в CI из GitHub Secrets
      app.js                   initializeApp + экспорт auth/db/провайдеров + enableIndexedDbPersistence
    ui/
      dom.js                   escapeAttr
      toast.js                 showToast
      nav.js                   бургер/drawer/updateActiveNav/updateHeaderStreak
      keyboard.js              глобальные шорткаты
      search.js                ⌘K-модалка глобального поиска
    pages/
      home.js  lessons.js  grammar.js  flashcards.js  verbs.js
      reading.js  writing.js  culture.js  resources.js  tests.js
      progress-dashboard.js
  data/
    lessons/                   53 урока (A1/A2/B1/B2) + index.json
    grammar/                   38 тем + index.json
    vocabulary/                tier-структура (см. ниже)
    verbs/irregular.json       108 неправильных глаголов
    tests/                     15 тестов + index.json
    culture/                   22 статьи (включая 7 KNM-досье) + index.json
    reading/                   20 градуированных текстов A1–B2 + index.json
    writing/                   13 материалов + index.json
    resources/index.json       7 разделов со ссылками на внешние источники
```

Каждый файл в `pages/*` и `ui/*` — мини-модуль, который делает `Object.assign(App, { ... })` при импорте. `main.js` подключает их один раз — все методы оказываются на singletone `App`, `this.*` внутри тел рендеров работает как раньше.

## Firebase

Сайт использует две возможности Firebase:

- **Authentication** — Google Sign-in. Вход обязателен для любого пользовательского действия.
- **Firestore** — единственное хранилище прогресса. Документ `users/{uid}` содержит поле `progress` (см. схему ниже) и `updatedAt`. Оффлайн-персистентность через IndexedDB, так что короткие потери связи не ломают запись.

### Правила Firestore

Лежат в `firestore.rules`. Коротко:

- `users/{uid}` — читать и писать может только владелец (`request.auth.uid == uid`);
- разрешены только поля `progress` и `updatedAt`;
- `progress.version >= 4`, типы ключевых полей проверяются;
- удаление документа запрещено;
- всё остальное — запрещено по умолчанию.

Перед публикацией правил нужно вручную нажать Publish в Firebase Console → Firestore Database → Rules (либо пустить через Firebase CLI, в проекте не настроено).

### GitHub Secrets

Для деплоя workflow собирает `site/js/firebase/config.js` из `config.example.js`, подставляя значения из секретов:

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`

В конце деплоя workflow проверяет, что в `config.js` не осталось плейсхолдеров `__FB_*__` — если остались, деплой падает.

`config.js` находится в `.gitignore`; в репозиторий уходит только `config.example.js` с плейсхолдерами.

## Хранение прогресса

Схема `progress` (version 4):

```json
{
  "version": 4,
  "grammarViewed": ["present-tense", "imperative"],
  "lessonsCompleted": ["A1-lesson-01", "A1-lesson-02"],
  "exerciseHistory": [{ "topic": "present-tense", "correct": 4, "total": 5, "date": "..." }],
  "lessonNotes": { "A1-lesson-03": "повторить be-глаголы" },
  "srs": { "A1-lesson-01::huis": { "interval": 6, "repetition": 2, "efactor": 2.5, "nextReview": "..." } },
  "testResults": { "A1-test-1": { "correct": 38, "total": 43, "passed": true } },
  "readingRead": ["A1-text-01", "B1-text-03"],
  "writingSeen": ["email-klacht"],
  "lastActiveDate": "2026-04-22",
  "streak": 12,
  "totalCorrect": 212,
  "totalAnswered": 256
}
```

При первом входе, если в Firestore документа ещё нет, `Progress.load` достаёт легаси-буфер из `localStorage` (`dutch-progress-buffer` или `dutch-progress`), мигрирует его до v4, заливает в Firestore и чистит локальные ключи. Старый `dutch-progress.json` можно импортировать вручную через «Прогресс → Импорт JSON».

Миграции применяются на чтении: v1 → v2 нормализует ключи SRS, v2/v3 → v4 удаляет устаревшие поля (`knmResults`, `vocabLevel`, `vocabLoaded`) и гарантирует наличие всех массивов/объектов новой схемы.

`Progress.save` дебаунсится (~500 мс), пишет `setDoc` с `serverTimestamp` и `merge: true`, ошибки только логируются. `beforeunload` делает best-effort flush.

## Tier-структура словаря

Словарь разбит на четыре слоя для ленивой загрузки и навигации:

- **lessons/** — вокабуляр, привязанный к урокам.
- **core/** — частотный минимум по уровню: A1 (~630), A2 (~1100), B1 (~300), B2 (~300).
- **extended/** — тематически расширенный словарь для B1 и B2.
- **themes/** — 11 предметных блоков.

Карточки поддерживают фильтры по уровню (A1–B2) и по типу слоя.

## CI и деплой

`.github/workflows/deploy.yml` на каждый push в `main`:

1. проверяет все `site/data/**/*.json` на валидность JSON;
2. перегоняет `scripts/rebuild-vocab-index.mjs` — `vocabulary/index.json` и `search-index.json` всегда согласованы с tier-структурой;
3. собирает `site/js/firebase/config.js` из шаблона + GitHub Secrets;
4. падает, если в конфиге остался хоть один плейсхолдер `__FB_*__`;
5. выкладывает `site/` на GitHub Pages через официальные `actions/configure-pages`, `upload-pages-artifact`, `deploy-pages`.

Pages source в настройках репозитория должен быть выставлен в GitHub Actions (если вдруг сбился — **Settings → Pages → Source: GitHub Actions**).

## Локальная разработка

Для локального запуска нужно собрать `site/js/firebase/config.js` вручную:

```bash
cp site/js/firebase/config.example.js site/js/firebase/config.js
# затем подставить реальные значения из Firebase Console в поля apiKey/authDomain/...
```

`config.js` в `.gitignore`, так что случайно не закоммитится.

Поднять статику для локальной работы можно любым статик-сервером:

```bash
python3 -m http.server 8080 --directory site
# открыть http://localhost:8080/
```

Или через вшитый `scripts/server.py`:

```bash
python3 scripts/server.py --port 8080 --directory site
```

Для Google Sign-in нужно чтобы домен `localhost` был добавлен в Firebase Console → Authentication → Settings → Authorized domains (он там по умолчанию).

Прогресс пишется в тот же Firestore, что и на проде — удобно тестировать синхронизацию между локалкой и задеплоенным сайтом под одним аккаунтом.

## Клавиатурные шорткаты

| Клавиши | Действие |
|---|---|
| `Ctrl/Cmd+K`, `/` | Открыть глобальный поиск |
| `Esc` | Закрыть поиск |
| `Space`, `Enter` | Перевернуть карточку |
| `1`, `2`, `3`, `4` | Не знаю / Трудно / Хорошо / Легко |

## Скрипты сопровождения

```bash
node scripts/rebuild-vocab-index.mjs       # пересчёт vocabulary/index.json и search-index.json по tier-структуре
node scripts/normalize-lesson-titles.mjs   # унификация названий уроков
```

## Технологии

- Чистый HTML + CSS + ES2020 JavaScript-модули, без сборки и рантайм-зависимостей на своей стороне.
- Firebase Web SDK (Auth + Firestore) v10.14.1 с gstatic через ESM-импорт.
- PWA: `manifest.webmanifest` + Service Worker (`sw.js` версии v10) с оффлайн-кешем статики и stale-while-revalidate для JSON.
- Node.js 20 используется только в CI и в разовых служебных скриптах из `scripts/`.

## Лицензия и использование

Образовательный проект для личного использования при подготовке к inburgeringsexamen и Staatsexamen NT2 Programma II.
