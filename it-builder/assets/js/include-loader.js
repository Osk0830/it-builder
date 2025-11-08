/* /it-builder/assets/js/include-lite.js */
(() => {
  'use strict';

  const ROOT = '/it-builder';
  const TIMEOUT = 15000;
  const ATTR_INCLUDE = 'data-include';
  const ATTR_SRC = 'data-include-src';

  const ready = (fn) => (document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn, { once: true }));

  const absolute = (u) => /^https?:\/\//i.test(u) || u.startsWith('/');
  const norm = (u) => u.replace(/([^:]\/)\/+/g, '$1');

  const urlFor = (el) => {
    const name = el.getAttribute(ATTR_INCLUDE)?.trim();
    const src = el.getAttribute(ATTR_SRC)?.trim();
    if (src) return absolute(src) ? src : norm(`${ROOT}/${src.replace(/^\.?\//, '')}`);
    if (name) return norm(`${ROOT}/includes/${name}.html`);
    return null;
  };

  const fetchText = (url, timeout = TIMEOUT) =>
    new Promise((resolve, reject) => {
      const ctrl = new AbortController();
      const id = setTimeout(() => ctrl.abort(), timeout);
      fetch(url, { cache: 'no-store', signal: ctrl.signal })
        .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status} @ ${url}`))))
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(id));
    });

  const toFragment = (html) => {
    const t = document.createElement('template');
    t.innerHTML = html;
    t.content.querySelectorAll('script').forEach((s) => {
      const r = document.createElement('script');
      for (const a of s.attributes) r.setAttribute(a.name, a.value);
      r.type = 'text/plain';
      r.setAttribute('data-include-disabled', 'true');
      if (!s.src) r.textContent = s.textContent || '';
      s.replaceWith(r);
    });
    return t.content;
  };

  const replaceSelf = (host, frag) => {
    const parent = host.parentNode;
    if (!parent) return;
    const marker = document.createComment('include-marker');
    parent.insertBefore(marker, host);
    host.remove();
    parent.insertBefore(frag, marker);
    marker.remove();
  };

  // --- 追加: 取り込んだ断片に対する後処理（名前 + パラメータで分岐） ---
  function postProcess(name, frag, params) {
    // news-menu: data-current="YYYY" を受け取り、該当年に aria-current="page"
    if (name === 'news-menu' && params?.current) {
      const year = String(params.current).trim();
      const root = frag.querySelector('.newsMenu') || frag;
      const links = [...root.querySelectorAll('.newsMenu__anchor')];
      for (const a of links) {
        const label = (a.textContent || '').trim();
        const href = a.getAttribute('href') || '';
        if (label === year || href.includes(`/${year}/`) || (href === 'index.html' && label === year)) {
          a.setAttribute('aria-current', 'page');
        } else {
          a.removeAttribute('aria-current');
        }
      }
    }
    // 他の include 名でも増やせる:
    // if (name === 'xxx') { ... }
  }

  const processOne = async (el) => {
    if (el.dataset.included === 'true') return;
    const url = urlFor(el);
    if (!url) return;

    const name = el.getAttribute(ATTR_INCLUDE)?.trim() || '';
    const params = {};
    for (const [k, v] of Object.entries(el.dataset)) {
      if (k === 'include' || k === 'includeSrc' || k === 'included') continue;
      params[k] = v;
    }

    try {
      const html = await fetchText(url);
      const frag = toFragment(html);

      // ★ 追加: 断片に対する後処理フック
      try {
        postProcess(name, frag, params);
      } catch {}

      replaceSelf(el, frag);
      el.dataset.included = 'true';
      scan(document); // ネスト対応
    } catch (e) {
      console.error('[include-lite] fetch failed:', url, e);
    }
  };

  const scan = (scope = document) => {
    const targets = [...scope.querySelectorAll(`[${ATTR_INCLUDE}],[${ATTR_SRC}]`)].filter((n) => n.dataset.included !== 'true');
    targets.forEach(processOne);
  };

  ready(() => scan());
})();
