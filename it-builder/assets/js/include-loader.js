(() => {
  'use strict';

  /* =========================
   * 設定
   * ======================= */
  const DEFAULT_ROOT_PATH = '/it-builder';
  const DEFAULT_CONCURRENCY = 6;
  const FETCH_TIMEOUT = 15000;

  /* =========================
   * ユーティリティ
   * ======================= */
  const ready = (fn) => (document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn, { once: true }));

  const getRootPath = () => {
    const p = typeof window.__INCLUDE_ROOT === 'string' ? window.__INCLUDE_ROOT : DEFAULT_ROOT_PATH;
    if (!p || p === '/') return '';
    return p.endsWith('/') ? p.slice(0, -1) : p;
  };

  const getConcurrency = () => {
    const n = Number(window.__INCLUDE_CONCURRENCY ?? DEFAULT_CONCURRENCY);
    return Number.isFinite(n) && n >= 1 ? n : DEFAULT_CONCURRENCY;
  };

  const isAbsURL = (u) => /^https?:\/\//i.test(u);
  const isRootRel = (u) => typeof u === 'string' && u.startsWith('/');

  const ensureUnderRoot = (rootRel) => {
    const ROOT = getRootPath();
    return rootRel.startsWith(`${ROOT}/`) ? rootRel : `${ROOT}${rootRel}`;
  };

  const defaultIncludeURL = (name) => `${getRootPath()}/includes/${name}.html`;

  const resolveURL = (name, srcAttr) => {
    if (srcAttr) {
      if (isAbsURL(srcAttr)) return srcAttr;
      if (isRootRel(srcAttr)) return ensureUnderRoot(srcAttr);
      return `${getRootPath()}/includes/${srcAttr.replace(/^\.?\//, '')}`;
    }
    return defaultIncludeURL(name);
  };

  const fetchWithTimeout = (url, opt = {}) =>
    new Promise((resolve, reject) => {
      const ctrl = new AbortController();
      const id = setTimeout(() => ctrl.abort(), opt.timeout ?? FETCH_TIMEOUT);
      fetch(url, { cache: 'no-store', signal: ctrl.signal })
        .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status} @ ${url}`))))
        .then((t) => resolve(t))
        .catch(reject)
        .finally(() => clearTimeout(id));
    });

  // <script> を実行される形で復元
  const reviveScripts = (root) => {
    const scripts = root.querySelectorAll('script');
    for (const old of scripts) {
      const s = document.createElement('script');
      for (const attr of old.attributes) s.setAttribute(attr.name, attr.value);
      if (!old.src) s.textContent = old.textContent;
      old.replaceWith(s);
    }
  };

  // data-include* 以外の属性をコピー（上書きはしない）
  const mergeAttributes = (fromEl, toEl) => {
    for (const attr of fromEl.attributes) {
      if (/^data-include/i.test(attr.name)) continue;
      if (!toEl.hasAttribute(attr.name)) toEl.setAttribute(attr.name, attr.value);
    }
  };

  // フラグメントの子を一つずつ安全に差し替える
  const replaceWithChildren = (placeholder, frag) => {
    const parent = placeholder.parentNode;
    if (!parent) return;

    // 何もない場合は stub でDOM崩れ防止
    if (!frag || !frag.firstChild) {
      const stub = document.createElement('div');
      parent.insertBefore(stub, placeholder);
      placeholder.remove();
      return;
    }

    // マーカー→子ノードを順にマーカーの直前へ→最後にプレースホルダとマーカーを除去
    const marker = document.createComment('include-loader-marker');
    parent.insertBefore(marker, placeholder);
    while (frag.firstChild) {
      parent.insertBefore(frag.firstChild, marker);
    }
    placeholder.remove();
    marker.remove();
  };

  // ネストした include を再帰処理
  const resolveNestedIncludes = (scope) => {
    const pending = scope.querySelectorAll('[data-include]:not([data-included])');
    if (pending.length) queueWork([...pending]);
  };

  /* =========================
   * キュー制御
   * ======================= */
  const workQueue = [];
  let active = 0;
  let everQueued = false;

  const maybeNotifyReady = () => {
    if (everQueued && active === 0 && workQueue.length === 0) {
      document.dispatchEvent(new CustomEvent('includes:ready'));
    }
  };

  const dequeue = () => {
    if (!workQueue.length || active >= getConcurrency()) {
      if (workQueue.length === 0 && active === 0) maybeNotifyReady();
      return;
    }
    const job = workQueue.shift();
    active++;
    job()
      .catch((err) => console.error('[include-loader] job failed:', err))
      .finally(() => {
        active--;
        if (workQueue.length > 0) dequeue();
        else maybeNotifyReady();
      });
  };

  const queueWork = (elements) => {
    if (!elements || elements.length === 0) return;
    everQueued = true;

    for (const el of elements) {
      if (el.dataset.included === 'true') continue;
      el.dataset.included = 'true';

      const name = el.getAttribute('data-include')?.trim();
      const srcRaw = el.getAttribute('data-include-src')?.trim();
      const url = resolveURL(name, srcRaw);

      workQueue.push(async () => {
        let html = '';
        try {
          html = await fetchWithTimeout(url);
        } catch (e) {
          console.error('[include-loader] fetch failed:', url, e);
          // 失敗時は空ノードで埋める
          const stub = document.createElement('div');
          el.replaceWith(stub);
          return;
        }

        // 不完全な断片で失敗しないよう、template 経由でパース
        const t = document.createElement('template');
        t.innerHTML = html;

        const frag = t.content;

        // ルート要素が1個なら属性を引き継ぎ
        if (frag && frag.childElementCount === 1) {
          mergeAttributes(el, frag.firstElementChild);
        }

        // 先に script 復元（実行）
        reviveScripts(frag);

        // フラグメントの子を安全に差し替え
        replaceWithChildren(el, frag);

        // ネスト解決
        resolveNestedIncludes(document);
      });
    }
    dequeue();
  };

  const boot = () => {
    const targets = [...document.querySelectorAll('[data-include]:not([data-included])')];
    if (targets.length) queueWork(targets);
    else document.dispatchEvent(new CustomEvent('includes:ready'));
  };

  // 公開 API
  window.IncludeLoader = {
    scan: () => queueWork([...document.querySelectorAll('[data-include]:not([data-included])')]),
    config: {
      setRootPath(p) {
        if (typeof p === 'string') window.__INCLUDE_ROOT = p;
      },
      get rootPath() {
        return getRootPath();
      },
      set concurrency(n) {
        if (Number.isFinite(+n) && +n >= 1) window.__INCLUDE_CONCURRENCY = +n;
      },
      get concurrency() {
        return getConcurrency();
      },
    },
  };

  ready(boot);
})();
