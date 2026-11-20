const key = document.querySelector('#merriam-key');
const save = document.querySelector('#save');
const dictionaryStatus = document.querySelector('#dictionary-status');

async function loadDictionary() {
  try {
    const { merriamWebsterKey } = await chrome.storage.local.get('merriamWebsterKey');
    key.value = merriamWebsterKey ?? '';
    save.disabled = false;
  } catch {
    dictionaryStatus.textContent = '无法读取词典设置。';
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
    dictionaryStatus.textContent = merriamWebsterKey ? '已保存。接下来使用韦氏学习词典。' : '已切换到免密词典。';
  } catch {
    dictionaryStatus.textContent = '无法保存词典设置。';
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
        siteStatus.textContent = '当前站点未授权。';
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
    await chrome.tabs.sendMessage(tabId, { type: 'show-invite' }, { frameId: 0 });
    siteStatus.textContent = '已启用。返回阅读页即可确认。';
  } catch {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ['word.js', 'reader.js'] });
      await chrome.tabs.sendMessage(tabId, { type: 'show-invite' }, { frameId: 0 });
      siteStatus.textContent = '已在主页面启用。';
    } catch {
      siteStatus.textContent = '无法在当前页面启动。请刷新阅读页后重试。';
    }
  } finally {
    enable.disabled = false;
  }
}

start().catch(() => { siteStatus.textContent = '无法读取当前页面。'; });
