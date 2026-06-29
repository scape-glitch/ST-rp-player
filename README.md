# 🎵 SillyTavern RP Music Player
*Woooow! Player! Radio! RP functions! Peak!* 🎧✨

*[🇷🇺 Переключение на русский язык ниже (Russian version below)](#-русская-версия)*

---

## 🔑 IMPORTANT: API Keys Guide
I **highly recommend** creating your own API keys for Jamendo and YouTube to unlock the full potential of this extension without hitting public limits!

### 🎧 1. Jamendo — Client ID
**Why?** Free music search (indie, electronic, ambient, etc.).

**Steps to get:**
1. Go to the [Jamendo Developer Portal](https://devportal.jamendo.com/).
2. Click **Sign up**, register (email + password), and verify your email.
3. Log in and go to the **My Applications** (or Apps) tab.
4. Click **Create new application**.
5. Fill in the details:
   - **Name:** anything (e.g., *MyPlayer*)
   - **Description:** anything (e.g., *music widget*)
   - **Website / Callback:** you can just use `http://localhost`
6. Click **Create**.
7. Copy the **Client ID** (a short string of letters/numbers, NOT the Client Secret).

**Where to paste it:**
Open the widget ➔ 🔍 **Search** ➔ **Source** tab ➔ Select **Jamendo** ➔ Paste into the **Jamendo Client ID** field.
> ✅ *Done! The limit is very generous, and the key is free forever.*

### ▶️ 2. YouTube — API Key
**Why?** Search across all of YouTube (mainstream music, anything you want). Use wisely — it has a daily quota.

**Steps to get:**
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Log into your Google account *(using a secondary/alt account is recommended)*.
3. Click the project dropdown at the top ➔ **New Project** ➔ any name ➔ **Create**.
4. Wait for it to be created, then select this project from the top dropdown.
5. In the left menu (☰), go to **APIs & Services** ➔ **Library**.
6. Search for **YouTube Data API v3** ➔ Open it ➔ Click **Enable**.
7. Go to the left menu again ➔ **APIs & Services** ➔ **Credentials**.
8. Click **+ Create Credentials** at the top ➔ **API key**.
9. Copy the generated key (starts with `AIza...`).

**Where to paste it:**
Open the widget ➔ 🔍 **Search** ➔ **Source** tab ➔ Select **YouTube API** ➔ Paste into the **YouTube API key** field.

> ⚠️ **Important YouTube Notes:**
> - **Quota:** You get roughly ~100 searches per day for free. It's enough for personal RP, but not for spamming.
> - If you need more, create multiple projects with different keys.
> - **DO NOT** publish your key publicly (like on GitHub) — Google will detect it and block it.

---

## 💡 Good to know
**Default keys are already built into the script.** However, because they are shared, their limits might be exhausted quickly. 
Having your own keys guarantees that everything will work smoothly 24/7 with your personal quota. (Keys aren't strictly necessary for Baibai/ccMixter/FMA, but for active YouTube usage, a personal key is highly recommended).

---
---

<a name="-русская-версия"></a>
## 🇷🇺 Русская версия

# 🎵 SillyTavern RP Music Player
*Woooow! Плеер! Радио! РП функции! Peak!* 🎧✨

## 🔑 ВАЖНОЕ ПРО КЛЮЧИ: Гайд
Настоятельно советую создать свои ключи для Jamendo и YouTube API, чтобы пользоваться возможностями скрипта на максимум и не зависеть от лимитов!

### 🎧 1. Jamendo — Client ID
**Зачем:** бесплатный поиск музыки (инди, электроника, эмбиент).

**Как получить:**
1. Зайди на [Jamendo Developer Portal](https://devportal.jamendo.com/).
2. Нажми **Sign up** → зарегистрируйся (email + пароль) и подтверди почту.
3. Войди в аккаунт и открой вкладку **My Applications** (или Apps).
4. Нажми **Create new application**.
5. Заполни поля:
   - **Name:** любое (напр., *MyPlayer*)
   - **Description:** любое (напр., *music widget*)
   - **Website / Callback:** можно вписать `http://localhost`
6. Создай приложение. Откроется страница с данными.
7. Скопируй **Client ID** (строка из букв/цифр, НЕ Client Secret!).

**Куда вставить:**
Открой виджет ➔ 🔍 **Поиск** ➔ вкладка **«Источник»** ➔ выбери **Jamendo** ➔ вставь в поле **Jamendo Client ID**.
> ✅ *Готово. Лимит очень щедрый, ключ бесплатный навсегда.*

### ▶️ 2. YouTube — API ключ
**Зачем:** поиск по YouTube (мейнстрим, всё подряд). Трать осознанно — есть дневная квота.

**Как получить:**
1. Зайди в [Google Cloud Console](https://console.cloud.google.com/).
2. Войди в Google-аккаунт *(лучше использовать отдельный/твинк, а не основной)*.
3. Сверху нажми на выпадающее меню проектов ➔ **New Project** ➔ введи любое имя ➔ **Create**.
4. Дождись создания и выбери этот проект в том же верхнем меню.
5. В левом меню (☰) перейди в **APIs & Services** ➔ **Library**.
6. В поиске набери **YouTube Data API v3** ➔ открой ➔ нажми **Enable**.
7. Снова слева: **APIs & Services** ➔ **Credentials**.
8. Сверху нажми **+ Create Credentials** ➔ **API key**.
9. Ключ создан! Скопируй его (это строка, начинающаяся на `AIza...`).

**Куда вставить:**
Открой виджет ➔ 🔍 **Поиск** ➔ вкладка **«Источник»** ➔ выбери **YouTube API** ➔ вставь в поле **YouTube API ключ**.

> ⚠️ **Важно про YouTube:**
> - **Квота:** примерно ~100 поисков в день бесплатно. Хватит для РП, но не для спама.
> - Если жжёшь много — заведи несколько твинк-проектов с разными ключами.
> - **НЕ ПУБЛИКУЙ** ключ в открытом доступе (на GitHub и т.п.) — Google его найдёт и заблокирует.

---

## 💡 ПРИЕМ-ПРИЕМ
Оба поля ЖЕЛАТЕЛЬНЫ, **НО в скрипт уже встроены ключи по умолчанию**. Однако лимиты по ним общие для всех и могут быть исчерпаны. 

Свои ключи нужны, чтобы всё точно работало в любое время, и у вас была своя личная квота. Для Jamendo, Baibai, ccMixter и FMA ключи не так критичны, но для активного использования YouTube — крайне желательно иметь свой!

---
*by s.cape*
