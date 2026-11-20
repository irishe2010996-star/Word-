# Word🤓☝️

An Edge and Chrome extension that shows short English definitions while you read. It uses [Free Dictionary API](https://github.com/meetDeveloper/freeDictionaryAPI) by default and supports Merriam-Webster’s Learner’s Dictionary with your own API key.

## Install

1. Download the repository as a ZIP and extract it.
2. Open `edge://extensions` or `chrome://extensions` and turn on developer mode.
3. Choose **Load unpacked** and select the folder containing `manifest.json`.

## Read and look up words

- Open a book in Z-Library’s online reader. On supported reader pages, choose **Enable**, then **Start**.
- Click an English word in the body text. The cursor becomes a hand over words you can look up. Double-click still selects text.
- Click 🤪 to enter a word manually. Press Escape or click × to close the definition.
- If you use another HTTPS mirror, open the extension menu and choose **Enable on this site**. The prompt appears when the extension detects the reader.
- Browser-native PDF viewers, scanned pages, and cross-origin frames without permission may not expose clickable text to the extension.

## Merriam-Webster

[Register for an API key](https://dictionaryapi.com/register/index) and select **Learners Dictionary**. In the extension menu, paste the key and choose **Save**. Clear and save the field to switch back to Wiktionary.

The key stays in the browser’s local extension storage and is sent only to Merriam-Webster’s official API when that dictionary is selected. [Merriam-Webster API FAQ](https://dictionaryapi.com/info/frequently-asked-questions)

Lookups send the requested word to the active dictionary. Wiktionary text is credited in the popup under the license reported by Free Dictionary API, CC BY-SA 3.0.
