# Dutch Learning — UI / UX Kit

Источник правды по цвету: **палитра + семантика** в `src/styles/base.css`.  
Классы: `components.css`, `layout.css`, `pages.css`.

Цель: тёмный учебный интерфейс с оранжевым NL-акцентом. Не маркетинговый лендинг.

**Бренд-марк:** градиент `--orange-600` → `--orange-300` + `--text-on-accent`. Хедер / футер / auth / favicon — один марк. Название: **Dutch Learning**.

Опираемся на практики design systems: один primary на зону, secondary слева / primary справа в LTR footer, равная высота кнопок, без декоративных рамок вокруг actions.

---

## 1. Принципы

1. **Один фокус на экране / в зоне.**
2. **Контраст ≥ WCAG AA** (4.5:1 body, 3:1 крупный UI).
3. **Цвета только из палитры** — не хардкодить hex в компонентах.
4. **Accent = действие.** Orange — CTA, active, ссылки. Sky — только ambient wash / info, не в hero/CTA.
5. **Карточка = клик или смысловой блок.**
6. **Моушн сдержанный.** `prefers-reduced-motion`.
7. **Не ломать поведение.**

Избегать: purple/indigo темы, cream+terracotta «AI-дефолт», glow-neon, emoji как UI.

---

## 2. Палитра (core → semantic)

Сначала **core** (`--navy-*`, `--orange-*`, …), потом **semantic** (`--bg`, `--accent`, …).  
В UI всегда бери semantic. Core меняешь, когда правишь бренд целиком.

### Core

| Группа | Токены | Роль |
|---|---|---|
| Navy | `--navy-950`…`--navy-500` | Фоны, elev, hover |
| Ink | `--ink-50`, `--ink-200/300/400` | Текст на тёмном |
| Orange | `--orange-300`…`--700`, `--orange-tint`, `--orange-ink` | Бренд |
| Sky | `--sky-400`…`--800` | Ambient / info (не в hero fill) |
| Green / Red / Amber | `--green-*`, `--red-*`, `--amber-*` | Статус, уровни, heatmap |

### Semantic (использовать в CSS)

| Токен | = | Куда |
|---|---|---|
| `--bg` / `--bg-elev` / `--bg-card` / `--bg-hover` | navy | Страница, chrome, карточки |
| `--text` / `--text-muted` | ink | Текст |
| `--text-on-accent` | orange-ink | Текст на solid orange |
| `--text-accent-soft` | orange-tint | Active nav, soft accent text |
| `--accent` / `--accent-hover` / `--accent-strong` / `--accent-soft` | orange | CTA, ссылки, soft fills |
| `--hero-start` / `--hero-mid` / `--hero-end` | orange → card | `.page-hero`, `.continue-card` |
| `--green` / `--green-text` / `--green-soft` | green | Success |
| `--red` / `--red-text` / `--red-soft` | red | Error |
| `--blue` / `--blue-text` / `--blue-soft` | sky | Info callouts |
| `--yellow` / `--yellow-text` / `--amber` | amber | Warn / streak |
| `--brand-mark-end` | light orange | NL tile / icon gradient end |
| `--level-a1-*` … `--level-knm-*` / `--level-all-*` | level badges | Только `.badge-*` |
| `--text-on-solid` | white | Текст на green/red/blue solid |

### Правила палитры

1. Новый цвет → сначала core swatch, потом semantic alias, потом класс.
2. **Не мешать sky + orange в одном fill** (hero, continue, primary) — получается «грязь».
3. Sky допустим: ambient на `body`, callout-tip, info.
4. В компонентах: `var(--accent)`, не `#ff7a45`.

### Форма

`--radius` (16), `--radius-sm`, `--radius-pill`, `--border`, `--shadow`, `--focus-ring`, `--ease`, `--container` (1024).

---

## 3. Типографика

- UI: `var(--font)` (Inter).
- Код / шаги: `var(--mono)`.
- `h1`: clamp, вес ~750.
- Учебный текст не в `--text-muted`.

---

## 4. Кнопки и группы действий

### Иерархия (обязательно)

| Уровень | Класс | Когда |
|---|---|---|
| Primary | `.btn.btn-primary` | **Одно** главное действие в зоне (Next, Submit, Continue) |
| Secondary | `.btn.btn-secondary` | Альтернатива / Back / Mark complete |
| Ghost / tertiary | `.btn.btn-ghost` | Опционально (Карточки, «ещё…») — не спорит с primary |
| Success / Danger | `.btn-success` / `.btn-danger` | Статус «сделано» / деструктив |

Правила (как в типовых design systems):

1. **Один primary на зону решения.** На конце урока primary = **Отметить пройденным** (центр); prev/next — secondary по краям.
2. **В LTR lesson footer:** Back слева, Next справа; главный статусный CTA по центру.
3. **Не смешивать** secondary и ghost как «оба главные» рядом с primary.
4. **Подпись = глагол действия:** «Отметить пройденным», «Дальше · A1 · Урок 2», не «OK».
5. **Одинаковая высота в группе.** Базовый `.btn`: `min-height: 2.5rem`, `box-sizing: border-box`, у всех вариантов `border: 1px` (у primary — transparent/токен), `inline-flex` + `align-items: center`. Не допускать, чтобы `<a class="btn">` и `<button class="btn">` отличались по высоте из‑за border/line-height.
6. **Touch target ≥ ~40px** (у нас min-height 2.5rem).
7. **Gap между кнопками** 8–16px (`.6–.75rem`), чтобы не кликать мимо.

### Чего не делать с кнопками

- Не сажать группу кнопок в декоративную card / glass-рамку «для красоты» — разделитель `border-top` достаточен для page footer.
- Не делать две primary в одном ряду (например «Карточки» и «Следующий урок» оба orange).
- Не менять `font-weight` только у active-состояния навигации так, чтобы прыгала ширина.
- Не полагаться только на цвет для смысла (иконка/текст рядом).

### Паттерн: конец урока (`.lesson-end`)

```
border-top
[ ← Prev — secondary ]   [ Отметить пройденным — primary ]   [ Next — secondary ]
                              Карточки к уроку  (текстовая ссылка)
```

- **Ручная пройденность** — осознанный выбор: урок можно смотреть без отметки.
- Primary в центре = «Отметить»; prev/next по краям, secondary (симметрия навигации).
- После отметки кнопка → `.btn-success` («Пройдено»), клик снимает отметку.
- Карточки — доп. материал: обычная ссылка под рядом, не кнопка.
- Без decorative card/glass вокруг кнопок.
- Milestone уровня — текст + secondary «К тестам».
- Mobile: сначала Отметить, затем Next/Prev на всю ширину, ссылка карточек под ними.

---

## 5. Остальные компоненты

### Навигация сайта

- `.nav-link` + `.active` — пилюля `--accent-soft`.
- Desktop: `#nav-materials` закрывается вне / Escape / переход; без SSR `open`.
- Mobile ≤860px: drawer; Материалы всегда раскрыты; без `backdrop-filter` на header.

### Поверхности контента

- `.page-hero` / `.culture-hero` — ввод страницы.
- `.continue-card` — один CTA «продолжить».
- `.card` — каталоги / интерактив; не для footer actions.

### Заголовки секций по уровню

В `.page-section__head` пишем обычный текст: **`Уровень A1`**, не `<Badge>` внутри `h2`.  
Счётчик — отдельно в `.page-section__count`.  
`.badge` оставляем для мета-меток **внутри карточек** (уровень на карточке урока/теста), не для заголовка секции.

### Фильтры / статус / формы

- `.filter-bar` + `.pill`, `.badge-*` (только как метки, не как h2).
- Feedback: цвет + текст (`.exercise-feedback`, `.test-option.is-*`).
- `.search-box` / `.exercise-input` — focus → accent.

---

## 6. Контраст (чеклист)

- [ ] Body / muted на `--bg` и `--bg-card`
- [ ] Primary: `--text-on-accent` на оранжевом
- [ ] Success/error text-токены на тёмном
- [ ] Focus-visible на кнопках и ссылках
- [ ] Disabled ≠ обычная кнопка

---

## 7. UX-паттерны продукта

| Сценарий | Паттерн |
|---|---|
| Старт | Auth → Home: hero → continue → план → разделы |
| Урок | Breadcrumb → контент → `.lesson-end` (prev | отметить | next + ссылка карточек) |
| SRS | Flip → Again/Hard/Good/Easy |
| Тест | Вопрос → варианты → explanation |
| Упражнения урока | Выбор/ввод без подсветки и без спойлера ответа → «Проверить ответы» → green/red + правильный ответ |
| Списки | Hero + filter + grid; пустые состояния текстом |
| Мобилка | Одна колонка; таблицы в scroll-обёртках |

Футер сайта: на всю ширину, логотип слева / meta справа (не `.container`-центрирование блока).

---

## 8. Сетка

- `max-width: var(--container)` для **main**, не обязательно для chrome footer.
- Брейкпоинты: 960 / 860 (nav) / 768 / 640 / 560 / 480.

---

## 9. Do / Don’t

**Do**

- Токены из `:root`.
- Один primary на зону; равная высота `.btn` в группе.
- Page footer = `border-top` + flex, без лишней рамки.
- Сохранять classnames, на которых висят страницы.

**Don’t**

- Glass/card вокруг кнопок без интерактивной необходимости.
- Две primary в одном ряду.
- Белый текст на светлом orange.
- Инлайн-цвета в JSX вместо токенов/классов.
- Менять z-index оверлеев без проверки.

---

## 10. Как добавлять UI

1. Нужен ли новый блок или хватает `.btn` / `.lesson-end` / `.callout`?
2. Токен → класс в `components.css` (общее) или `pages.css` (страница).
3. Проверить: иерархия кнопок, высота в группе, контраст, 375px width.
4. Не ломать store/router контракты.

---

## 11. Референс классов

```
Layout:   .container .logo .logo-mark .nav-link .site-footer .auth-gate
Surfaces: .page-hero .card .continue-card .filter-bar
Actions:  .btn .btn-primary .btn-secondary .btn-ghost .btn-success .lesson-end
Content:  .callout-* .dialogue .phrase-box .breadcrumb
Learning: .flashcard* .test-option .verbs-group .culture-card
```

При сомнении по концу урока: **Отметить = primary по центру**; prev/next secondary по краям; карточки — ссылка; высота из общего `.btn`; без декоративной коробки.
