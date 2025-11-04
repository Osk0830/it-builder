// /wp-content/themes/itbuilder-theme/resource/js/common.js
// ※ 既存ファイルをこの内容で置き換え

// =====================================
// 共通設定
// =====================================
var tabWidth = 768;

// =====================================
// メニュー開閉（そのまま利用：外部からも呼べる）
// =====================================
function gnavOpen() {
  $('.gnav').show();
  $('.bg-black').fadeIn();
  $('body').addClass('is-menuOn');
  $('.js-menuBtn').addClass('is-active');
  $('.gnav').addClass('is-open');
  $('.js-menuBtn img').each(function () {
    var s = $(this).attr('src');
    if (s) $(this).attr('src', s.replace('menu.png', 'close.png'));
  });
}

function gnavClose() {
  $('.gnav').hide();
  $('.bg-black').fadeOut();
  $('body').removeClass('is-menuOn');
  $('.js-menuBtn').removeClass('is-active');
  $('.gnav').removeClass('is-open');
  $('.js-menuBtn img').each(function () {
    var s = $(this).attr('src');
    if (s) $(this).attr('src', s.replace('close.png', 'menu.png'));
  });
}

// =====================================
// 画面幅に応じた初期表示（リサイズで再実行）
// =====================================
$(window).on('load resize', function () {
  if ($(window).width() <= tabWidth) {
    // スマホ
    $('.js-searchTab:not(:first)').each(function () {
      var $t = $($(this).attr('href'));
      if ($t.length) $t.hide();
    });
    $('.js-searchTab:first').addClass('is-active');
    $('.js-accordionBoxInner').hide();
  } else {
    // PC/タブレット
    $('.js-searchTab').each(function () {
      var $t = $($(this).attr('href'));
      if ($t.length) $t.show();
    });
    $('.js-searchTab').removeClass('is-active');
    $('.js-accordionBoxInner').show();
  }
  // メニューは基本閉じる
  if (typeof gnavClose === 'function') gnavClose();
});

// =====================================
// クリック系は「委譲」へ（インクルード後でも効く）
// =====================================
$(document)
  .off('click.menu')
  .on('click.menu', '.js-menuBtn', function (e) {
    e.preventDefault();
    if ($('body').hasClass('is-menuOn')) gnavClose();
    else gnavOpen();
  });

$(document)
  .off('click.menuBg')
  .on('click.menuBg', '.bg-black', function () {
    gnavClose();
  });

// アコーディオン
$(document)
  .off('click.acc1')
  .on('click.acc1', '.js-accordionBtn', function () {
    $(this).toggleClass('is-on').parents('.js-accordionBox').find('.js-accordionBoxInner').stop(true, true).slideToggle();
    return false;
  });

// FAQアコーディオン
$(document)
  .off('click.acc2')
  .on('click.acc2', '.js-faqAccordion', function () {
    $(this).toggleClass('is-on').next().stop(true, true).slideToggle();
    return false;
  });

// ポップアップ
$(document)
  .off('click.popOpen')
  .on('click.popOpen', '.js-popupLink', function () {
    popOpen($(this).attr('href'));
    return false;
  });

$(document)
  .off('click.popClose')
  .on('click.popClose', '.js-popupClose', function () {
    popClose();
    return false;
  });

var popFlag = 0;

// その場で .bg-black を確実に用意して返す
function ensureBg() {
  var $bg = $('.bg-black');
  if (!$bg.length) {
    // なければ body 末尾に生成（スタッキングコンテキストの影響を受けにくい）
    $bg = $('<div class="bg-black" aria-hidden="true"></div>').appendTo(document.body);
  }
  return $bg;
}

function popPosition(e) {
  if (!e) return;
  if ($(window).width() > tabWidth) {
    $(e).css({
      top: ($(window).height() - $(e).outerHeight()) / 2,
      left: ($(window).width() - $(e).outerWidth()) / 2,
    });
  } else {
    var SpPositionH = $(document).scrollTop();
    if ($(window).height() >= $(e).outerHeight()) {
      SpPositionH = $(document).scrollTop() + ($(window).height() - $(e).outerHeight()) / 2;
    }
    $(e).css({ top: SpPositionH, left: 0 });
  }
}

function popOpen(e) {
  if (!e || !$(e).length) return;
  var $bg = ensureBg();
  popPosition(e);
  $(e).stop(true, true).fadeIn(300);
  $bg.css({ zIndex: 998 }).stop(true, true).fadeIn(300);
  popFlag = 1;
}

function popClose() {
  var $bg = ensureBg();
  $('.js-popupBlock:visible').stop(true, true).fadeOut(300);
  $bg.css({ zIndex: 50 }).stop(true, true).fadeOut(300);
  popFlag = 0;
}

// 背景クリックは委譲（後から生成/インクルードでも拾える）
$(document)
  .off('click.popBg')
  .on('click.popBg', '.bg-black', function () {
    if (popFlag) popClose();
  });

// includes:ready で既存の .bg-black があれば body 末尾へ退避（z-index事故を減らす）
document.addEventListener(
  'includes:ready',
  function () {
    var $bg = $('.bg-black');
    if ($bg.length) $bg.appendTo(document.body);
  },
  { once: true },
);

$(document)
  .off('keydown.popEsc')
  .on('keydown.popEsc', function (e) {
    // IME合成中は無視（日本語入力の途中で誤反応しないように）
    if (e.isComposing) return;
    if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) {
      if (popFlag) {
        e.preventDefault();
        popClose();
      }
    }
  });

// =====================================
// ページ内アンカー（委譲）
// =====================================
$(document)
  .off('click.hash')
  .on('click.hash', 'a[href^="#"]:not([class*=js-])', function (e) {
    e.preventDefault();
    var headH = $('.header').outerHeight() || 0;
    var topicpathH = $('.topicpath').length ? $('.topicpath').outerHeight() || 0 : 0;
    var headerH = $(window).width() > tabWidth ? parseInt(headH) + parseInt(topicpathH) + 10 : parseInt(headH);
    var href = $(this).attr('href');
    var $target = href === '#' || href === '' ? $('html') : $(href);
    if ($target.length) {
      var position = Math.floor($target.offset().top) - headerH;
      $('html,body').animate({ scrollTop: position }, 500, 'swing');
    }
  });

// 別ページからの #hash
$(window).on('load', function () {
  var url = String(location.href || '');
  if (url.indexOf('#') === -1) return;
  var headH = $('.header').outerHeight() || 0;
  var topicpathH = $('.topicpath').length ? $('.topicpath').outerHeight() || 0 : 0;
  var headerH = $(window).width() > tabWidth ? parseInt(headH) + parseInt(topicpathH) + 10 : parseInt(headH);
  var anchor = url.split('#');
  var $target = $('#' + anchor[anchor.length - 1]);
  if ($target.length) {
    var pos = Math.floor($target.offset().top) - headerH;
    $('html, body').animate({ scrollTop: pos }, 500);
  }
});

// =====================================
// 検索タブ
// =====================================
$(document)
  .off('click.searchTab')
  .on('click.searchTab', '.js-searchTab', function () {
    var tabUrl = $(this).attr('href');
    $('.js-searchTab').removeClass('is-active');
    $(this).addClass('is-active');
    $('.searchBox__item').hide();
    if (tabUrl && $(tabUrl).length) $(tabUrl).fadeIn();
    return false;
  });

// ページを閉じる
$(document)
  .off('click.pageClose')
  .on('click.pageClose', '.js-pageClose', function () {
    window.open('about:blank', '_self').close();
    return false;
  });

// =====================================
// スクロールナビ（.js-sectionNav）
// =====================================
function mountSectionNav() {
  if (!$('.js-sectionNav').length) return;

  var navLink = $('.js-sectionNav a');
  var contentsArr = [];

  for (var i = 0; i < navLink.length; i++) {
    var href = navLink.eq(i).attr('href');
    if (href && href.charAt(0) === '#') {
      var $t = $(href);
      if ($t.length) {
        var top = $t.offset().top;
        var bottom = top + $t.outerHeight(true) - 1;
        contentsArr[i] = [top, bottom];
      }
    }
  }

  function currentCheck() {
    var windowScrolltop = $(window).scrollTop() + 350;
    if ($('.keyvisual').length) {
      windowScrolltop = $(window).scrollTop() + $(window).height() + 350;
    }
    for (var i = 0; i < contentsArr.length; i++) {
      if (contentsArr[i] && contentsArr[i][0] <= windowScrolltop) {
        navLink.removeClass('is-active');
        navLink.eq(i).addClass('is-active');
      }
    }
  }

  $(window)
    .off('.secnav')
    .on('load.secnav scroll.secnav', function () {
      currentCheck();

      var $footer = $('.footer');
      var endBlock = $footer.length ? $footer.offset().top : $(document).height();

      if ($('.news').length && $('.news').next().hasClass('footer')) {
        var $news = $('.news');
        if ($news.length) endBlock = $news.offset().top;
      }

      var $lastNext = $($('.js-sectionNav a:last').attr('href')).next();
      if ($lastNext.length && !$lastNext.hasClass('js-popupBlock')) {
        endBlock = $lastNext.offset().top - $(window).height() / 2;
      }

      var startBlock = $(window).height() / 2;
      if ($('.pageVisual').length) {
        startBlock = $('.pageVisual').offset().top + $('.pageVisual').height();
      }

      if (endBlock > $(this).scrollTop() && $(this).scrollTop() > startBlock) {
        $('.js-sectionNav').addClass('is-show');
      } else {
        $('.js-sectionNav').removeClass('is-show');
      }
    });
}
$(mountSectionNav);
document.addEventListener(
  'includes:ready',
  function () {
    mountSectionNav();
  },
  { once: true },
);

// =====================================
// 高さ揃え（存在時のみ）
// =====================================
jQuery(function ($) {
  var $matchHeightItem = $('.serviceBox__item,.improvementBox__item__inner');
  if ($matchHeightItem.length && $.fn.matchHeight) {
    $matchHeightItem.matchHeight({ property: 'min-height' });
  }
});

// =====================================
// 活用例（検索ページ／ケースリスト）
// =====================================
jQuery(function ($) {
  var $form = $('form#case-search');
  var $search_button = $('button.searchBox__btn');
  var $case_list = $('ul.caseList');
  var $filter_box = $('.filterBox');
  var top_button = 'top-search-button';
  var $dep_dl = $('#a-searchDepartment');
  var $pur_dl = $('#a-searchPurpose');
  var $func_dl = $('#a-searchKeyword');
  var $clone_list = $('ul.caseList li').clone(true);
  var li_length = $case_list.find('li').length;

  function search_post() {
    $form.submit();
  }

  function search_page() {
    change_block();
    return false;
  }

  function search_reset() {
    $dep_dl.find('input[type=checkbox]:checked').prop('checked', false);
    $pur_dl.find('input[type=checkbox]:checked').prop('checked', false);
    $func_dl.find('input[type=checkbox]:checked').prop('checked', false);
  }

  function change_block() {
    var class_name = '';
    var dep = [],
      pur = [],
      func = [];
    var $span = $('<span class="filterBox__list__item">');

    $filter_box.find('.filterBox__list__item').remove();

    if ($dep_dl.find('input[type=checkbox]:checked').length > 0) {
      dep = $dep_dl
        .find('input[type=checkbox]:checked')
        .map(function () {
          var span_clone = $span.clone();
          span_clone.text($(this).next().text());
          $filter_box.find('dd').append(span_clone);
          return (class_name = $(this).attr('name').replace('[]', '_') + $(this).val());
        })
        .get();
    }
    if ($pur_dl.find('input[type=checkbox]:checked').length > 0) {
      pur = $pur_dl
        .find('input[type=checkbox]:checked')
        .map(function () {
          var span_clone = $span.clone();
          span_clone.text($(this).next().text());
          $filter_box.find('dd').append(span_clone);
          return (class_name = $(this).attr('name').replace('[]', '_') + $(this).val());
        })
        .get();
    }
    if ($func_dl.find('input[type=checkbox]:checked').length > 0) {
      func = $func_dl
        .find('input[type=checkbox]:checked')
        .map(function () {
          var span_clone = $span.clone();
          span_clone.text($(this).next().text());
          $filter_box.find('dd').append(span_clone);
          return (class_name = $(this).attr('name').replace('[]', '_') + $(this).val());
        })
        .get();
    }

    if ($filter_box.find('.filterBox__list__item').length > 0) $filter_box.show();
    else $filter_box.hide();

    $case_list.empty();
    $case_list.append($clone_list.clone(true));

    $case_list.find('li').each(function (_i, target) {
      $.each(dep, function (j, v) {
        if ($(target).hasClass(v)) return false;
        else if (dep.length === j + 1) $(target).remove();
      });
      $.each(pur, function (j, v) {
        if ($(target).hasClass(v)) return false;
        else if (pur.length === j + 1) $(target).remove();
      });
      $.each(func, function (j, v) {
        if ($(target).hasClass(v)) return false;
        else if (func.length === j + 1) $(target).remove();
      });
    });

    var $caseMatchHeightItem = $('.caseList__text');
    if ($caseMatchHeightItem.length && $.fn.matchHeight) {
      $caseMatchHeightItem.matchHeight({ property: 'min-height' });
    }
  }

  $search_button.on('click', function () {
    if ($(this).attr('id') === top_button) {
      search_post();
      if ($('#case-list').length) $('html,body').animate({ scrollTop: $('#case-list').offset().top }, 500, 'swing');
    } else {
      search_page();
      if ($('#case-list').length) $('html,body').animate({ scrollTop: $('#case-list').offset().top }, 500, 'swing');
      return false;
    }
  });

  $('.caseSearch .filterBox__list__reset').on('click', function () {
    search_reset();
    search_page();
  });

  if ($form.length > 0) {
    search_page();
  }
});

// =====================================
// よくある質問（検索）
// =====================================
jQuery(function ($) {
  var $checbox_dd = $('.searchFilterBox__inner');
  var $filter_button = $('button.searchFilterBox__btn');
  var $faq_list = $('.faqAccordion');
  var $filter_box = $('.filterBox');

  function search_page() {
    var class_name = '';
    var faq = [];
    var $span = $('<span class="filterBox__list__item">');

    $filter_box.find('.filterBox__list__item').remove();

    if ($checbox_dd.find('input[type=checkbox]:checked').length > 0) {
      faq = $checbox_dd
        .find('input[type=checkbox]:checked')
        .map(function () {
          var span_clone = $span.clone();
          span_clone.text($(this).next().text());
          $filter_box.find('dd').append(span_clone);
          return (class_name = $(this).attr('name').replace('[]', '_') + $(this).val());
        })
        .get();
    }
    if ($filter_box.find('.filterBox__list__item').length > 0) $filter_box.show();
    else $filter_box.hide();

    $faq_list.find('li').show();
    $faq_list.find('li').each(function (_i, target) {
      $.each(faq, function (j, v) {
        if ($(target).hasClass(v)) return false;
        else if (faq.length === j + 1) $(target).hide();
      });
    });
  }
  function search_reset() {
    $checbox_dd.find('input[type=checkbox]:checked').prop('checked', false);
  }

  $filter_button.on('click', function () {
    search_page();
    var headH = $('.header').outerHeight() || 0;
    var topicpathH = $('.topicpath').outerHeight() || 0;
    var headerH = $(window).width() > tabWidth ? parseInt(headH) + parseInt(topicpathH) + 10 : parseInt(headH);
    if ($('#faq-list').length) {
      var position = $('#faq-list').offset().top - headerH;
      $('html,body').animate({ scrollTop: position }, 500, 'swing');
    }
    return false;
  });

  $('.faqSearch .filterBox__list__reset').on('click', function () {
    search_reset();
    search_page();
    return false;
  });
});
