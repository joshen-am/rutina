/* keystone · cuerpo 3D
   Modelo propio: un cuerpo liso hecho con formas suaves; cada vértice trae el número de su músculo.
   La carga de cada región (0..1) llega en data-loads del contenedor .body3d y tiñe la piel de ámbar a rojo. */
(function () {
  'use strict';
  var BASE = (document.currentScript && document.currentScript.src) ? document.currentScript.src.replace(/[^/]*$/, '') : './';
  var S = { three: null, ready: false, loading: false, failed: false, el: null, canvas: null, renderer: null, scene: null, camera: null,
            pivot: null, mixer: null, surface: null, joints: null, regionOf: null, loadsStr: '', dark: null, raf: 0, last: 0,
            visible: true, t: 0, model: null, drag: null, vel: 0, io: null, ro: null, fitH: 2, center: null, statik: !!window.B3_STATIC };

  function luma(el) { return el && el.getClientRects().length && el.offsetWidth > 0 && el.offsetHeight > 0; }

  function pickTarget() {
    var all = Array.prototype.slice.call(document.querySelectorAll('.body3d')).filter(luma);
    if (!all.length) return null;
    for (var i = all.length - 1; i >= 0; i--) {
      var r = all[i].getBoundingClientRect();
      var x = r.left + r.width / 2, y = r.top + r.height / 2;
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
      var hit = document.elementFromPoint(x, y);
      if (hit && all[i].contains(hit)) return all[i];
    }
    return all[all.length - 1];
  }

  function sync() {
    if (S.failed) return;
    var el = pickTarget();
    if (!el) { stop(); return; }
    if (!S.ready) { if (!S.loading) boot(); S.pending = el; return; }
    attach(el);
    var dk = el.getAttribute('data-dark') === '1';
    if (dk !== S.dark) { S.dark = dk; tintBase(); S.loadsStr = null; }
    var ls = el.getAttribute('data-loads') || '{}';
    if (ls !== S.loadsStr) { S.loadsStr = ls; var L = {}; try { L = JSON.parse(ls); } catch (e) {} paint(L); }
    start();
  }

  function attach(el) {
    if (S.el === el && S.canvas.parentNode === el) return;
    if (S.el && S.el !== el) S.el.style.backgroundImage = S.el.__bg || '';
    S.el = el;
    if (el.__bg == null) el.__bg = el.style.backgroundImage;
    el.style.backgroundImage = 'none';
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.appendChild(S.canvas);
    resize();
    if (S.io) { S.io.disconnect(); S.io.observe(el); }
    if (S.ro) { S.ro.disconnect(); S.ro.observe(el); }
  }

  function resize() {
    if (!S.el || !S.renderer) return;
    var w = S.el.clientWidth, h = S.el.clientHeight;
    if (!w || !h) return;
    S.renderer.setSize(w, h, false);
    S.canvas.style.width = w + 'px'; S.canvas.style.height = h + 'px';
    S.camera.aspect = w / h;
    var T = S.three;
    var vfov = T.MathUtils.degToRad(S.camera.fov);
    var needH = S.fitH * 1.06;
    var needW = S.fitW * 1.08;
    var dist = Math.max(needH / (2 * Math.tan(vfov / 2)), needW / (2 * Math.tan(vfov / 2) * S.camera.aspect));
    S.camera.position.set(0, S.center.y + S.fitH * 0.02, dist);
    S.camera.lookAt(0, S.center.y, 0);
    S.camera.updateProjectionMatrix();
    draw();
  }

  function boot() {
    S.loading = true;
    Promise.all([import('three'), import(BASE + 'vendor/three/GLTFLoader.js'), import(BASE + 'vendor/three/RoomEnvironment.js')]).then(function (m) {
      var T = m[0]; S.three = T;
      var canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.cssText = 'position:absolute;left:0;top:0;display:block;touch-action:pan-y;cursor:grab;opacity:0;transition:opacity .5s ease';
      var renderer;
      try { renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, preserveDrawingBuffer: S.statik }); } catch (e) { S.failed = true; return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = T.NeutralToneMapping;
      renderer.toneMappingExposure = 1.0;
      var scene = new T.Scene();
      var pm = new T.PMREMGenerator(renderer);
      scene.environment = pm.fromScene(new m[2].RoomEnvironment(), 0.04).texture;
      scene.environmentIntensity = 0.62;
      var key = new T.DirectionalLight(0xffffff, 2.1); key.position.set(-1.6, 2.6, 2.4); scene.add(key);
      var rim = new T.DirectionalLight(0xffffff, 1.4); rim.position.set(2.2, 1.6, -2.4); scene.add(rim);
      var camera = new T.PerspectiveCamera(24, 0.6, 0.1, 50);
      S.canvas = canvas; S.renderer = renderer; S.scene = scene; S.camera = camera;
      new m[1].GLTFLoader().load(BASE + 'vendor/three/body.glb', function (g) {
        var model = g.scene;
        var pivot = new T.Group(); pivot.add(model); scene.add(pivot); S.pivot = pivot;
        model.traverse(function (o) { if (o.isMesh && !S.surface) S.surface = o; });
        prepSurface(T);
        pivot.rotation.y = (window.B3_YAW || 0);
        model.updateMatrixWorld(true);
        var box = new T.Box3().setFromObject(model);
        var c = box.getCenter(new T.Vector3());
        model.position.x -= c.x; model.position.z -= c.z;
        S.fitH = box.max.y - box.min.y; S.fitW = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
        S.center = new T.Vector3(0, c.y, 0); S.model = model;
        S.io = new IntersectionObserver(function (es) { S.visible = es.some(function (e) { return e.isIntersecting; }); if (S.visible) start(); });
        S.ro = new ResizeObserver(function () { resize(); });
        bindDrag(canvas);
        document.addEventListener('visibilitychange', function () { if (!document.hidden) start(); });
        S.ready = true; S.loading = false;
        sync();
        requestAnimationFrame(function () { canvas.style.opacity = '1'; });
        window.__b3ready = true;
      }, undefined, function () { S.failed = true; });
    }).catch(function () { S.failed = true; });
  }

  /* ----- regiones: vienen en el modelo, un número por vértice ----- */
  var KEYS = ['chest', 'deltF', 'deltB', 'biceps', 'triceps', 'forearm', 'abs', 'lowback', 'traps', 'lats', 'glutes', 'quads', 'hams', 'calves'];
  function prepSurface(T) {
    var geo = S.surface.geometry, n = geo.attributes.position.count;
    if (!geo.attributes.normal) geo.computeVertexNormals();
    geo.setAttribute('color', new T.BufferAttribute(new Float32Array(n * 3), 3));
    S.surface.material = new T.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.38, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.45, sheen: 0.3, sheenRoughness: 0.6 });
    var ra = geo.attributes._region, wa = geo.attributes._w, region = new Array(n), wt = new Float32Array(n);
    for (var i = 0; i < n; i++) { var r = ra ? Math.round(ra.getX(i)) : 0; region[i] = r > 0 ? KEYS[r - 1] : null; wt[i] = wa ? wa.getX(i) / 255 : 1; }
    S.regionOf = region; S.wt = wt;
  }

  function tintBase() {
    var T = S.three;
    S.base = new T.Color(S.dark ? '#A3A3AC' : '#D8D8DE');
  }

  function paint(L) {
    var T = S.three, geo = S.surface.geometry, C = geo.attributes.color, R = S.regionOf;
    var cols = {}, tmp = new T.Color();
    Object.keys(L).forEach(function (k) {
      var v = Math.max(0, Math.min(1, +L[k] || 0));
      if (v < 0.04) return;
      var hue = (42 - 40 * Math.pow(v, 0.8)) / 360;
      var c = new T.Color().setHSL(hue, 0.88, S.dark ? 0.56 : 0.52, T.SRGBColorSpace);
      cols[k] = c; c.amt = Math.min(1, 0.35 + v * 0.75);
    });
    for (var i = 0; i < C.count; i++) {
      var c = R[i] && cols[R[i]];
      if (!c) { C.setXYZ(i, S.base.r, S.base.g, S.base.b); continue; }
      var a = c.amt * S.wt[i];
      tmp.copy(S.base).lerp(c, a);
      C.setXYZ(i, tmp.r, tmp.g, tmp.b);
    }
    C.needsUpdate = true;
    draw();
  }

  /* ----- giro ----- */
  function bindDrag(cv) {
    cv.addEventListener('pointerdown', function (e) { S.drag = { x: e.clientX, t: performance.now() }; S.vel = 0; cv.style.cursor = 'grabbing'; try { cv.setPointerCapture(e.pointerId); } catch (er) {} });
    cv.addEventListener('pointermove', function (e) {
      if (!S.drag) return;
      var now = performance.now(), dx = e.clientX - S.drag.x;
      S.pivot.rotation.y += dx * 0.012;
      S.vel = dx * 0.012 / Math.max(8, now - S.drag.t) * 1000;
      S.drag = { x: e.clientX, t: now };
      start();
    });
    function up() { S.drag = null; cv.style.cursor = 'grab'; }
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  }

  function start() {
    if (S.raf || !S.ready || S.statik) { if (S.statik) draw(); return; }
    S.last = performance.now();
    S.raf = requestAnimationFrame(loop);
  }
  function stop() { if (S.raf) cancelAnimationFrame(S.raf); S.raf = 0; }

  function loop(now) {
    S.raf = 0;
    if (!S.el || !document.body.contains(S.el) || document.hidden || !S.visible) return;
    var dt = Math.min(0.05, (now - S.last) / 1000); S.last = now;
    if (!S.drag) {
      if (Math.abs(S.vel) > 0.05) { S.pivot.rotation.y += S.vel * dt; S.vel *= Math.pow(0.04, dt); }
      else S.pivot.rotation.y += 0.32 * dt;
    }
    S.t = (S.t || 0) + dt;
    var br = 1 + 0.006 * Math.sin(S.t * 1.6);
    S.model.scale.set(br, 1 + 0.002 * Math.sin(S.t * 1.6), br);
    draw();
    S.raf = requestAnimationFrame(loop);
  }

  function draw() { if (S.ready && S.el) S.renderer.render(S.scene, S.camera); }

  window.Body3D = { sync: sync, state: S };
})();
