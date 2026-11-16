(function () {
  var PHONE_W = 1920;
  var PHONE_H = 1080;
  var DESK_W = 2160;
  var DESK_H = 1080;
  var screen = document.createElement('div');
  screen.id = 'screen';
  while (document.body.firstChild) screen.appendChild(document.body.firstChild);
  document.body.appendChild(screen);

  function viewport() {
    var vv = window.visualViewport;
    if (!vv) return { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
    return { x: vv.offsetLeft, y: vv.offsetTop, w: vv.width, h: vv.height };
  }

  function isPhone() {
    var coarse = window.matchMedia('(pointer: coarse)').matches;
    var shortSide = Math.min(window.screen.width, window.screen.height);
    return coarse && shortSide > 0 && shortSide <= 600;
  }

  function fit() {
    var view = viewport();
    var phone = isPhone();
    var rotate = phone && view.h > view.w;
    var designW = phone ? PHONE_W : DESK_W;
    var designH = phone ? PHONE_H : DESK_H;
    screen.style.width = designW + 'px';
    screen.style.height = designH + 'px';
    var scale = rotate
      ? Math.min(view.w / designH, view.h / designW)
      : Math.min(view.w / designW, view.h / designH);
    if (!isFinite(scale) || scale <= 0) scale = 1;
    var boxW = (rotate ? designH : designW) * scale;
    var boxH = (rotate ? designW : designH) * scale;
    var tx = (view.w - boxW) / 2;
    var ty = (view.h - boxH) / 2;
    if (rotate) tx += boxW;
    screen.style.left = view.x + 'px';
    screen.style.top = view.y + 'px';
    screen.style.transformOrigin = '0 0';
    screen.style.transform = 'translate(' + tx + 'px, ' + ty + 'px)' + (rotate ? ' rotate(90deg)' : '') + ' scale(' + scale + ')';
    screen.dataset.scale = String(scale);
    screen.dataset.rotate = rotate ? '1' : '';
    screen.dataset.layout = phone ? 'phone' : 'desk';
    placeDialogs(scale, rotate);
  }

  function placeDialogs(scale, rotate) {
    var open = document.querySelectorAll('dialog[open]');
    for (var i = 0; i < open.length; i++) {
      var dlg = open[i];
      dlg.style.position = 'fixed';
      dlg.style.inset = 'auto';
      dlg.style.left = '50%';
      dlg.style.top = '50%';
      dlg.style.margin = '0';
      dlg.style.transformOrigin = 'center center';
      dlg.style.transform = 'translate(-50%, -50%)' + (rotate ? ' rotate(90deg)' : '') + ' scale(' + scale + ')';
    }
  }

  var lockTried = false;
  function tryLock() {
    var orient = window.screen.orientation;
    if (lockTried || !isPhone() || !orient || !orient.lock) return;
    lockTried = true;
    var lock = orient.lock('landscape');
    if (lock && lock.catch) lock.catch(function () {});
  }

  fit();
  window.dispatchEvent(new Event('screenfit'));
  window.revealCurtain = function (flag) {
    var held = false;
    try { held = sessionStorage.getItem(flag) === '1'; } catch (err) {}
    try { sessionStorage.removeItem(flag); } catch (err) {}
    var curtain = document.getElementById('curtain');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!held || !curtain || reduce) {
      document.documentElement.classList.remove('curtain-hold');
      return;
    }
    var timer;
    function arm() {
      clearTimeout(timer);
      timer = setTimeout(open, 120);
    }
    window.addEventListener('screenfit', arm);
    arm();
    function open() {
      window.removeEventListener('screenfit', arm);
      curtain.className = 'curtain shut';
      document.documentElement.classList.remove('curtain-hold');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          curtain.className = 'curtain opening';
          setTimeout(function () { curtain.className = 'curtain'; }, 780);
        });
      });
    }
  };
  window.addEventListener('resize', function () {
    fit();
    window.dispatchEvent(new Event('screenfit'));
  });
  window.addEventListener('orientationchange', function () {
    setTimeout(function () {
      fit();
      window.dispatchEvent(new Event('screenfit'));
    }, 60);
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      fit();
      window.dispatchEvent(new Event('screenfit'));
    });
  }
  document.addEventListener('pointerdown', tryLock);
  document.addEventListener('toggle', function (ev) {
    if (ev.target && ev.target.nodeName === 'DIALOG') fit();
  }, true);
})();
