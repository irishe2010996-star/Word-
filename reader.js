(() => {
  if (globalThis.readingLookupInstalled) return;
  globalThis.readingLookupInstalled = true;

  function watchWordClick(onWord, mayLookup = () => true) {
    document.addEventListener('click', event => {
      if (!mayLookup() || event.button !== 0 || event.detail !== 1 || event.defaultPrevented ||
          event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;

      const target = event.target;
      if (!(target instanceof Element) || target.isContentEditable ||
          target.closest('a, button, input, select, textarea, label, summary, [data-reading-lookup]') ||
          window.getSelection()?.isCollapsed === false) return;

      const { clientX: x, clientY: y } = event;
      const point = document.caretPositionFromPoint?.(x, y);
      const fallback = point ? null : document.caretRangeFromPoint?.(x, y);
      const node = point?.offsetNode ?? fallback?.startContainer;
      const offset = point?.offset ?? fallback?.startOffset;
      if (node?.nodeType !== Node.TEXT_NODE) return;

      const range = document.createRange();
      for (const match of node.data.matchAll(/[a-z]+(?:['‘’‐‑-][a-z]+)*/gi)) {
        const end = match.index + match[0].length;
        if (offset < match.index || offset > end) continue;
        range.setStart(node, match.index);
        range.setEnd(node, end);
        const hit = Array.from(range.getClientRects()).some(rect =>
          x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
        );
        const word = hit && normalizeWord(match[0]);
        if (word) onWord(word);
        break;
      }
    });
  }

  if (window !== window.top) {
    watchWordClick(word => chrome.runtime.sendMessage({ type: 'frame-word', word }).catch(() => {}));
    return;
  }

  const host = document.createElement('div');
  host.setAttribute('data-reading-lookup', '');
  const root = host.attachShadow({ mode: 'closed' });
  root.innerHTML = `
    <style>
      :host { all: initial; position: fixed; z-index: 2147483647; top: 12px; right: 12px;
        color-scheme: light dark; font: 13px/1.45 system-ui, sans-serif; color: CanvasText; }
      [hidden] { display: none !important; }
      section { box-sizing: border-box; width: max-content; max-width: min(228px, calc(100vw - 24px));
        padding: 4px 6px; border: 1px dashed currentColor; border-radius: 9px;
        background: color-mix(in srgb, Canvas 78%, transparent); backdrop-filter: blur(5px); }
      .row, form { display: flex; gap: 4px; align-items: center; }
      button, input { font: inherit; color: inherit; }
      button { background: transparent; border: 0; border-radius: 4px; padding: 3px 5px; cursor: pointer; }
      button:hover { background: color-mix(in srgb, CanvasText 13%, transparent); }
      button:focus-visible, input:focus-visible, a:focus-visible { outline: 2px solid Highlight; }
      input { box-sizing: border-box; min-width: 0; width: 100%; border: 1px dashed currentColor;
        border-radius: 4px; background: transparent; padding: 3px; }
      form { margin: 4px 0; }
      .extra { width: 210px; max-width: 100%; }
      .result { max-height: min(132px, 38vh); overflow: auto; overflow-wrap: anywhere; }
      p, ol { margin: 4px 0; } ol { padding-inline-start: 21px; }
      a { color: LinkText; }
      .credit { font-size: 11px; }
      .credit img { display: block; }
    </style>
    <section id="invite" aria-label="启用查词">
      <div class="row"><span>开启点词查词？</span><button id="yes">开启</button><button id="no">稍后</button></div>
    </section>
    <section id="panel" aria-label="读书小词窗" hidden>
      <div class="row">
        <button id="toggle" aria-pressed="false">启动点词</button>
        <button id="manual" aria-label="手动查词" aria-expanded="false" title="手动查词">🤪</button>
        <button id="close" aria-label="收起释义" title="收起释义" hidden>×</button>
      </div>
      <form class="extra" hidden><input aria-label="输入一个英文单词" placeholder="输入英文单词" maxlength="80"
        autocomplete="off" spellcheck="false" required><button type="submit">查</button></form>
      <div class="extra result" hidden>
        <strong id="headword" lang="en"></strong>
        <div id="definition" role="status"></div>
        <div class="credit" hidden>
          <a id="source" target="_blank" rel="noopener noreferrer">Wiktionary</a> ·
          <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank"
            rel="noopener noreferrer">CC BY-SA 3.0</a>
        </div>
        <div id="merriam-credit" class="credit" hidden>
          <img width="50" height="50" alt="Merriam-Webster">
          <a target="_blank" rel="noopener noreferrer">Merriam-Webster's Learner's Dictionary</a>
        </div>
      </div>
    </section>`;

  const get = selector => root.querySelector(selector);
  const invite = get('#invite');
  const panel = get('#panel');
  const toggle = get('#toggle');
  const manual = get('#manual');
  const close = get('#close');
  const form = get('form');
  const input = get('input');
  const result = get('.result');
  const headword = get('#headword');
  const definition = get('#definition');
  const source = get('#source');
  const credit = get('.credit');
  const merriamCredit = get('#merriam-credit');
  let active = false;
  let request = 0;

  function setActive(next) {
    active = next;
    toggle.textContent = active ? '暂停点词' : '启动点词';
    toggle.setAttribute('aria-pressed', String(active));
  }

  function setManual(open) {
    form.hidden = !open;
    manual.setAttribute('aria-expanded', String(open));
    if (open) input.focus();
  }

  function clearResult() {
    request++;
    result.hidden = true;
    close.hidden = true;
  }

  const messages = {
    access: '韦氏密钥无效，请检查是否选择了 Learners Dictionary。',
    missing: '没有找到该词的释义。',
    limit: '词典请求次数已达上限。',
    error: '暂时无法查询词典，请稍后重试。',
    invalid: '请输入一个英文单词。'
  };

  function showDefinition(response) {
    definition.removeAttribute('lang');
    if (response.status !== 'ok') {
      definition.textContent = messages[response.status] ?? messages.error;
      return;
    }

    const list = document.createElement('ol');
    for (const entry of response.definitions) {
      const item = document.createElement('li');
      item.textContent = entry.partOfSpeech
        ? entry.partOfSpeech + ' · ' + entry.text
        : entry.text;
      list.append(item);
    }
    definition.lang = 'en';
    definition.replaceChildren(list);
  }

  async function lookup(word) {
    const currentRequest = ++request;
    result.hidden = false;
    close.hidden = false;
    headword.textContent = word;
    credit.hidden = true;
    merriamCredit.hidden = true;
    definition.removeAttribute('lang');
    if (!word) {
      definition.textContent = messages.invalid;
      return;
    }
    source.href = `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`;
    definition.textContent = '查询中…';
    let response;
    try {
      response = await chrome.runtime.sendMessage({ type: 'lookup', word });
    } catch {
      response = { status: 'error' };
    }
    if (currentRequest !== request) return;
    if (response?.provider === 'merriam-webster') {
      const logo = get('#merriam-credit img');
      if (!logo.hasAttribute('src')) logo.src = chrome.runtime.getURL('assets/merriam-webster.png');
      get('#merriam-credit a').href = `https://www.merriam-webster.com/dictionary/${encodeURIComponent(word)}`;
      merriamCredit.hidden = false;
    } else {
      credit.hidden = response?.provider !== 'wiktionary';
    }
    showDefinition(response ?? { status: 'error' });
  }

  get('#yes').addEventListener('click', () => {
    invite.hidden = true;
    panel.hidden = false;
  });
  get('#no').addEventListener('click', () => {
    invite.hidden = true;
  });
  toggle.addEventListener('click', () => {
    setActive(!active);
    if (!active) clearResult();
  });
  manual.addEventListener('click', () => setManual(form.hidden));
  close.addEventListener('click', clearResult);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const word = normalizeWord(input.value);
    if (word) setManual(false);
    lookup(word);
  });
  root.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!form.hidden) {
      setManual(false);
      manual.focus();
    } else if (!result.hidden) {
      clearResult();
      toggle.focus();
    }
  });

  const handleWord = word => {
    if (active && form.hidden) lookup(word);
  };
  watchWordClick(handleWord, () => active && form.hidden);
  chrome.runtime.onMessage.addListener(message => {
    if (message.type === 'reader-word') handleWord(message.word);
    if (message.type === 'show-invite' && panel.hidden) invite.hidden = false;
  });
  document.documentElement.append(host);
})();
