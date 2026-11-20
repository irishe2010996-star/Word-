importScripts('word.js');

const apiRoot = 'https://api.dictionaryapi.dev/api/v2/entries/en/';

function getFreeDefinitions(entries) {
  if (!Array.isArray(entries)) return [];
  const definitions = [];
  const seen = new Set();

  for (const meaning of entries.flatMap(entry => entry.meanings ?? [])) {
    for (const sense of meaning.definitions ?? []) {
      const text = sense.definition?.trim();
      if (!text || seen.has(text)) continue;
      seen.add(text);
      definitions.push({ partOfSpeech: meaning.partOfSpeech, text });
      if (definitions.length === 3) return definitions;
    }
  }
  return definitions;
}

function getMerriamDefinitions(entries) {
  const definitions = [];
  const seen = new Set();
  for (const entry of entries) {
    for (const definition of entry?.shortdef ?? []) {
      const text = definition.trim();
      if (!text || seen.has(text)) continue;
      seen.add(text);
      definitions.push({ text, partOfSpeech: entry.fl });
      if (definitions.length === 3) return definitions;
    }
  }
  return definitions;
}

async function lookup(value) {
  const word = typeof value === 'string' && normalizeWord(value);
  if (!word) return { status: 'invalid' };

  const { merriamWebsterKey } = await chrome.storage.local.get('merriamWebsterKey');
  const provider = merriamWebsterKey ? 'merriam-webster' : 'wiktionary';
  const result = status => ({ status, provider });
  const path = encodeURIComponent(word);
  const url = new URL(path, merriamWebsterKey
    ? 'https://www.dictionaryapi.com/api/v3/references/learners/json/'
    : apiRoot);
  if (merriamWebsterKey) url.searchParams.set('key', merriamWebsterKey);

  try {
    const response = await fetch(url, {
      redirect: 'error',
      signal: AbortSignal.timeout(9000)
    });
    if (response.status === 404) return result('missing');
    if (response.status === 401 || response.status === 403) return result('access');
    if (response.status === 429) return result('limit');
    if (!response.ok) return result('error');

    if (merriamWebsterKey) {
      const body = await response.text();
      // The API can return credential errors as plain text with HTTP 200.
      if (/invalid api key|not subscribed/i.test(body.trim().slice(0, 100)) && !body.trim().startsWith('[')) {
        return result('access');
      }
      const entries = JSON.parse(body);
      if (!Array.isArray(entries)) return result('error');
      const definitions = getMerriamDefinitions(entries);
      return definitions.length ? { ...result('ok'), definitions } : result('missing');
    }

    const definitions = getFreeDefinitions(await response.json());
    return definitions.length ? { ...result('ok'), definitions } : result('missing');
  } catch {
    return result('error');
  }
}

chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (!sender.tab) return;

  if (message.type === 'lookup' && sender.frameId === 0) {
    lookup(message.word).then(reply, () => reply({ status: 'error' }));
    return true;
  }
  if (message.type === 'frame-word' && sender.frameId > 0) {
    const word = typeof message.word === 'string' && normalizeWord(message.word);
    if (word) {
      chrome.tabs.sendMessage(sender.tab.id, { type: 'reader-word', word }, { frameId: 0 })
        .catch(() => {});
    }
  }
});
