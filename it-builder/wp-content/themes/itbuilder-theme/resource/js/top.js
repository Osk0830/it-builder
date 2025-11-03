//variables
var tabWidth = 768;

//リサイズ
$(window).on('load resize', function () {
  slideHuck();
  slideHuck2();
});

function slideHuck() {
  if ($(window).width() <= tabWidth) {
    //スマホ
    $('.js-installationBox').slick({
      dots: true,
      arrows: true,
      centerMode: true,
      variableWidth: true,
    });
  }
}

function slideHuck2() {
  //slider
  $('.js-keyvisual').slick({
    autoplay: true,
    dots: true,
    centerMode: true,
    variableWidth: true,
    responsive: [
      {
        breakpoint: 768,
        settings: {
          arrows: true,
        },
      },
    ],
  });
  $('.js-serviceBox').slick({
    dots: true,
    arrows: true,
    centerMode: true,
    variableWidth: true,
  });
}
