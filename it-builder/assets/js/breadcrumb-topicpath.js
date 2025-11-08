(() => {
  'use strict';
  const ROOT = '/it-builder',
    HEADER = '#header',
    HOME_ICON = '/it-builder/wp-content/themes/itbuilder-theme/resource/img/ic_home.png',
    ROUTE_TITLES = {
      '/about/': 'イットbuilderとは',
      '/price/': '料金案内',
      '/case/': '活用例',
      '/join/': 'ご検討中のお客さま',
      '/user/': 'ご利用中のお客さま',
      '/installation/': '導入実績',
      '/faq/': 'よくある質問',
      '/news/': 'お知らせ',
      '/sitemap/': 'サイトマップ',
      '/sitepolicy/': 'サイトポリシー',
    };

  const ready = (f) => (document.readyState !== 'loading' ? f() : document.addEventListener('DOMContentLoaded', f, { once: true }));
  const norm = (p) => {
    p = (p || '').replace(/index\.html?$/i, '').replace(/\/{2,}/g, '/');
    if (!p.startsWith('/')) p = '/' + p;
    return p;
  };
  const stripBase = (pathname, base) => {
    base = (base || '').replace(/\/$/, '');
    if (base && pathname.startsWith(base)) {
      let rest = pathname.slice(base.length) || '/';
      return rest.startsWith('/') ? rest : '/' + rest;
    }
    return pathname;
  };

  function getThirdTitle() {
    if (typeof window !== 'undefined' && typeof window.BC_TITLE === 'string' && window.BC_TITLE.trim()) return window.BC_TITLE.trim();
    const meta = document.querySelector('meta[name="breadcrumb-title"]');
    if (meta?.content?.trim()) return meta.content.trim();
    const dataEl = document.querySelector('[data-bc-title]');
    const val = dataEl?.getAttribute('data-bc-title');
    if (val && val.trim()) return val.trim();
    return null; // 指定が無ければ 2階層で止める
  }

  function buildCrumbs() {
    const path = norm(location.pathname),
      inner = stripBase(path, ROOT);
    const crumbs = [{ name: 'HOME', url: ROOT + '/', isHome: true }];

    if (inner === '/' || inner === '') {
      crumbs[0].url = null;
      return crumbs;
    }

    const segs = inner.split('/').filter(Boolean); // ["case","case0001234"] など
    const first = '/' + (segs[0] || '') + '/'; // "/case/"
    const firstAbs = ROOT.replace(/\/$/, '') + first;
    const firstLabel = ROUTE_TITLES[first] || segs[0] || '';

    // 第2階層（一覧）
    crumbs.push({ name: firstLabel, url: segs.length >= 2 ? firstAbs : null });

    // 第3階層（詳細）：指定があるときだけ追加
    const third = getThirdTitle();
    if (segs.length >= 2 && third) {
      crumbs.push({ name: third, url: null });
    }

    return crumbs;
  }

  function makeTopicpath(crumbs) {
    const ul = document.createElement('ul');
    ul.className = 'topicpath';
    for (const c of crumbs) {
      const li = document.createElement('li');
      li.className = 'topicpath__item';
      if (c.isHome) {
        const img = document.createElement('img');
        img.src = HOME_ICON;
        img.alt = 'HOME';
        if (c.url) {
          const a = document.createElement('a');
          a.href = c.url;
          a.className = 'topicpath__text';
          a.appendChild(img);
          li.appendChild(a);
        } else {
          const s = document.createElement('span');
          s.className = 'topicpath__text';
          s.appendChild(img);
          li.appendChild(s);
        }
      } else {
        if (c.url) {
          const a = document.createElement('a');
          a.href = c.url;
          a.className = 'topicpath__text';
          a.textContent = c.name;
          li.appendChild(a);
        } else {
          const s = document.createElement('span');
          s.className = 'topicpath__text';
          s.textContent = c.name;
          li.appendChild(s);
        }
      }
      ul.appendChild(li);
    }
    return ul;
  }

  function appendIntoHeader(node) {
    const h = document.querySelector(HEADER);
    if (!h) return false;
    if (h.querySelector('ul.topicpath')) return true; // 二重生成防止
    h.appendChild(node);
    return true;
  }

  function waitHeader(timeoutMs = 8000) {
    return new Promise((res) => {
      const exist = document.querySelector(HEADER);
      if (exist) return res(exist);
      const to = setTimeout(() => {
        try {
          obs.disconnect();
        } catch {}
        res(null);
      }, timeoutMs);
      const obs = new MutationObserver(() => {
        const h = document.querySelector(HEADER);
        if (h) {
          clearTimeout(to);
          try {
            obs.disconnect();
          } catch {}
          res(h);
        }
      });
      obs.observe(document.documentElement || document.body, { childList: true, subtree: true });
    });
  }

  function injectLD(crumbs) {
    try {
      const ld = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.isHome ? 'HOME' : c.name, item: c.url ? new URL(c.url, location.origin).href : location.href })),
      };
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.textContent = JSON.stringify(ld);
      document.head.appendChild(s);
    } catch {}
  }

  ready(async () => {
    try {
      const crumbs = buildCrumbs();
      const node = makeTopicpath(crumbs);
      if (!appendIntoHeader(node)) {
        const h = await waitHeader();
        if (h) appendIntoHeader(node);
        else document.body.insertBefore(node, document.body.firstChild);
      }
      injectLD(crumbs);
    } catch (e) {
      console.warn('[topicpath] failed:', e);
    }
  });
})();
