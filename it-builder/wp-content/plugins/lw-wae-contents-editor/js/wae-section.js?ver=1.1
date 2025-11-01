jQuery(function($){
  $('.wae-section-accordion-title').on({
    'focusin focusout': function(){
        $(this).toggleClass('focus')
    },
    'click keydown': function(e){
        if(typeof e.keyCode === "undefined" || e.keyCode === 13) {
          if ($('+.wae-section-accordion-body', this).css('display') !== 'block') {
              // 高さを取るため一度表示
              $('+.wae-section-accordion-body', this).show();
              resize();
              $('+.wae-section-accordion-body', this).hide();

              $('+.wae-section-accordion-body', this).slideDown();
              $(this).addClass('wae-section-accordion-title-on');
              $(this).removeClass('wae-section-accordion-title-off');
          } else {
              $('+.wae-section-accordion-body', this).slideUp();
              $(this).addClass('wae-section-accordion-title-off');
              $(this).removeClass('wae-section-accordion-title-on');
          }
        }
    }
  });
});

//jQuery(function($){
//    // $('.wae-section-accordion-body').hide();
//    // $('.wae-section-accordion-title').on("click", function () {
//    $('body').on("click", ".wae-section-accordion-title", function() {
//        if ($('+.wae-section-accordion-body', this).css('display') !== 'block') {
//            // 高さを取るため一度表示
//            $('+.wae-section-accordion-body', this).show();
//            resize();
//            $('+.wae-section-accordion-body', this).hide();
//
//            $('+.wae-section-accordion-body', this).slideDown();
//            $(this).addClass('wae-section-accordion-title-on');
//            $(this).removeClass('wae-section-accordion-title-off');
//        } else {
//            $('+.wae-section-accordion-body', this).slideUp();
//            $(this).addClass('wae-section-accordion-title-off');
//            $(this).removeClass('wae-section-accordion-title-on');
//        }
//    });
//});


jQuery(window).load(function ($) {
    resize();
    accordionIcon()
    jQuery('.wae-section-accordion-open>.wae-section-accordion-title').addClass('wae-section-accordion-title-on').removeClass('wae-section-accordion-title-off');
});

var t = false;
jQuery(window).resize(function ($) {
    if (t !== false) {
        clearTimeout(t);
    }
    t = setTimeout(function () {
        resize();
    }, 200);
});


function resize() {
    if (jQuery(window).width() < 750) {
        jQuery('.wae-section-block').css({height: 'auto'});
    } else {
        jQuery('.wae-section-column2').each(function () {
            column(2, jQuery(this));
        });
        jQuery('.wae-section-column3').each(function () {
            column(3, jQuery(this));
        });
        jQuery('.wae-section-column4').each(function () {
            column(4, jQuery(this));
        });
        jQuery('.wae-section-column5').each(function () {
            column(5, jQuery(this));
        });
        jQuery('.wae-section-column6').each(function () {
            column(6, jQuery(this));
        });
    }
}
function column(x, obj) {
    var block = obj.children('.wae-section-block');
    var i = 1, j = 1, h = 0 , thish = 0;
    block.css({height: 'auto'});
    block.each(function () {
        thish =
          jQuery(this).height()
          + Number(jQuery(this).css('paddingTop').replace('px', ''))
          + Number(jQuery(this).css('paddingBottom').replace('px', ''))+
          + Number(jQuery(this).css('borderTopWidth').replace('px', ''))+
          + Number(jQuery(this).css('borderBottomWidth').replace('px', ''));
        if (h < thish) {
            h = thish;
        }
        if (jQuery(this).index() + 1 === i * x) {
            for (n = j; n < i * x + 1; n++) {
                block.eq(n - 1).css({height: h});
            }
            i++;
            j += x;
            h = 0;
        }
    });

}

function accordionIcon(){
	jQuery('.wae-section-accordion-title').each(function(){
		var img=jQuery(this).find('h2>img');
		var imgWidth=img.width();
		var imgHeight=img.height();
		jQuery(this).find('h2').css({paddingTop:imgHeight/4,paddingBottom:imgHeight/4,paddingLeft:imgWidth+8});
	})
}