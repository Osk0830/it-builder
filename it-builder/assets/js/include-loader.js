/* /it-builder/assets/js/include-lite.js */
(() => {
  'use strict';

  // ==== 設定 ====
  const ROOT = '/it-builder'; // includes のルート
  const TIMEOUT = 15000; // fetch タイムアウト(ms)
  const ATTR_INCLUDE = 'data-include'; // 例: <div data-include="header"></div>
  const ATTR_SRC = 'data-include-src'; // 直接パス指定したい場合だけ

  // ---- ユーティリティ ----
  const ready = (fn) => (document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn, { once: true }));

  const absolute = (u) => /^https?:\/\//i.test(u) || u.startsWith('/');
  const norm = (u) => u.replace(/([^:]\/)\/+/g, '$1');

  // data-include/src → 取得URL
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

  // HTML → DocumentFragment（安全のため <script> は既定で無効化）
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

  // 丸っと置換（host 自体を置換）
  const replaceSelf = (host, frag) => {
    const parent = host.parentNode;
    if (!parent) return;
    const marker = document.createComment('include-marker');
    parent.insertBefore(marker, host);
    host.remove();
    parent.insertBefore(frag, marker);
    marker.remove();
  };

  const processOne = async (el) => {
    if (el.dataset.included === 'true') return;
    const url = urlFor(el);
    if (!url) return;

    try {
      const html = await fetchText(url);
      const frag = toFragment(html);
      replaceSelf(el, frag); // ★ 丸ごと置換
      el.dataset.included = 'true';
      // ネスト対応：新しく現れた要素の中も走査
      scan(document);
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
