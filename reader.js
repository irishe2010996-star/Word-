(() => {
  if (globalThis.readingLookupInstalled) return;

  function watchWordClick(onWord, mayLookup = () => true) {
    let hovered;
    let frame = 0;
    let previousCursor;
    let previousPriority;

    function clearHover() {
      if (hovered?.style.getPropertyValue('cursor') === 'pointer' &&
          hovered.style.getPropertyPriority('cursor') === 'important') {
        hovered.style.setProperty('cursor', previousCursor, previousPriority);
      }
      hovered = null;
    }

    function wordAtPoint(event, target = event.composedPath()[0]) {
      if (!(target instanceof Element) || target.isContentEditable ||
          target.closest('a, button, input, select, textarea, label, summary, [data-reading-lookup]')) return;

      const { clientX: x, clientY: y } = event;
      const rootNode = target.getRootNode();
      const options = rootNode instanceof ShadowRoot ? { shadowRoots: [rootNode] } : undefined;
      const point = document.caretPositionFromPoint?.(x, y, options);
      const fallback = point ? null : document.caretRangeFromPoint?.(x, y);
      const node = point?.offsetNode ?? fallback?.startContainer;
      const offset = point?.offset ?? fallback?.startOffset;
      if (node?.nodeType !== Node.TEXT_NODE || !target.contains(node)) return;

      const range = document.createRange();
      for (const match of node.data.matchAll(/[a-z]+(?:['‘’‐‑-][a-z]+)*/gi)) {
        const end = match.index + match[0].length;
        if (offset < match.index || offset > end) continue;
        range.setStart(node, match.index);
        range.setEnd(node, end);
        const hit = Array.from(range.getClientRects()).some(rect =>
          x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
        );
        if (hit) return normalizeWord(match[0]);
        break;
      }
    }

    document.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || !mayLookup()) return;
      const element = event.composedPath()[0];
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const target = mayLookup() && wordAtPoint(event, element) ? element : null;
        if (target === hovered) return;
        clearHover();
        if (target) {
          hovered = target;
          previousCursor = hovered.style.getPropertyValue('cursor');
          previousPriority = hovered.style.getPropertyPriority('cursor');
          hovered.style.setProperty('cursor', 'pointer', 'important');
        }
      });
    });
    document.documentElement.addEventListener('pointerleave', clearHover);
    document.addEventListener('click', event => {
      if (!mayLookup() || event.button !== 0 || event.detail !== 1 || event.defaultPrevented ||
          event.ctrlKey || event.metaKey || event.altKey || event.shiftKey ||
          window.getSelection()?.isCollapsed === false) return;
      const word = wordAtPoint(event);
      if (word) onWord(word);
    }, true);
    return clearHover;
  }

  if (window !== window.top) {
    let enabled = false;
    const clearHover = watchWordClick(
      word => chrome.runtime.sendMessage({ type: 'frame-word', word }).catch(() => {}),
      () => enabled
    );
    const update = value => {
      enabled = value === true;
      if (!enabled) clearHover();
    };
    chrome.runtime.onMessage.addListener(message => {
      if (message.type === 'frame-lookup-state') update(message.enabled);
    });
    globalThis.readingLookupInstalled = true;
    chrome.runtime.sendMessage({ type: 'get-frame-lookup-state' }).then(update, () => {});
    return;
  }

  function isReader() {
    return /(?:^|\/)(?:reader|read|read-online|online-reader|book-reader|readonline|read\.php)(?:[\/._-]|$)/i.test(location.pathname) ||
      [...document.querySelectorAll('epub-view, epub-reader, foliate-view, #epub-reader, #pdf-viewer, #book-reader, #bookReader, .epub-container, iframe[src]')]
        .some(element => {
          if (element.tagName === 'IFRAME') {
            if (!/(?:reader|epub|read-online|readonline|viewer\.html|\.pdf(?:[?#]|$))/i.test(element.src)) return false;
          }
          const rect = element.getBoundingClientRect();
          return rect.width >= 100 && rect.height >= 100 && getComputedStyle(element).visibility === 'visible';
        });
  }

  const host = document.createElement('div');
  host.setAttribute('data-reading-lookup', '');
  host.lang = 'en-US';
  const root = host.attachShadow({ mode: 'closed' });
  root.innerHTML = `
    <style>
      :host { all: initial; position: fixed; z-index: 2147483647; top: 12px; right: 12px;
        color-scheme: light dark; font: 13px/1.45 system-ui, sans-serif; color: CanvasText; }
      [hidden] { display: none !important; }
      section { box-sizing: border-box; width: max-content; max-width: min(228px, calc(100vw - 24px));
        position: relative; padding: 5px 7px; border-radius: 8px;
        background: rgb(255 255 255 / 30%); backdrop-filter: blur(5px); }
      .outline { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
      .outline rect { x: 0.65px; y: 0.65px; width: calc(100% - 1.3px); height: calc(100% - 1.3px);
        rx: 7px; fill: none; stroke: white; stroke-opacity: .4; stroke-width: 1.3; stroke-dasharray: 4 3; }
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
    </style>
    <section id="invite" aria-label="Turn on word lookup" hidden>
      <svg class="outline" aria-hidden="true"><rect></rect></svg>
      <div class="row"><span>Turn on word lookup?</span><button id="yes">Turn on</button><button id="no">Not now</button></div>
    </section>
    <section id="panel" aria-label="Word lookup" hidden>
      <svg class="outline" aria-hidden="true"><rect></rect></svg>
      <div class="row">
        <button id="toggle" aria-pressed="false">Start</button>
        <button id="manual" aria-label="Look up a word" aria-expanded="false" title="Look up a word">🤪</button>
        <button id="close" aria-label="Close definition" title="Close definition" hidden>×</button>
      </div>
      <form class="extra" hidden><input aria-label="Enter an English word" placeholder="English word" maxlength="80"
        autocomplete="off" spellcheck="false" required><button type="submit">Look up</button></form>
      <div class="extra result" hidden>
        <strong id="headword" lang="en"></strong>
        <div id="definition" role="status"></div>
        <div class="credit" hidden>
          <a id="source" target="_blank" rel="noopener noreferrer">Wiktionary</a> ·
          <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank"
            rel="noopener noreferrer">CC BY-SA 3.0</a>
        </div>
        <div id="merriam-credit" class="credit" hidden>
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
  let readerOpen = false;
  let readerLocation = '';
  let request = 0;

  function setActive(next) {
    active = next;
    toggle.textContent = active ? 'Pause' : 'Start';
    toggle.setAttribute('aria-pressed', String(active));
    if (!active) clearHover();
    chrome.runtime.sendMessage({ type: 'set-frame-lookup-state', enabled: active }).catch(() => {});
  }

  function setManual(open) {
    form.hidden = !open;
    manual.setAttribute('aria-expanded', String(open));
    if (open) {
      clearHover();
      input.focus();
    }
  }

  function clearResult() {
    request++;
    result.hidden = true;
    close.hidden = true;
  }

  const messages = {
    access: 'Check your Merriam-Webster Learner’s Dictionary API key.',
    missing: 'No definition found.',
    limit: 'Dictionary request limit reached.',
    error: 'Could not reach the dictionary. Try again.',
    invalid: 'Enter one English word.'
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
    definition.textContent = 'Looking up…';
    let response;
    try {
      response = await chrome.runtime.sendMessage({ type: 'lookup', word });
    } catch {
      response = { status: 'error' };
    }
    if (currentRequest !== request) return;
    if (response?.provider === 'merriam-webster') {
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
    setActive(true);
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
  const clearHover = watchWordClick(handleWord, () => active && form.hidden);
  function syncReader() {
    const detected = isReader();
    const currentLocation = location.pathname + location.search;
    if (detected === readerOpen && (!detected || currentLocation === readerLocation)) {
      if (detected && !host.isConnected) (document.body ?? document.documentElement).append(host);
      return;
    }
    readerOpen = detected;
    readerLocation = currentLocation;
    setManual(false);
    clearResult();
    panel.hidden = true;
    invite.hidden = !detected;
    if (detected) (document.body ?? document.documentElement).append(host);
    else host.remove();
    if (active) setActive(false);
  }

  chrome.runtime.onMessage.addListener((message, _sender, reply) => {
    if (message.type === 'reader-word') handleWord(message.word);
    if (message.type === 'reader-lookup-state') reply(active);
    if (message.type === 'show-invite') {
      syncReader();
      if (readerOpen && panel.hidden) invite.hidden = false;
      reply(!readerOpen ? 'not-reader' : panel.hidden ? 'prompt' : 'open');
    }
  });
  let pending = false;
  const scheduleSync = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      syncReader();
    });
  };
  new MutationObserver(scheduleSync).observe(document.documentElement, {
    childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'src', 'hidden']
  });
  window.navigation?.addEventListener('currententrychange', scheduleSync);
  window.addEventListener('popstate', scheduleSync);
  window.addEventListener('hashchange', scheduleSync);
  window.addEventListener('resize', scheduleSync);
  syncReader();
  globalThis.readingLookupInstalled = true;
})();
