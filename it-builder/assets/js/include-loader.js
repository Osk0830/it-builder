(() => {
  'use strict';

  /** =========================
   *  設定
   * ======================= */
  // 公開パス（プロジェクトに合わせて変更。ルート直下なら '' でもOK）
  const ROOT_PATH = '/it-builder';

  // デフォルトのインクルードURL
  const defaultIncludeURL = (name) => `${ROOT_PATH}/includes/${name}.html`;

  // 同時フェッチの上限（CDNやローカルでも安定する程度に絞る）
  const MAX_CONCURRENCY = 6;

  // フェッチのタイムアウト(ms)
  const FETCH_TIMEOUT = 15000;

  /** =========================
   *  ユーティリティ
   * ======================= */
  const ready = (fn) => (document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn, { once: true }));

  const isAbsURL = (u) => /^https?:\/\//i.test(u);
  const isRootRel = (u) => u.startsWith('/');

  const resolveURL = (name, srcAttr) => {
    if (srcAttr) {
      if (isAbsURL(srcAttr) || isRootRel(srcAttr)) return srcAttr;
      // プレーン相対なら includes/ 基準で解決
      return `${ROOT_PATH}/includes/${srcAttr.replace(/^\.?\//, '')}`;
    }
    return defaultIncludeURL(name);
  };

  const fetchWithTimeout = (url, opt = {}) =>
    new Promise((resolve, reject) => {
      const ctrl = new AbortController();
      const id = setTimeout(() => ctrl.abort(), opt.timeout ?? FETCH_TIMEOUT);
      fetch(url, { cache: 'no-store', signal: ctrl.signal })
        .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then((t) => resolve(t))
        .catch(reject)
        .finally(() => clearTimeout(id));
    });

  // <script> を“実行される形”で挿入し直す（inline/外部どちらも対応）
  const reviveScripts = (root) => {
    const scripts = [...root.querySelectorAll('script')];
    for (const old of scripts) {
      const s = document.createElement('script');
      // 属性をそのまま移植
      for (const attr of old.attributes) s.setAttribute(attr.name, attr.value);
      // inline JS の場合は本文もコピー
      if (!old.src) s.textContent = old.textContent;
      // 旧タグと置換（実行される）
      old.replaceWith(s);
    }
  };

  // <link rel="stylesheet"> は普通に挿入すればOK（<style> はそのままで効く）
  // ここでは特別な処理は不要

  // data-include* 以外の属性を、ルート要素にマージ
  const mergeAttributes = (fromEl, toEl) => {
    for (const attr of [...fromEl.attributes]) {
      if (/^data-include/i.test(attr.name)) continue;
      if (!toEl.hasAttribute(attr.name)) toEl.setAttribute(attr.name, attr.value);
    }
  };

  // プレースホルダーをコンテンツに置換（複数ルート要素にも対応）
  const replaceWithNodes = (placeholder, fragment) => {
    const nodes = [...fragment.childNodes];
    if (nodes.length === 0) {
      // 何もなければ空divで埋める（DOM崩れ防止）
      const stub = document.createElement('div');
      placeholder.replaceWith(stub);
      return;
    }
    placeholder.replaceWith(...nodes);
  };

  // ネストした include があれば再帰的に解決
  const resolveNestedIncludes = (scope) => {
    const pending = scope.querySelectorAll('[data-include]:not([data-included])');
    if (pending.length) queueWork([...pending]);
  };

  /** =========================
   *  本体
   * ======================= */
  const workQueue = [];
  let active = 0;

  const dequeue = () => {
    if (!workQueue.length || active >= MAX_CONCURRENCY) return;
    const job = workQueue.shift();
    active++;
    job()
      .catch((err) => {
        // コンソールにだけエラーを出す（表示は極力壊さない）
        console.error('[include-loader] job failed:', err);
      })
      .finally(() => {
        active--;
        dequeue(); // 次
      });
  };

  const queueWork = (elements) => {
    for (const el of elements) {
      if (el.dataset.included === 'true') continue; // 二重実行防止
      el.dataset.included = 'true';

      const name = el.getAttribute('data-include')?.trim();
      const srcAttr = el.getAttribute('data-include-src')?.trim();
      const url = resolveURL(name, srcAttr);

      workQueue.push(async () => {
        const html = await fetchWithTimeout(url);
        // HTML -> DocumentFragment
        const t = document.createElement('template');
        t.innerHTML = html;

        // ルート要素が1個なら属性マージして置換
        // 複数要素の場合はそれらをそのまま挿入
        const frag = t.content;

        // 先にスクリプトの“実行”置換をしてから差し替え
        reviveScripts(frag);

        if (frag.childElementCount === 1) {
          const rootEl = frag.firstElementChild;
          mergeAttributes(el, rootEl);
        }

        replaceWithNodes(el, frag);

        // ネストされた include も対応
        resolveNestedIncludes(document);
      });
    }
    dequeue();
  };

  const boot = () => {
    // 既に置いてある data-include を拾って処理
    const targets = [...document.querySelectorAll('[data-include]:not([data-included])')];
    if (targets.length) queueWork(targets);
  };

  // 公開API（必要なら手動再走査できる）
  window.IncludeLoader = {
    scan: () => boot(),
    config: {
      setRootPath: (p) => (typeof p === 'string' ? (window.__INCLUDE_ROOT = p) : undefined),
    },
  };

  ready(boot);
})();
