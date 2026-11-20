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
  try {
    const manifest = chrome.runtime.getManifest();
    const host = new URL(pattern).hostname;
    const builtIn = manifest.content_scripts[0].matches.some(match => {
      const base = match.slice('https://*.'.length, -2);
      return host === base || host.endsWith('.' + base);
    });
    if (!builtIn) {
      const granted = await chrome.permissions.request({ origins: [pattern] });
      if (!granted) {
        siteStatus.textContent = 'Site access was not granted.';
        return;
      }

      const id = 'site-' + host;
      if (!(await chrome.scripting.getRegisteredContentScripts({ ids: [id] })).length) {
        await chrome.scripting.registerContentScripts([{
          id, matches: [pattern], js: ['word.js', 'reader.js'],
          allFrames: true, matchOriginAsFallback: true, runAt: 'document_idle'
        }]);
      }
    }
    // Inject now as well so an already open page does not require a reload.
    await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, files: ['word.js', 'reader.js'] });
    const reading = await chrome.tabs.sendMessage(tabId, { type: 'show-invite' }, { frameId: 0 });
    siteStatus.textContent = reading ? 'Return to the reader to confirm.' : 'Site enabled. Open a book in the online reader.';
  } catch {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ['word.js', 'reader.js'] });
      const reading = await chrome.tabs.sendMessage(tabId, { type: 'show-invite' }, { frameId: 0 });
      siteStatus.textContent = reading ? 'Return to the reader to confirm.' : 'Open a book in the online reader and try again.';
    } catch {
      siteStatus.textContent = 'Could not start here. Reload the reader and try again.';
    }
  } finally {
    enable.disabled = false;
  }
}

start().catch(() => { siteStatus.textContent = 'Could not read the current page.'; });
