# SillyTavern RP Music Player

RP Music Player is a third-party SillyTavern extension that adds a floating music widget for roleplay sessions. It can search and play music from several sources, manage queues and playlists, save favorites, play radio stations, and suggest tracks based on the current RP scene.

RP Music Player — стороннее расширение для SillyTavern с плавающим музыкальным виджетом для ролеплея. Оно умеет искать и воспроизводить музыку из разных источников, управлять очередью и плейлистами, сохранять избранное, включать радио и подбирать треки под текущую RP-сцену.

## Features

- Music widget for SillyTavern
- Pill / panel / fab modes
- Draggable / resizable widget
- Themes and appearance settings
- Queue
- Favorites
- Playlists / library
- Radio
- YouTube
- Jamendo
- baibai
- ccMixter
- FMA
- RP-aware music suggestions
- Backup/import/export

## Installation

Install it as a third-party SillyTavern extension from this repository:

```text
https://github.com/scape-glitch/ST-rp-player
```

Typical installation flow:

1. Open SillyTavern.
2. Go to the Extensions panel.
3. Use the third-party extension installer.
4. Paste the repository URL.
5. Install or update the extension.
6. Reload SillyTavern if needed.

Manual installation is also possible by placing the repository folder into SillyTavern's third-party extensions directory and restarting SillyTavern.

## Usage

After installation, the widget appears inside SillyTavern. It can be used in several modes:

- **Pill mode**: compact floating player.
- **Panel mode**: expanded interface with search, radio, RP settings, library, and queue.
- **Fab mode**: small floating action button.

Use the widget to search for tracks, add them to the queue, save favorites, create playlists, play radio, or request RP-aware suggestions from the current chat context.

The widget stores its settings and library data locally in the browser through SillyTavern/localStorage.

## API keys

The extension includes default API keys where applicable, but shared keys can hit public limits. For more reliable usage, add your own keys in the widget settings.

### Jamendo Client ID

1. Open the Jamendo developer portal: <https://devportal.jamendo.com/>
2. Create an account or sign in.
3. Create an application.
4. Copy the Client ID.
5. Paste it into the Jamendo Client ID field in the widget.

### YouTube API key

1. Open Google Cloud Console: <https://console.cloud.google.com/>
2. Create or select a project.
3. Enable YouTube Data API v3.
4. Create an API key.
5. Paste it into the YouTube API key field in the widget.

Keep personal API keys private and avoid publishing them in public repositories.

## Project structure

The extension is partially modularized into styles, constants, utilities, icons, storage, music sources, stream helpers, radio helpers, library helpers, and the main runtime.

```text
ST-rp-player/
├─ index.js              Extension entry point
├─ manifest.json         SillyTavern extension manifest
├─ style.css             Runtime widget styles
├─ index.html            GitHub preview landing page
├─ README.md             Project documentation
├─ LICENSE.txt           License file
└─ src/
   ├─ constants.js       Constants and default values
   ├─ icons.js           Inline SVG icons
   ├─ utils.js           Shared utility helpers
   ├─ storage.js         Local storage helpers
   ├─ sources.js         Music source integrations
   ├─ player-streams.js  Stream resolution helpers
   ├─ radio.js           Radio helpers
   ├─ library.js         Library, favorites, and playlist helpers
   └─ rp-player.js       Main widget runtime
```

## Troubleshooting

### The widget does not appear

- Make sure the extension is installed and enabled in SillyTavern.
- Reload SillyTavern after installation or update.
- Check the browser console for extension loading errors.

### Search returns few or no results

- Try another source in the widget source settings.
- Add your own Jamendo Client ID or YouTube API key.
- Check whether the selected source has public rate limits or availability issues.

### YouTube playback is unreliable

YouTube availability can depend on embeds, API quotas, stream extraction, and regional restrictions. If a track fails, try another result or another music source.

### RP-aware suggestions do not work

- Make sure SillyTavern has an active chat context.
- Check the selected connection profile in the RP settings.
- Verify that your model/provider can respond to the prompt.

### Settings or playlists are missing

The extension stores data locally in the browser. Browser profile changes, site data cleanup, private mode, or a different SillyTavern URL can affect stored data. Use backup/import/export to preserve important data.

## Security note for third-party extensions

Third-party SillyTavern extensions run inside your SillyTavern browser session and can interact with the page. Install extensions only from sources you trust, review code before use when possible, and keep private API keys secure.

## License

See [LICENSE.txt](LICENSE.txt).