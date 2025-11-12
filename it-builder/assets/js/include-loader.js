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

  // --- 取り込んだ断片に対する後処理（名前 + パラメータで分岐） ---
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

    // ★ about-tab: data-current="..." に一致する li > a に .is-active を付与
    if (name === 'about-tab' && params?.current) {
      const key = String(params.current).trim();
      // include断片の中からナビのスコープを特定（柔軟に）
      const scope = frag.querySelector('.aboutNav') || frag.querySelector('.aboutNav__list') || frag.querySelector('nav, ul, ol') || frag;

      // まず対象 a を探す（典型とフォールバックの2パターン）
      const target = scope.querySelector(`.aboutNav__list__item[data-current="${key}"] > .aboutNav__list__anchor`) || scope.querySelector(`[data-current="${key}"] > a`);

      if (target) {
        // 同スコープ内の既存 is-active をリセット
        scope.querySelectorAll('a.is-active').forEach((a) => a.classList.remove('is-active'));
        // 付与
        target.classList.add('is-active');
      } else {
        // 必要ならデバッグ（普段はコメントアウト推奨）
        // console.warn('[include-lite] about-tab: target not found for', key);
      }
    }

    // ★ about-nav（SP用の aboutSmallNav）:
    //   data-current="..." に一致する li を非表示にする
    if (name === 'about-nav' && params?.current) {
      const key = String(params.current).trim();

      // 断片内の .aboutSmallNav のうち、data-current を持つリストだけ対象
      const lists = [...frag.querySelectorAll('.aboutSmallNav')].filter((ul) => ul.querySelector('[data-current]'));

      lists.forEach((ul) => {
        const items = ul.querySelectorAll('.aboutSmallNav__item');
        items.forEach((li) => {
          const cur = li.getAttribute('data-current');
          const match = cur && cur.trim() === key;
          // いったん初期化
          li.removeAttribute('hidden');
          li.style.display = '';
          // 該当のみ非表示
          if (match) {
            li.setAttribute('hidden', ''); // A11y的にもOK
            li.style.display = 'none'; // レイアウト確実に詰める
          }
        });
      });
    }
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
