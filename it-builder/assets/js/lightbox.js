(() => {
  'use strict';

  // ===== Config
  const SELECTORS = ['a[rel~="lightbox"]', 'a[class~="scale"]', 'a[href$=".jpg"]', 'a[href$=".jpeg"]', 'a[href$=".png"]', 'a[href$=".gif"]', 'a[href$=".webp"]'].join(',');

  // ===== Utils
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const isModClick = (e) => e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;

  function getScrollbarWidth() {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;top:-9999px;width:100px;height:100px;overflow:scroll;';
    document.body.appendChild(d);
    const w = d.offsetWidth - d.clientWidth;
    d.remove();
    return w;
  }

  function lockScroll() {
    const w = getScrollbarWidth();
    document.documentElement.style.paddingRight = w ? `${w}px` : '';
    document.body.classList.add('ibScrollLock');
  }
  function unlockScroll() {
    document.documentElement.style.paddingRight = '';
    document.body.classList.remove('ibScrollLock');
  }

  function preload(src) {
    if (!src) return;
    const img = new Image();
    img.decoding = 'async';
    img.loading = 'eager';
    img.src = src;
  }

  // 近傍の見出しや figcaption からキャプション候補を拾う
  function guessCaption(anchor) {
    const img = anchor.querySelector('img');
    if (img?.alt) return img.alt.trim();

    // <figure><figcaption>
    const fig = anchor.closest('figure');
    const fc = fig?.querySelector('figcaption');
    if (fc?.textContent) return fc.textContent.trim();

    // 近くの見出し（同ブロック内の h1-h6）
    const blk = anchor.closest('.wae-section-block, .caseDetailBox, section, article, .inner') || document;
    const hd = blk.querySelector('h1,h2,h3,h4,h5,h6');
    if (hd?.textContent) return hd.textContent.trim();

    // title属性
    const t = anchor.getAttribute('title');
    if (t) return t.trim();

    return '';
  }

  // group名（rel="lightbox[xxx]") を解釈（無ければ全体1グループ）
  function getGroupName(a) {
    const rel = a.getAttribute('rel') || '';
    const m = rel.match(/lightbox\[(.+?)\]/i);
    if (m) return `lb:${m[1]}`;
    // 同じ .wae-section-column を仮想グループ化（ページ構造に優しい）
    const col = a.closest('.wae-section-column');
    return col ? `col:${Array.from(document.querySelectorAll('.wae-section-column')).indexOf(col)}` : 'page:all';
  }

  // ===== Collect anchors (once)
  const anchorsAll = $$(SELECTORS).filter((a) => {
    const href = a.getAttribute('href') || '';
    return /\.(jpe?g|png|gif|webp)(\?.*)?$/i.test(href);
  });
  if (!anchorsAll.length) return;

  // グループに分けて索引を持つ
  const groups = new Map(); // name -> [{a, href, caption}]
  anchorsAll.forEach((a) => {
    const name = getGroupName(a);
    const item = { a, href: a.getAttribute('href'), caption: guessCaption(a) };
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(item);
    // data-index を振っておく（高速ナビ用）
    item.index = groups.get(name).length - 1;
    a.dataset.ibGroup = name;
    a.dataset.ibIndex = String(item.index);
  });

  // ===== Build DOM once
  const root = document.createElement('div');
  root.className = 'ibLightbox';
  root.innerHTML = `
    <div class="ibLightbox__stage" data-role="stage" aria-hidden="true">
      <div class="ibLightbox__imgwrap" role="dialog" aria-modal="true" aria-label="Image viewer" tabindex="-1">
        <button class="ibLightbox__close ibLightbox__btn" type="button" aria-label="閉じる"></button>
        <button class="ibLightbox__prev  ibLightbox__btn" type="button" aria-label="前の画像" data-role="prev"></button>
        <button class="ibLightbox__next  ibLightbox__btn" type="button" aria-label="次の画像" data-role="next"></button>
        <img class="ibLightbox__img" alt="">
      </div>
    </div>
    <div class="ibLightbox__caption" data-role="caption"></div>
  `;
  document.body.appendChild(root);

  const stage = $('[data-role="stage"]', root);
  const imgWrap = $('.ibLightbox__imgwrap', root);
  const imgEl = $('.ibLightbox__img', root);
  const capEl = $('[data-role="caption"]', root);
  const btnPrev = $('[data-role="prev"]', root);
  const btnNext = $('[data-role="next"]', root);
  const btnClose = $('.ibLightbox__close', root);

  let state = {
    open: false,
    group: '',
    index: 0,
    items: [],
  };
  let lastActiveEl = null;

  function updateButtons() {
    btnPrev.disabled = state.index <= 0;
    btnNext.disabled = state.index >= state.items.length - 1;
  }

  function show(index) {
    state.index = Math.max(0, Math.min(index, state.items.length - 1));
    const { href, caption } = state.items[state.index];

    // 先にプリロード（隣接も）
    preload(href);
    preload(state.items[state.index + 1]?.href);
    preload(state.items[state.index - 1]?.href);

    // 描画
    imgEl.src = href;
    imgEl.alt = caption || '';
    capEl.textContent = caption || '';

    updateButtons();
  }

  function open(group, index) {
    if (!groups.has(group)) return;
    state.group = group;
    state.items = groups.get(group);
    lastActiveEl = document.activeElement;

    lockScroll();
    stage.setAttribute('aria-hidden', 'false');
    root.classList.add('is-open');
    state.open = true;
    show(index);

    // 初期フォーカス（Esc対応）
    setTimeout(() => imgWrap.focus(), 0);
  }

  function close() {
    if (!state.open) return;
    root.classList.remove('is-open');
    state.open = false;
    unlockScroll();
    stage.setAttribute('aria-hidden', 'true');
    if (lastActiveEl && typeof lastActiveEl.focus === 'function') lastActiveEl.focus();
  }

  // ===== Events
  document.addEventListener('click', (e) => {
    const a = e.target.closest(SELECTORS);
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || isModClick(e)) return; // 新規タブ/修飾クリックは尊重
    if (!/\.(jpe?g|png|gif|webp)(\?.*)?$/i.test(href)) return;

    e.preventDefault();
    open(a.dataset.ibGroup || getGroupName(a), parseInt(a.dataset.ibIndex || '0', 10) || 0);
  });

  btnPrev.addEventListener('click', () => show(state.index - 1));
  btnNext.addEventListener('click', () => show(state.index + 1));
  btnClose.addEventListener('click', close);

  // 背景クリックで閉じる（画像自体のクリックは無視）
  stage.addEventListener('click', (e) => {
    if (e.target === stage) close();
  });

  // キーボード操作
  document.addEventListener('keydown', (e) => {
    if (!state.open) return;
    // IME中の矢印などは無視でOK
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      show(state.index - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      show(state.index + 1);
    }
  });

  // 画像読み込みの軽いフェード（任意）
  imgEl.addEventListener('load', () => {
    imgEl.style.opacity = '0';
    imgEl.style.transition = 'opacity .15s ease';
    requestAnimationFrame(() => {
      imgEl.style.opacity = '1';
    });
  });
})();
