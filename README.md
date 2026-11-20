# Word🤓☝️ — Word Lookup for Z-Library

An Edge and Chrome extension that shows short English definitions while you read. It uses [Free Dictionary API](https://github.com/meetDeveloper/freeDictionaryAPI) by default and supports Merriam-Webster’s Learner’s Dictionary with your own API key.

## ⚠️ Start Word manually on every new reading page

> [!IMPORTANT]
> **Word does not start automatically. On each new Z-Library reading page, click the browser’s Extensions (puzzle piece) icon → Word🤓☝️ → Start word lookup.** The lookup panel and hand cursor appear after you start it.

## Install

1. Download **Source code (zip)** from the [latest release](../../releases/latest) and extract it.
2. Open `edge://extensions` or `chrome://extensions` and turn on developer mode.
3. Choose **Load unpacked** and select the folder containing `manifest.json`.

## Read and look up words

- Click an English word in the body text. The cursor becomes a hand over words you can look up. Double-click still selects text.
- Click 🤪 to enter a word manually. Press Escape or click × to close the definition.
- If you use another HTTPS mirror, the browser may ask for site access when you start lookup.
- Browser-native PDF viewers, scanned pages, and cross-origin frames without permission may not expose clickable text to the extension.

## Merriam-Webster

[Register for an API key](https://dictionaryapi.com/register/index) and select **Learners Dictionary**. In the extension menu, paste the key and choose **Save**. Clear and save the field to switch back to Wiktionary.

The key stays in the browser’s local extension storage and is sent only to Merriam-Webster’s official API when that dictionary is selected. [Merriam-Webster API FAQ](https://dictionaryapi.com/info/frequently-asked-questions)

Lookups send the requested word to the active dictionary. Wiktionary text is credited in the popup under the license reported by Free Dictionary API, CC BY-SA 3.0.

## Version history

| Version | Improvements |
| --- | --- |
| [0.4.4](../../releases/tag/v0.4.4) | Starts only from the browser’s Extensions menu. Opening, refreshing, or navigating to a new reader page turns lookup off. |
| [0.4.3](../../releases/tag/v0.4.3) | Matched the Heartstopper look with a white background at 30% opacity and a white dashed outline, including in dark mode. |
| [0.4.2](../../releases/tag/v0.4.2) | Opened the reader prompt before connecting to embedded EPUB frames and added clear status messages to the extension menu. |
| [0.4.1](../../releases/tag/v0.4.1) | Improved support for embedded EPUB frames and made the American English confirmation activate click lookup immediately. |
| [0.4.0](../../releases/tag/v0.4.0) | Limited the lookup panel to reader pages, added support for `z-lib.sk`, switched the UI to English, added a hand cursor, and moved the Merriam-Webster logo to settings. |
| [0.3.0](../../releases/tag/v0.3.0) | First GitHub version. Added one-click and manual word lookup, with Wiktionary by default and an optional Merriam-Webster Learner’s Dictionary key. |

## FAQ

### Why don’t I see Word when I open a book?

Word starts off on every new reading page. On the page where you can see the book text, click **Extensions (puzzle piece) → Word🤓☝️ → Start word lookup**, then return to the book. Repeat after refreshing or opening a different reading page.

### The panel is open. How do I look up a word?

Move your cursor over an English word in the book and click it once. If the text is in a scanned page, a PDF viewer, or a frame Word cannot access, click **🤪** in the panel and type the word.

### Do I need a Merriam-Webster API key?

You can start with Wiktionary without a key. To use Merriam-Webster, enter your own **Learners Dictionary** key in the Word menu and click **Save**.

### Edge says the manifest is missing. Which folder should I choose?

Extract the ZIP first. In **Load unpacked**, choose the folder that directly contains `manifest.json`. If extraction created two nested folders with similar names, choose the inner one.

### How do I update Word?

Extract the latest ZIP, copy the new files into your existing Word extension folder, and click **Reload** on the Word card at `edge://extensions` or `chrome://extensions`. Refresh the reading page and start Word again from the Extensions menu.
