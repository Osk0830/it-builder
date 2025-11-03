(function () {
  function isTablet() {
    var u = navigator.userAgent.toLowerCase();
    return (
      (u.indexOf('windows') != -1 && u.indexOf('touch') != -1 && u.indexOf('tablet pc') == -1) ||
      u.indexOf('ipad') != -1 ||
      (u.indexOf('android') != -1 && u.indexOf('mobile') == -1) ||
      (u.indexOf('firefox') != -1 && u.indexOf('tablet') != -1) ||
      u.indexOf('kindle') != -1 ||
      u.indexOf('silk') != -1 ||
      u.indexOf('playbook') != -1
    );
  }

  if (isTablet()) {
    document.write('<meta name="viewport" content="width=1000">');
  } else {
    document.write('<meta name="viewport" content="width=device-width,initial-scale=1.0">');
  }
})();
