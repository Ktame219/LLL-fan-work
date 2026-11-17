(function () {
  var M = 40;
  var IN_MS = 550;
  var OUT_MS = 450;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cv, ctx, cover, blobs, maxD, W, H, progress, job = 0, busy, running;

  function viewport() {
    var vv = window.visualViewport;
    if (!vv) return { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
    return { x: vv.offsetLeft, y: vv.offsetTop, w: vv.width, h: vv.height };
  }

  function lift() {
    ['ink-filter', 'ink-cover', 'ink'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.parentNode !== document.body) document.body.appendChild(el);
    });
  }

  function nodes() {
    lift();
    cv = document.getElementById('ink');
    cover = document.getElementById('ink-cover');
    if (cv && !ctx) ctx = cv.getContext('2d');
    return !!(cv && ctx);
  }

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function fit() {
    var view = viewport();
    W = view.w;
    H = view.h;
    cv.width = Math.max(1, Math.round(W + M * 2));
    cv.height = Math.max(1, Math.round(H + M * 2));
    cv.style.width = cv.width + 'px';
    cv.style.height = cv.height + 'px';
    cv.style.left = (view.x - M) + 'px';
    cv.style.top = (view.y - M) + 'px';
    if (cover) {
      cover.style.left = view.x + 'px';
      cover.style.top = view.y + 'px';
      cover.style.width = W + 'px';
      cover.style.height = H + 'px';
    }
    maxD = Math.hypot(W, H) * 1.05;
    var blur = document.querySelector('#goo feGaussianBlur');
    if (blur) blur.setAttribute('stdDeviation', String(9 * maxD / (Math.hypot(760, 475) * 1.05)));
  }

  function build() {
    blobs = [];
    var i, j;
    for (i = 0; i < 240; i++) {
      var d = Math.pow(Math.random(), 0.85) * maxD * 0.95;
      var a = rnd(-0.15, Math.PI / 2 + 0.15);
      blobs.push({ x: Math.cos(a) * d, y: H - Math.sin(a) * d, r: rnd(0.05, 0.17) * maxD, t0: d / maxD * 0.62 + rnd(0, 0.08), dur: rnd(0.22, 0.42) });
    }
    for (i = 0; i < 8; i++) {
      var ta = rnd(0.05, Math.PI / 2 - 0.05);
      var L = rnd(0.7, 1.05) * maxD;
      for (j = 0; j < 14; j++) {
        var dd = j / 13 * L;
        blobs.push({ x: Math.cos(ta) * dd + rnd(-6, 6), y: H - Math.sin(ta) * dd + rnd(-6, 6), r: rnd(14, 22) * (1 - j / 22), t0: dd / maxD * 0.55, dur: 0.28 });
      }
    }
    for (i = 0; i < 60; i++) {
      var sd = rnd(0.15, 0.9) * maxD;
      var sa = rnd(0, Math.PI / 2);
      blobs.push({ x: Math.cos(sa) * sd, y: H - Math.sin(sa) * sd, r: rnd(9, 22), t0: sd / maxD * 0.62 + 0.04, dur: 0.16 });
    }
  }

  function draw(p) {
    progress = p;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.save();
    ctx.translate(M, M);
    ctx.fillStyle = '#060509';
    for (var i = 0; i < blobs.length; i++) {
      var b = blobs[i];
      if (p <= b.t0) continue;
      var k = Math.min(1, (p - b.t0) / b.dur);
      k = 1 - Math.pow(1 - k, 3);
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * k, 0, 6.2832);
      ctx.fill();
    }
    var q = (p - 0.62) / 0.38;
    if (q > 0) {
      q = Math.min(1, q);
      ctx.beginPath();
      ctx.arc(0, H, maxD * (1 - Math.pow(1 - q, 2)), 0, 6.2832);
      ctx.fill();
    }
    ctx.restore();
  }

  function tween(from, to, ms, ease) {
    var id = ++job;
    return new Promise(function (res) {
      var t0 = performance.now();
      (function frame(now) {
        if (id !== job) { res(false); return; }
        var t = Math.min(1, (now - t0) / ms);
        draw(from + (to - from) * ease(t));
        if (t < 1) requestAnimationFrame(frame);
        else res(true);
      })(t0);
    });
  }

  function easeIn(t) { return t * t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 2); }

  function showCover(on) {
    if (!cover) return;
    cover.style.visibility = on ? 'visible' : '';
    cover.style.pointerEvents = on ? 'auto' : '';
  }

  function block(on) {
    if (cv) cv.style.pointerEvents = on ? 'auto' : '';
  }

  function seal() {
    job += 1;
    fit();
    build();
    draw(1);
    showCover(true);
    block(true);
    document.documentElement.classList.add('ink-hold');
  }

  function clearInk() {
    if (ctx) ctx.clearRect(0, 0, cv.width, cv.height);
    showCover(false);
    block(false);
    document.documentElement.classList.remove('ink-hold');
  }

  window.playInkOut = function (done) {
    if (busy || running) return;
    if (reduce || !nodes()) { done(); return; }
    busy = true;
    fit();
    build();
    block(true);
    var finished = false;
    function go() {
      if (finished) return;
      finished = true;
      window.removeEventListener('screenfit', onFit);
      draw(1);
      showCover(true);
      done();
    }
    function onFit() {
      seal();
      go();
    }
    window.addEventListener('screenfit', onFit);
    tween(0, 1, IN_MS, easeIn).then(function (doneTween) {
      if (doneTween) go();
    });
  };

  window.revealInk = function (flag) {
    var held = false;
    try { held = sessionStorage.getItem(flag) === '1'; } catch (err) {}
    try { sessionStorage.removeItem(flag); } catch (err) {}
    if (!held || reduce || !nodes()) {
      document.documentElement.classList.remove('ink-hold');
      return;
    }
    fit();
    build();
    draw(1);
    block(true);
    showCover(true);
    var timer;
    function arm() {
      if (running) seal();
      running = false;
      clearTimeout(timer);
      timer = setTimeout(open, 120);
    }
    function open() {
      fit();
      build();
      draw(1);
      block(true);
      showCover(false);
      document.documentElement.classList.remove('ink-hold');
      running = true;
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          if (!running) return;
          tween(1, 0, OUT_MS, easeOut).then(function (doneTween) {
            if (!doneTween || !running) return;
            running = false;
            window.removeEventListener('screenfit', arm);
            clearInk();
          });
        });
      });
    }
    window.addEventListener('screenfit', arm);
    arm();
  };
})();
