const key = document.querySelector('#merriam-key');
const save = document.querySelector('#save');
const dictionaryStatus = document.querySelector('#dictionary-status');

async function loadDictionary() {
  try {
    const { merriamWebsterKey } = await chrome.storage.local.get('merriamWebsterKey');
    key.value = merriamWebsterKey ?? '';
    save.disabled = false;
  } catch {
    dictionaryStatus.textContent = 'Could not load dictionary settings.';
  }
}

document.querySelector('form').addEventListener('submit', async event => {
  event.preventDefault();
  const merriamWebsterKey = key.value.trim();
  save.disabled = true;
  try {
    if (merriamWebsterKey) {
      await chrome.storage.local.set({ merriamWebsterKey });
    } else {
      await chrome.storage.local.remove('merriamWebsterKey');
    }
    dictionaryStatus.textContent = merriamWebsterKey ? 'Saved. Using Merriam-Webster.' : 'Now using Wiktionary.';
  } catch {
    dictionaryStatus.textContent = 'Could not save dictionary settings.';
  } finally {
    save.disabled = false;
  }
});

loadDictionary();

const siteStatus = document.querySelector('#site-status');
const enable = document.querySelector('#enable');

async function start() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url?.startsWith('https://')) {
    const pattern = `https://${new URL(tab.url).hostname}/*`;
    enable.disabled = false;
    enable.addEventListener('click', () => registerSite(tab.id, pattern));
  }
}

async function registerSite(tabId, pattern) {
  enable.disabled = true;
  siteStatus.textContent = 'Checking reader access…';
  const host = new URL(pattern).hostname;
  const target = { tabId, frameIds: [0] };
  const files = ['word.js', 'reader.js'];

  try {
    const builtIn = chrome.runtime.getManifest().content_scripts[0].matches.some(match => {
      const base = match.slice('https://*.'.length, -2);
      return host === base || host.endsWith('.' + base);
    });
    if (!builtIn) {
      const granted = await chrome.permissions.request({ origins: [pattern] });
      if (!granted) {
        siteStatus.textContent = 'Edge did not grant site access.';
        return;
      }

      const id = 'site-' + host;
      if (!(await chrome.scripting.getRegisteredContentScripts({ ids: [id] })).length) {
        await chrome.scripting.registerContentScripts([{
          id, matches: [pattern], js: files,
          allFrames: true, matchOriginAsFallback: true, runAt: 'document_idle'
        }]);
      }
    }

    // A protected child frame can prevent an all-frames injection from succeeding.
    // Start lookup in the top-level reader independently before reconnecting to book frames.
    try {
      await chrome.scripting.executeScript({ target, files, injectImmediately: true });
    } catch {
      siteStatus.textContent = 'Edge blocked access to this page. Check Word’s site access.';
      return;
    }

    let result;
    try {
      result = await chrome.tabs.sendMessage(tabId, { type: 'start-lookup' }, { frameId: 0 });
    } catch {
      siteStatus.textContent = 'Word loaded but could not start. Reload the reader.';
      return;
    }

    if (result === 'open') {
      siteStatus.textContent = 'Word is on. Click a word in the reader.';
      chrome.scripting.executeScript({ target: { tabId, allFrames: true }, files, injectImmediately: true })
        .catch(() => {});
    } else if (result === 'not-reader') {
      siteStatus.textContent = 'Open a book in the online reader first.';
    } else {
      siteStatus.textContent = 'Word did not respond. Reload the reader.';
    }
  } catch {
    siteStatus.textContent = 'Could not set up site access. Try reopening this menu.';
  } finally {
    enable.disabled = false;
  }
}

start().catch(() => { siteStatus.textContent = 'Could not read the current page.'; });
