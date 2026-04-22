# Dutch Learning System

Учебное приложение для нидерландского языка с нуля до B2. Покрывает путь **inburgering (B1)** и **Staatsexamen NT2 Programma II (B2)**.

Текущий объём: 53 урока, 38 грамматических тем, ~5900 слов в tier-структуре, 108 неправильных глаголов, 22 статьи о стране (включая 7 KNM-досье), 15 тестов (12 уровневых + 3 KNM-mock), 20 градуированных текстов для чтения, 13 материалов по письму, 46 внешних ресурсов. Работает как статический сайт и как PWA (оффлайн, установка приложением).

## Два пути обучения

| Цель | Путь | Что из проекта использовать |
|---|---|---|
| **Inburgering (B1 + KNM)** | A1 → A2 → B1 + KNM | Уроки A1–B1, грамматика A1–B1, core/A1–B1 + extended/B1, темы «работа / здоровье / жильё / образование / муниципалитет / финансы», 7 KNM-досье, 3 KNM mock-теста, чтение A1–B1, письмо (formeel), культура |
| **Staatsexamen NT2 II (B2)** | A1 → A2 → B1 → B2 | Весь путь выше + уроки B2, грамматика B2, core/B2 + extended/B2, темы «медиа / экология / academisch B2», чтение B2 (публицистика, betoog, beschouwing), письмо (middellange schrijftaak, argumentatief B2) |

## Запуск

Самый простой способ — запустить лаунчер из корня проекта:

- **macOS**: двойной клик по `Dutch-Mac.command`
- **Windows**: двойной клик по `Dutch-Windows.bat`

Лаунчер:

- проверяет Python 3 и, если его нет, предлагает установить прямо в консоли (macOS — через Homebrew, Windows — через `winget`);
- закрывает старые инстансы сервера/терминала, если лаунчер уже был запущен;
- поднимает локальный сервер и открывает сайт в браузере.

Ручной запуск из корня проекта:

```bash
python3 scripts/server.py --port 8080 --directory .
```

Откройте http://localhost:8080/site/

Сервер обязательно должен отдавать корень проекта (а не только `site/`) — через него сайт и читает, и пишет `dutch-progress.json`. Стандартный `python3 -m http.server` не подойдёт: он умеет только отдавать файлы, а нам нужен ещё приём `PUT`.

Для PWA (установка, оффлайн-кеш, Service Worker) требуется `http(s)://`. При открытии `index.html` через `file://` сайт не запустится — вместо приложения покажется экран с инструкцией, как правильно запустить лаунчер.

## Структура проекта

```
Dutch-Mac.command               лаунчер для macOS: проверяет/ставит Python (Homebrew), поднимает сервер
Dutch-Windows.bat               лаунчер для Windows: проверяет/ставит Python (winget), поднимает сервер
dutch-progress.json             единственное хранилище прогресса; читается и пишется по HTTP

site/
  index.html
  manifest.webmanifest          PWA-манифест (с shortcuts: карточки, уроки, чтение, ресурсы)
  sw.js                         service worker (оффлайн-кеш)
  icons/icon.svg
  css/style.css                 единая тёмная тема + фильтры карточек + KNM-бадж
  js/app.js                     SPA: роутер, рендеры, SRS, хранилище прогресса v4
  data/
    lessons/                    53 урока (A1/A2/B1/B2) + index.json
    grammar/                    38 тем + index.json (включая modal-particles, verb-preposition, discourse-markers, word-formation, pronunciation, register-and-style, numbers-dates, fixed-expressions, verb-valency-reference)
    vocabulary/                 tier-структура
      lessons/                  53 урочных набора
      core/                     A1, A2, B1, B2 — ядро по уровням
      extended/                 B1, B2 — расширенные блоки
      themes/                   11 тематических блоков (work, health, housing, government, finance, education, media, environment, collocations, false-friends-ru, academic-b2)
      index.json                сводный индекс
      search-index.json         плоский индекс для поиска
    verbs/irregular.json        108 неправильных глаголов
    tests/                      15 тестов (по 3 варианта × 4 уровня + 3 KNM) + index.json
    culture/                    22 статьи (включая 7 KNM-досье в knm/) + index.json
    reading/                    20 градуированных текстов A1–B2 (по 5 на уровень) + index.json
    writing/                    13 материалов: formele email-шаблоны, NT2 schrijftaken, bouwstenen + index.json
    resources/                  index.json: 7 разделов со ссылками на внешние источники

scripts/
  server.py                     локальный HTTP-сервер (статика + PUT /dutch-progress.json с атомарной записью)
  rebuild-vocab-index.mjs       пересборка vocabulary/index.json и search-index.json из tier-структуры
  normalize-lesson-titles.mjs   унификация заголовков уроков
```

Все данные хранятся в JSON — единый формат для всех разделов.

## Разделы сайта

| Раздел | Описание |
|---|---|
| Главная | «Продолжить», план на сегодня, прогресс-бары уровней, сводная статистика |
| Уроки | 53 урока: лексика, диалоги, грамматика, упражнения, заметки, кросс-линки на темы |
| Грамматика | 38 тем с правилами, таблицами, примерами и упражнениями |
| Карточки | SRS (SM-2) с фильтрами по уровню и типу (core / extended / themes / lessons); сначала due-карты; ~5900 слов |
| Глаголы | 108 неправильных глаголов, сгруппированных по паттернам |
| Культура | 22 статьи о Нидерландах: общество, быт, традиции, integratietoets + 7 KNM-досье |
| Чтение | 20 текстов A1–B2 с глоссарием и вопросами на понимание |
| Письмо | Справочник: formele email, NT2 schrijftaken, bouwstenen, checklist |
| Ресурсы | 46 внешних источников (новости, подкасты, видео, словари, приложения, оfficiёle сайты) |
| Тесты | 12 уровневых (A1–B2) + 3 KNM mock-теста по 43 вопроса; автопроверка и сохранение |
| Прогресс | Heatmap активности (180 дней), результаты тестов, заметки, экспорт/импорт |
| Поиск | Глобальный поиск (`Ctrl/Cmd+K` или `/`) по урокам, темам и словам |
| PWA | Устанавливается приложением, работает оффлайн, shortcuts в манифесте |

## Tier-структура словаря

Словарь разбит на четыре слоя для ленивой загрузки и навигации:

- **lessons/** — вокабуляр, привязанный к урокам (подкачивается при открытии карточки/урока).
- **core/** — частотный минимум по уровню: A1 (~630), A2 (~1100), B1 (~300), B2 (~300).
- **extended/** — тематически расширенный словарь для B1 и B2.
- **themes/** — 11 предметных блоков: работа, здоровье, жильё, муниципалитет, финансы, образование, медиа, экология, устойчивые сочетания, ложные друзья RU-NL, академическая лексика B2.

Карточки поддерживают фильтры по уровню (A1–B2) и по типу слоя, так что можно прицельно учить, например, «только extended/B2» или «только тему academic-b2».

## Хранение прогресса

Единственный источник истины — файл `dutch-progress.json` в корне проекта. Никаких диалогов выбора файла и File System Access API нет.

- На старте сайт делает `GET /dutch-progress.json` через локальный сервер, читает прогресс, мигрирует и рендерит.
- При любом изменении идёт `PUT /dutch-progress.json` — `scripts/server.py` атомарно перезаписывает файл (tmp + `os.replace`).
- Если `PUT` упал (сервер остановили, сеть моргнула), изменения попадают в аварийный буфер в `localStorage` под ключом `dutch-progress-buffer`, и пользователь видит toast. При следующем успешном `PUT` или при следующем старте с живым сервером буфер автоматически прокидывается в файл и очищается.
- Старый ключ `dutch-progress` (если остался от предыдущей версии) при первом запуске переносится в новый буфер и удаляется — данные не теряются.

Формат файла (schema v4) — читаемый JSON:

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

Миграции выполняются автоматически при загрузке: v1 → v2 нормализует ключи SRS, v2/v3 → v4 удаляет устаревшие поля (`knmResults`, `vocabLevel`, `vocabLoaded`) и гарантирует наличие всех массивов/объектов новой схемы.

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

- Чистый HTML + CSS + ES2020 JavaScript, без сборки и зависимостей в рантайме.
- PWA: `manifest.webmanifest` + Service Worker (`sw.js` версии v6) с оффлайн-кешем статических ассетов и данных (stale-while-revalidate для JSON).
- Node.js нужен только для разовых служебных скриптов из `scripts/`.

## Лицензия и использование

Образовательный проект для личного использования при подготовке к inburgeringsexamen и Staatsexamen NT2 Programma II.
