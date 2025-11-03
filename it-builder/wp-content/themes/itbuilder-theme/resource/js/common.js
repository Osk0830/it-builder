//variables
var tabWidth = 768;

//リサイズ
$(window).on('load resize', function () {
  if ($(window).width() <= tabWidth) {
    //スマホ
    //検索ボックス
    $('.js-searchTab:not(:first)').each(function () {
      $($(this).attr('href')).hide();
    });
    $('.js-searchTab:first').addClass('is-active');

    //アコーディオン
    $('.js-accordionBoxInner').hide();
  } else {
    //検索ボックス
    $('.js-searchTab').each(function () {
      $($(this).attr('href')).show();
    });
    $('.js-searchTab').removeClass('is-active');

    //アコーディオン
    $('.js-accordionBoxInner').show();
  }

  //メニュー
  gnavClose();
});

function gnavOpen() {
  $('.gnav').show();
  $('.bg-black').fadeIn();
  $('body').addClass('is-menuOn');
  $('.js-menuBtn').addClass('is-active');
  $('.gnav').addClass('is-open');
  $('.js-menuBtn img').each(function (i) {
    $(this).attr('src', $(this).attr('src').replace('menu.png', 'close.png'));
  });
}

function gnavClose() {
  $('.gnav').hide();
  $('.bg-black').fadeOut();
  $('body').removeClass('is-menuOn');
  $('.js-menuBtn').removeClass('is-active');
  $('.gnav').removeClass('is-open');
  $('.js-menuBtn img').each(function (i) {
    $(this).attr('src', $(this).attr('src').replace('close.png', 'menu.png'));
  });
}

$(function () {
  //gnav
  $('.js-menuBtn').click(function () {
    if ($('body').hasClass('is-menuOn')) {
      gnavClose();
    } else {
      gnavOpen();
    }
    return false;
  });

  $('.bg-black').click(function () {
    gnavClose();
  });

  //    $('.js-menuBtn').click(function () {
  //        $('body').toggleClass('is-menuOn');
  //        $('.gnav').fadeToggle();
  //        if ($('body').hasClass('is-menuOn')) {
  //            $('.js-menuBtn img').each(function (i) {
  //                $(this).attr('src', $(this).attr('src').replace('menu.png', 'close.png'));
  //            });
  //        } else {
  //            $('.js-menuBtn img').each(function (i) {
  //                $(this).attr('src', $(this).attr('src').replace('close.png', 'menu.png'));
  //            });
  //        }
  //        return false;
  //    });

  //アコーディオン
  $('.js-accordionBtn').click(function () {
    $(this).toggleClass('is-on').parents('.js-accordionBox').find('.js-accordionBoxInner').slideToggle();
    return false;
  });

  //よくある質問アコーディオン
  $('.js-faqAccordion').click(function () {
    $(this).toggleClass('is-on').next().slideToggle();
    return false;
  });

  //popup
  $('.js-popupLink').on('click', function () {
    popOpen($(this).attr('href'));
    return false;
  });

  $('.js-popupClose').click(function () {
    popClose();
    return false;
  });

  var pop = $('.js-popupBlock');
  var bg = $('.bg-black');
  var popFlag = 0;

  function popPosition(e) {
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
    popPosition(e);
    $(e).fadeIn(300);
    bg.css({ zIndex: 998 }).fadeIn(300);
    popFlag = 1;
  }

  function popClose() {
    pop.fadeOut(300);
    bg.css({ zIndex: 50 }).fadeOut(300);
    popFlag = 0;
  }
  bg.click(function () {
    if (popFlag) {
      popClose();
    }
  });
  //page scroll
  $('a[href^="#"]:not([class*=js-])').click(function () {
    var headH = $('.header').outerHeight();
    var topicpathH = $('.topicpath').length > 0 ? $('.topicpath').outerHeight() : 0;
    if ($(window).width() > tabWidth) {
      var headerH = parseInt(headH) + parseInt(topicpathH) + 10;
    } else {
      var headerH = parseInt(headH);
    }
    var speed = 500;
    var href = $(this).attr('href');
    var target = href == '#' || href == '' ? $('html') : $(href);

    if (target.length > 0) {
      var position = target.offset().top - headerH;
      $('html,body').animate({ scrollTop: position }, speed, 'swing');
    }
    return false;
  });

  //別ページからの場合
  $(window).on('load', function () {
    var url = $(location).attr('href');
    var headH = $('.header').outerHeight();
    var topicpathH = $('.topicpath').length > 0 ? $('.topicpath').outerHeight() : 0;
    if ($(window).width() > tabWidth) {
      var headerH = parseInt(headH) + parseInt(topicpathH) + 10;
    } else {
      var headerH = parseInt(headH);
    }
    if (url.indexOf('#') != -1) {
      var anchor = url.split('#');
      var target = $('#' + anchor[anchor.length - 1]);
      if (target.length) {
        var pos = Math.floor(target.offset().top) - headerH;
        $('html, body').animate({ scrollTop: pos }, 500);
      }
    }
  });

  //searchTab
  $('.js-searchTab').click(function () {
    var tabUrl = $(this).attr('href');
    $('.js-searchTab').removeClass('is-active');
    $(this).addClass('is-active');
    $('.searchBox__item').hide();
    $(tabUrl).fadeIn();
    return false;
  });

  //ページを閉じる
  $('.js-pageClose').click(function () {
    window.open('about:blank', '_self').close();
    return false;
  });
});

//スクロールナビ
$(function () {
  if ($('.js-sectionNav').length) {
    var navLink = $('.js-sectionNav a');

    //エリアを取得
    var contentsArr = new Array();
    for (var i = 0; i < navLink.length; i++) {
      var targetContents = navLink.eq(i).attr('href');
      if (targetContents.charAt(0) == '#') {
        var targetContentsTop = $(targetContents).offset().top;
        var targetContentsBottom = targetContentsTop + $(targetContents).outerHeight(true) - 1;
        contentsArr[i] = [targetContentsTop, targetContentsBottom];
      }
    }

    //カレントのclassの制御
    function currentCheck() {
      var windowScrolltop = $(window).scrollTop() + 350;
      if ($('.keyvisual').length) {
        windowScrolltop = $(window).scrollTop() + $(window).height() + 350;
      }
      for (var i = 0; i < contentsArr.length; i++) {
        if (contentsArr[i][0] <= windowScrolltop) {
          navLink.removeClass('is-active');
          navLink.eq(i).addClass('is-active');
          i == contentsArr.length;
        }
      }
    }

    $(window).on('load scroll', function () {
      currentCheck();

      //endBlockの設定
      var endBlock = $('.footer').offset().top;
      //footerの直前にnewsブロックがあった時
      if ($('.news').length && $('.news').next().hasClass('footer')) {
        endBlock = $('.news').offset().top;
        console.log('A');
      }
      //ナビの最後に指定された要素の後に要素があった時
      if ($($('.js-sectionNav a:last').attr('href')).next().length && !$($('.js-sectionNav a:last').attr('href')).next().hasClass('js-popupBlock')) {
        endBlock = $($('.js-sectionNav a:last').attr('href')).next().offset().top - $(window).height() / 2;
      }

      //startBlock
      var startBlock = $(window).height() / 2;
      if ($('.pageVisual').length) {
        startBlock = $('.pageVisual').offset().top + $('.pageVisual').height();
      }

      //表示・非表示の制御
      if (endBlock > $(this).scrollTop() && $(this).scrollTop() > startBlock) {
        $('.js-sectionNav').addClass('is-show');
      } else {
        $('.js-sectionNav').removeClass('is-show');
      }
    });
  }
});

//高さそろえ
jQuery(function ($) {
  var $matchHeightItem = $('.serviceBox__item,.improvementBox__item__inner');
  $matchHeightItem.matchHeight({
    property: 'min-height',
  });
});

jQuery(function ($) {
  /*
   * 活用例
   */
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

  // 検索ページに遷移して検索
  var search_post = function () {
    $form.submit();
  };

  // 検索ページで遷移なしで検索
  var search_page = function () {
    change_block();
    return false;
  };

  var search_reset = function () {
    $dep_dl.find('input[type=checkbox]:checked').each(function () {
      $(this).prop('checked', false);
    });
    $pur_dl.find('input[type=checkbox]:checked').each(function () {
      $(this).prop('checked', false);
    });
    $func_dl.find('input[type=checkbox]:checked').each(function () {
      $(this).prop('checked', false);
    });
  };

  // 表示・非表示切替
  var change_block = function () {
    var class_name = '';
    var dep = [];
    var pur = [];
    var func = [];
    var $span = $('<span class="filterBox__list__item">');

    $filter_box.find('.filterBox__list__item').each(function () {
      $(this).remove();
    });

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

    if ($filter_box.find('.filterBox__list__item').length > 0) {
      $filter_box.show();
    } else {
      $filter_box.hide();
    }

    /*
        // 削除したDOMを戻す
        $.each(hide_doms, function(i,v){
            if( v ) {
                if( $case_list.find('li').eq(i).length > 0 )
                    $case_list.find('li').eq(i).before(v);
                else
                    $case_list.find('li').eq(i-1).after(v);
            }
        });
        hide_doms = [];
*/

    // $case_list.find('li').show();
    $case_list.empty();
    $case_list.append($clone_list.clone(true));
    // 縦列はOR検索、横はAND検索とする
    $case_list.find('li').each(function (i, target) {
      $.each(dep, function (j, v) {
        if ($(target).hasClass(v)) return false;
        // cssでnthを使用しているため、hideでは崩れてしまう。一度DOMを削除する
        else if (dep.length === j + 1) $(target).remove();
        // hide_doms[i] = $(target).clone(true);
      });
      $.each(pur, function (j, v) {
        if ($(target).hasClass(v)) return false;
        if (pur.length === j + 1) $(target).remove();
        // hide_doms[i] = $(target).clone(true);
      });
      $.each(func, function (j, v) {
        if ($(target).hasClass(v)) return false;
        if (func.length === j + 1) $(target).remove();
        // hide_doms[i] = $(target).clone(true);
      });
    });
    /*
        // ループ中にDOMを削除すると、iの値がおかしくなるので削除はここで一括でおこなう
        $.each(hide_doms.reverse(), function(i,v){
            if( v ) {
                $case_list.find('li').eq(li_length-(i+1)).remove();
            }
        });
        // 戻す
        hide_doms.reverse();
*/

    var $caseMatchHeightItem = $('.caseList__text');
    $caseMatchHeightItem.matchHeight({
      property: 'min-height',
    });
  };

  $search_button.on('click', function () {
    if ($(this).attr('id') === top_button) {
      search_post();
      $('html,body').animate({ scrollTop: $('#case-list').offset().top }, 500, 'swing');
    } else {
      search_page();
      $('html,body').animate({ scrollTop: $('#case-list').offset().top }, 500, 'swing');
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

jQuery(function ($) {
  /*
   * よくある質問
   */

  var $checbox_dd = $('.searchFilterBox__inner');
  var $filter_button = $('button.searchFilterBox__btn');
  var $faq_list = $('.faqAccordion');
  var $filter_box = $('.filterBox');

  var search_page = function () {
    var class_name = '';
    var faq = [];
    var $span = $('<span class="filterBox__list__item">');

    $filter_box.find('.filterBox__list__item').each(function () {
      $(this).remove();
    });

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
    if ($filter_box.find('.filterBox__list__item').length > 0) {
      $filter_box.show();
    } else {
      $filter_box.hide();
    }
    $faq_list.find('li').show();
    // 縦列はOR検索、横はAND検索とする
    $faq_list.find('li').each(function (i, target) {
      $.each(faq, function (j, v) {
        if ($(target).hasClass(v)) return false;
        else if (faq.length === j + 1) $(target).hide();
      });
    });
  };
  var search_reset = function () {
    $checbox_dd.find('input[type=checkbox]:checked').each(function () {
      $(this).prop('checked', false);
    });
  };

  $filter_button.on('click', function () {
    search_page();

    var headH = $('.header').outerHeight();
    var topicpathH = $('.topicpath').outerHeight();
    if ($(window).width() > tabWidth) {
      var headerH = parseInt(headH) + parseInt(topicpathH) + 10;
    } else {
      var headerH = parseInt(headH);
    }
    var position = $('#faq-list').offset().top - headerH;
    $('html,body').animate({ scrollTop: position }, 500, 'swing');

    return false;
  });

  $('.faqSearch .filterBox__list__reset').on('click', function () {
    search_reset();
    search_page();
    return false;
  });
});
