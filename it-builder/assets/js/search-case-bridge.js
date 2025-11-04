// /case/ 側で ?dep=16,22&pur=26&func=32 を読んで、チェック反映→リストをフィルタ
// 依存: jQuery（既存と同じ）
// 仕様: カテゴリ内は OR、カテゴリ間は AND（＝元の common.js と同じ思想）
//
// 前提: <li> に s_dep_16 / s_pur_26 / s_func_32 のようなクラスが付与されている想定。
//       （もし違う命名なら "buildCls" を合わせればOK）

(() => {
  'use strict';

  const ready = (fn) => (document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn, { once: true }));

  const getParams = () => {
    const p = new URLSearchParams(window.location.search);
    const parse = (key) =>
      (p.get(key) || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    return { dep: parse('dep'), pur: parse('pur'), func: parse('func') };
  };

  const buildCls = {
    dep: (v) => `s_dep_${v}`,
    pur: (v) => `s_pur_${v}`,
    func: (v) => `s_func_${v}`,
  };

  function applyParamsToCheckboxes(params) {
    const mark = (name, vals) => {
      vals.forEach((v) => $(`input[name="${name}"][value="${v}"]`).prop('checked', true));
    };
    mark('s_dep[]', params.dep);
    mark('s_pur[]', params.pur);
    mark('s_func[]', params.func);
  }

  function filterList(params) {
    const $list = $('ul.caseList');
    if (!$list.length) return;

    const needDep = params.dep.length ? params.dep.map(buildCls.dep) : null;
    const needPur = params.pur.length ? params.pur.map(buildCls.pur) : null;
    const needFunc = params.func.length ? params.func.map(buildCls.func) : null;

    // 既存DOMを一旦全部表示 → 条件に合わないものを remove（nth崩れ対策が不要なら hide でもOK）
    const $items = $list.children('li').show();

    $items.each(function () {
      const el = this;
      const hasAny = (reqArr) => {
        if (!reqArr) return true; // そのカテゴリ条件なし
        // reqArr のいずれかのクラスが付いていればOK
        return reqArr.some((cls) => el.classList.contains(cls));
      };
      const ok = hasAny(needDep) && hasAny(needPur) && hasAny(needFunc);
      if (!ok) el.remove(); // CSS依存があれば .hide() に変更
    });

    // タグの表示（.filterBox があれば）
    const $filterBox = $('.filterBox');
    if ($filterBox.length) {
      const $dd = $filterBox.find('dd');
      $filterBox.find('.filterBox__list__item').remove();
      const push = (vals, nameSel) => {
        vals.forEach((v) => {
          const $label = $(`input[name="${nameSel}"][value="${v}"]`).next('.searchBox__check__text').first();
          const text = $label.text() || v;
          $('<span class="filterBox__list__item">').text(text).appendTo($dd);
        });
      };
      push(params.dep, 's_dep[]');
      push(params.pur, 's_pur[]');
      push(params.func, 's_func[]');
      $filterBox.toggle(!!$filterBox.find('.filterBox__list__item').length);
    }
  }

  function scrollIntoList() {
    const $target = $('#case-list');
    if (!$target.length) return;
    // ヘッダー高さを考慮（元テーマ準拠）
    const headH = $('.header').outerHeight() || 0;
    const topicpathH = $('.topicpath').length ? $('.topicpath').outerHeight() || 0 : 0;
    const headerH = window.innerWidth > 768 ? parseInt(headH) + parseInt(topicpathH) + 10 : parseInt(headH);
    const pos = Math.floor($target.offset().top) - headerH;
    $('html, body').animate({ scrollTop: pos }, 500, 'swing');
  }

  function boot() {
    const params = getParams();
    if (!params.dep.length && !params.pur.length && !params.func.length) return;

    applyParamsToCheckboxes(params);

    // もし common.js 内の検索ロジックがそのまま使える環境なら
    // 「ページ内検索ボタン」をクリックして既存処理に流してもOK:
    //   $('button.searchBox__btn').not('#top-search-button').first().trigger('click');
    //
    // ただしスコープにより関数が閉じているページもあるため、ここでは自前で確定フィルタを実行。
    filterList(params);

    // case-list までスクロール
    scrollIntoList();
  }

  ready(boot);
  document.addEventListener('includes:ready', boot);
})();
