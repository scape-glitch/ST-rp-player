# План для новой сессии — финализация RP Music Player (чистый и рабочий для ST через GitHub)

Цель: довести zero-loss modular split до конца, сделать расширение чистым, и гарантировать,
что оно ставится в SillyTavern через GitHub (Install extension by URL) и работает 1-в-1 как раньше.

Главное правило: **сохранение текущего поведения важнее красоты.** Не менять визуал, CSS, темы,
дефолтные API-ключи, baibai, localStorage-ключи и runtime-логику. Только переносить код.

---

## Текущее состояние (что уже сделано в прошлой сессии)

- `_backups/index_BACKUP_BEFORE_CLINE.js` и `_backups/manifest_BACKUP_BEFORE_CLINE.json` — бэкапы.
- `index.js` — минимальный: `import { startRpMusicPlayer } from './src/rp-player.js'; startRpMusicPlayer();`
- `src/rp-player.js` — весь код, обёрнут в `export function startRpMusicPlayer() { (IIFE) }`.
- `src/constants.js`, `src/utils.js`, `src/icons.js`, `src/css.js` — созданы (значения 1-в-1).
- В `rp-player.js` добавлены `import` из этих 4 модулей.
- ВАЖНО: внутри IIFE остались ДУБЛИРУЮЩИЕ объявления тех же имён (const/функции).
  Они затеняют импорты, поэтому поведение пока 1-в-1, но импорты фактически не используются.
- `node --check` для всех файлов проходит без ошибок.

Архитектурная проблема: код — «большое замыкание». Десятки `let` общего изменяемого
состояния (cfg, theme, uiMode, queue, curIdx, lib, radioFav, rpRejected, root, shell,
ytLayer, bodyEl, currentPlayId, posX/posY, sizes, scrollMemory и т.д.) используются почти
всеми функциями через closure. Поэтому простой вынос в ES-модули невозможен без введения
общего state-объекта.

---

## ЗАДАЧИ ДЛЯ НОВОЙ СЕССИИ

### Задача 0 — обновить бэкап перед работой
- Скопировать текущие `index.js`, `src/rp-player.js`, `manifest.json` в `_backups/` с суффиксом даты.
- Не трогать существующие файлы в `_backups`.

### Задача 1 — устранить дубли (БЕЗ state-рефакторинга) — БЕЗОПАСНО, СДЕЛАТЬ ПЕРВЫМ
Цель: реально задействовать уже созданные модули constants/utils/icons/css, удалив их
дублирующие объявления внутри IIFE в `src/rp-player.js`.

Удалить внутри IIFE (оставив только импорты сверху файла):
- Дубли констант: `const SOMA_STATIONS`, `const RADIO_CHIPS`, `const RP_LANGS`,
  `const RP_GENRES`, `const FAV_CHAT_KEY`, `const SWATCHES`, `const TEXT_SWATCHES`,
  `const MODE_LONG_PRESS_MS`, `const MODE_SWITCH_COOLDOWN_MS`, `const MODE_MOVE_CANCEL_PX`.
- Дубли `const ICONS = {...}` и `const CSS = \`...\``.
- Дубли чистых функций: `dateStamp`, `formatTime`, `extractYtVideo`, `extractYtList`,
  `hasDash`, `fetchWithCancel`, `fetchTimeout`, `withTimeout`, `esc`, `cleanTrackText`,
  `normTrackPart`, `rpTrackSigFromParts`, `rpTrackSig`, `rpTrackHuman`, `validHex`,
  `normHex`, `hexToRgb`, `safeFileName`.

Тонкости:
- `SOMA_STATIONS` мутируется (push в `loadMoreSomaStations`) — импортированный массив
  мутировать можно, push работает. Оставить логику как есть.
- После каждого удаления — `node --check src/rp-player.js`.
- Делать удаления маленькими пакетами (по 3-5 за раз), сверяясь с актуальным содержимым файла.
- НЕ менять реализацию, только удалять дубли. Если функция в utils.js хоть на символ
  отличается от версии в rp-player.js — сначала привести utils.js к оригиналу 1-в-1, потом удалять.

Результат: модули constants/utils/icons/css реально используются, поведение 1-в-1.

### Задача 2 — ввести общий state-модуль (фундамент для дальнейшего выноса)
- Создать `src/state.js` с единым объектом, экспортирующим всё изменяемое состояние, напр.:
  `export const state = { cfg, theme, uiMode, queue, curIdx, isPlaying, lib, radioFav,
   rpRejected, root, shell, ytLayer, bodyEl, currentPlayId, posX, posY, ... }`.
- В `rp-player.js` заменить обращения к локальным `let` на `state.X`.
  Это самая трудоёмкая и рискованная часть. Делать поэтапно, по группам переменных,
  с `node --check` после каждой группы и (по возможности) ручной проверкой в ST.
- Альтернатива (если state-рефактор слишком рискован): оставить весь stateful-код в
  `rp-player.js` как есть и НЕ дробить дальше. Это допустимый финал.

### Задача 3 — вынести модули, зависящие от state (только ПОСЛЕ Задачи 2)
Порядок по возрастанию риска. После каждого — `node --check` + ручная проверка:
1. `src/logger.js` — log/info/warn/error/dbg (зависит от DEBUG → положить DEBUG в state).
2. `src/storage.js` — saveCfg/loadQueue/saveQueue/saveLib/saveRadioFav/saveRpRejected,
   backupAll/importBackup/triggerImport/fullReset, миграции. НЕ менять schema/ключи.
3. `src/st-context.js` — stContext/getChatId/getChatName/getProfiles/selectedProfileId/
   profileExists/profileName/getRecentMessages/callModel(CMRS+generateQuietPrompt)/bindChatEvents.
4. `src/sources.js` — Jamendo/YouTubeAPI/YouTubeLink/Baibai/CCMixter/FMA/ALL_SOURCES/
   srcByKey/getNetEaseStream/tryInvidiousStream/tryPipedStream/getTrackAudioStream/loadBaibai.
   НЕ менять fallback order, НЕ отключать дефолтные ключи, НЕ менять BAIBAI_JS.
5. `src/player.js` — audio, playIndex/togglePlay/next/prev/removeFromQueue/clearQueue/
   stopAudio/stopYt/fallbackToYtIframe/ensureYtIframeApi/checkYtEmbedAllowed/
   findReplacementForTrack/replaceOrSkipTrack/badMedia-логика. НЕ менять race guards/currentPlayId.
6. `src/rp.js` — buildRpPrompt/buildMemePrompt/parseRpJson/runRpAnalysis/rpQuickVibe/
   rpAutoTrigger/onChatMessage/avoid-логика/getFavoriteHints. НЕ менять prompt semantics.
7. `src/playlists.js` — manual/rp/favorites CRUD, экспорт текст/JSON.
8. `src/radio.js` — playRadio/searchRadioBrowser/loadMoreSomaStations/radio favorites.
9. `src/ui/templates.js` — все *HTML() функции (pill/panel/fab/tabs/drawers/color/rp/radio/results).
10. `src/ui/events.js` — onPointerDown/Move/Up/Cancel, onClick, onKey, onInput, INTER_SEL.
11. `src/ui/layout.js` — applyPos/applyUserSize/switchUiMode/clamp/panelPosFromMini/
    fabPosFromPoint/drag/resize/return anchor/topBarOffset/VW/VH.
- `src/render.js` (или оставить render в rp-player.js) — связывает templates + state.

### Задача 4 — проверка manifest и загрузки через ES-модули
- Подтвердить, что ST грузит `index.js` как модуль и относительные `import './src/...'` резолвятся.
  Если в целевой версии ST это не работает — обсудить с пользователем fallback (один файл или
  inline-склейка при сборке), НЕ менять поведение.
- Проверить `manifest.json`: `"js": ["index.js"]`, `"css": ["style.css"]` — оставить как есть,
  если не доказано обратное.

### Задача 5 — чистка репозитория для GitHub (с явного разрешения пользователя)
- Спросить разрешение на удаление файлов (правило: удаление файлов — только с разрешения).
- Кандидаты на проверку: `index.html` (нужен ли он расширению ST? возможно остаток шаблона),
  лишние временные файлы. НЕ удалять без подтверждения.
- Проверить `.gitignore` (добавить, если нужно: node_modules, временные).
- Обновить `README.md`: установка через ST «Install extension» по URL репозитория,
  список фич, требования. Не выдумывать фичи — только реально существующие.
- Проверить `LICENSE.txt` — оставить.
- Убедиться, что `_backups/` не мешает (можно оставить в репо или добавить в .gitignore —
  спросить пользователя; по умолчанию НЕ трогать).

### Задача 6 — финальная валидация
- `node --check` для index.js и всех src/**/*.js.
- Прогнать сценарий ручной проверки в SillyTavern (см. чек-лист ниже).
- Только после успеха — предложить пользователю git add/commit/push
  (git-команды и commit — ТОЛЬКО с явного разрешения пользователя).

---

## ЧЕК-ЛИСТ РУЧНОЙ ПРОВЕРКИ В SILLYTAVERN (после каждого крупного этапа)
1. Виджет появляется один раз (нет дублей; `window.__rpPlayerLock`).
2. Pill / panel / fab и все переходы (long-press, drag-to-fab, return anchor).
3. Drag / resize, сохранение позиций и размеров между перезагрузками.
4. Темы (default/glass/neon/paper/minimal) + кастом: акцент, цвет текста, тёмная/светлая
   подложка, фон (URL/файл), прозрачность — «эта тема» и «все темы».
5. Источники: YouTube API, Jamendo, YT-ссылка, baibai, ccMixter, FMA; fallback на стримы
   (NetEase/Invidious/Piped) и на YouTube iframe.
6. Радио: SomaFM (+загрузить ещё), Radio Browser, избранные станции.
7. RP: quick «Вайб сцены», auto каждые N сообщений, язык/жанр/мем, профили подключения,
   fallback generateQuietPrompt, avoid/rejected логика.
8. Favorites (♥), ручные плейлисты, RP-плейлисты по чатам, очередь, переименование/удаление.
9. Backup / Import / Export (txt/json), миграции localStorage, полный сброс.

---

## ЖЁСТКИЕ ЗАПРЕТЫ (повторно, для новой сессии)
- Не менять визуал, CSS-значения, селекторы, темы, кастомные настройки тем.
- Не убирать/менять дефолтные API-ключи (DEFAULT_JAMENDO_KEY, DEFAULT_YT_KEY).
- Не отключать baibai, не менять BAIBAI_JS.
- Не менять localStorage-ключи без существующей миграции.
- Не менять prompt semantics, fallback order, race guards.
- Не добавлять зависимости/бандлер/React/Vue/TS.
- Не трогать `_backups/`.
- Удаление файлов, git commit/reset/rebase/merge, npm install — ТОЛЬКО с явного разрешения.
- Если выбор между «архитектурно красивее» и «точно сохранить поведение» — всегда поведение.

---

## РЕКОМЕНДУЕМЫЙ ПОРЯДОК
1. Задача 0 (бэкап) → Задача 1 (убрать дубли — безопасно, даёт реально работающие модули).
2. Решить с пользователем: нужен ли полный split (Задачи 2-3) или остановиться после Задачи 1.
3. Задачи 4-6 (manifest, чистка репо, README, валидация, push) — для готовности к GitHub.
