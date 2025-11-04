// トップの「検索する」ボタンから /case/ へ条件をクエリで渡す（静的対応）
// 依存: jQuery（既存と同じ）

(() => {
  'use strict';

  const ready = (fn) => (document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn, { once: true }));

  // include-loader を使っていても確実にハンドラが乗るよう委譲 + ready 両方で。
  function mount() {
    // 既存の form action を基準に、遷移先のベースURLを作る
    const $form = $('#case-search');
    let base = '/it-builder/case/'; // 既定
    const act = $form.attr('action');
    if (act) {
      // action="/it-builder/case/#case-list" のような場合を /it-builder/case/ に正規化
      try {
        const a = document.createElement('a');
        a.href = act;
        // ハッシュ前まで。クエリはこの後自分で付ける。
        base = a.pathname.endsWith('/') ? a.pathname : a.pathname + '/';
      } catch {}
    }

    // クリックを奪ってクエリ作成 → 遷移
    $(document)
      .off('click.topSearch')
      .on('click.topSearch', '#top-search-button', function (e) {
        e.preventDefault();

        const pick = (name) =>
          $(`input[name="${name}"]:checked`)
            .map(function () {
              return $(this).val();
            })
            .get();

        const dep = pick('s_dep[]'); // 例: ["16","22"]
        const pur = pick('s_pur[]'); // 例: ["26"]
        const func = pick('s_func[]'); // 例: ["32","37"]

        const toQS = (key, arr) => (arr && arr.length ? `${encodeURIComponent(key)}=${encodeURIComponent(arr.join(','))}` : '');
        const parts = [toQS('dep', dep), toQS('pur', pur), toQS('func', func)].filter(Boolean);
        const qs = parts.length ? `?${parts.join('&')}` : '';

        const url = `${base}${qs}#case-list`;
        window.location.assign(url);
      });
  }

  ready(mount);
  document.addEventListener('includes:ready', mount);
})();
