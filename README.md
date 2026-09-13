# YouTube Hebrew Font Fix

A small browser extension and userscript that restores Hebrew text on YouTube
to Arial while leaving English and other writing systems in YouTube's original
fonts.

## Install locally

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select this project folder.
5. Open or refresh YouTube.

Click the extension button to disable the fix or switch the Hebrew font to
Tahoma. Changes are applied immediately.

## Install as a userscript

1. Install a userscript manager such as Tampermonkey, Violentmonkey, or Greasemonkey.
2. [Open the userscript](https://raw.githubusercontent.com/notguyn/YoutubeHebrewFontFix/main/youtube-hebrew-font-fix.user.js).
3. Confirm the installation in your userscript manager, then open or refresh YouTube.

Use the userscript manager's menu on YouTube to toggle the fix or choose Arial
or Tahoma. The selection is saved by the userscript manager.

## Why English is unaffected

The extension defines a local font face whose Unicode range contains only
Hebrew characters. It prepends that face to each relevant element's existing
computed YouTube font stack. Latin letters, numbers, emoji, and YouTube's icon
fonts therefore continue to use their original fonts.

## Files

- `manifest.json` — Chrome Manifest V3 configuration.
- `content.js` — detects Hebrew text, including YouTube's dynamically loaded content.
- `content.css` — Hebrew-only local font faces and the minimal override.
- `popup.*` — enable/disable and font controls.
- `youtube-hebrew-font-fix.user.js` — standalone Tampermonkey-compatible userscript.

## License

Copyright © 2026 notguyn. This project is licensed under the
[GNU General Public License version 3](LICENSE) (`GPL-3.0-only`).
