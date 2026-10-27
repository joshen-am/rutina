/* keystone · cuerpo 3D
   Modelo: "Xbot" de Mixamo (ejemplos de three.js). Cada vértice se asigna a una región muscular
   según el hueso que más lo mueve y hacia dónde mira su normal (frente o espalda).
   La carga de cada región (0..1) llega en data-loads del contenedor .body3d y tiñe la piel de ámbar a rojo. */
(function () {
  'use strict';
  var BASE = (document.currentScript && document.currentScript.src) ? document.currentScript.src.replace(/[^/]*$/, '') : './';
  var S = { three: null, ready: false, loading: false, failed: false, el: null, canvas: null, renderer: null, scene: null, camera: null,
            pivot: null, mixer: null, surface: null, joints: null, regionOf: null, loadsStr: '', dark: null, raf: 0, last: 0,
            visible: true, drag: null, vel: 0, io: null, ro: null, fitH: 2, center: null, statik: !!window.B3_STATIC };

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
      scene.environmentIntensity = 0.9;
      var key = new T.DirectionalLight(0xffffff, 1.6); key.position.set(1.5, 3, 2.5); scene.add(key);
      var rim = new T.DirectionalLight(0xffffff, 1.2); rim.position.set(-2, 2, -2.5); scene.add(rim);
      var camera = new T.PerspectiveCamera(24, 0.6, 0.1, 50);
      S.canvas = canvas; S.renderer = renderer; S.scene = scene; S.camera = camera;
      new m[1].GLTFLoader().load(BASE + 'vendor/three/body.glb', function (g) {
        var model = g.scene;
        var pivot = new T.Group(); pivot.add(model); scene.add(pivot); S.pivot = pivot;
        model.traverse(function (o) {
          if (!o.isSkinnedMesh) return;
          o.frustumCulled = false;
          var surf = /HighLimbs|Surface/i.test((o.material && o.material.name) || '') || /Surface/.test(o.name || '') || (o.parent && /Surface/.test(o.parent.name || ''));
          if (surf && !S.surface) S.surface = o; else S.joints = o;
        });
        if (!S.surface) { S.surface = S.joints; S.joints = null; }
        prepSurface(T);
        pivot.rotation.y = S.yaw0 + (window.B3_YAW || 0);
        if (S.joints) S.joints.material = new T.MeshStandardMaterial({ color: 0xcfcfd4, roughness: 0.38, metalness: 0.0 });
        if (g.animations && g.animations.length) {
          S.mixer = new T.AnimationMixer(model);
          S.mixer.clipAction(g.animations[0]).play();
          S.mixer.update(0.6);
        }
        model.updateMatrixWorld(true);
        var box = new T.Box3().setFromObject(model, true);
        var c = box.getCenter(new T.Vector3());
        model.position.x -= c.x; model.position.z -= c.z;
        S.fitH = box.max.y - box.min.y; S.fitW = Math.max(box.max.x - box.min.x, box.max.z - box.min.z); S.center = new T.Vector3(0, c.y, 0);
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

  /* ----- regiones ----- */
  function prepSurface(T) {
    var mesh = S.surface, geo = mesh.geometry;
    if (geo.attributes.position.isInterleavedBufferAttribute || geo.attributes.position.normalized) {
      // KHR_mesh_quantization: deja posiciones/normales en float para leerlas cómodo
      ['position', 'normal'].forEach(function (k) {
        var a = geo.attributes[k]; if (!a) return;
        var arr = new Float32Array(a.count * 3);
        for (var i = 0; i < a.count; i++) { arr[i * 3] = a.getX(i); arr[i * 3 + 1] = a.getY(i); arr[i * 3 + 2] = a.getZ(i); }
        geo.setAttribute(k, new T.BufferAttribute(arr, 3));
      });
    }
    if (!geo.attributes.normal) geo.computeVertexNormals();
    var n = geo.attributes.position.count;
    geo.setAttribute('color', new T.BufferAttribute(new Float32Array(n * 3), 3));
    mesh.material = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.0 });

    mesh.skeleton.bones.forEach(function (b) { b.updateMatrixWorld(true); });
    var bones = mesh.skeleton.bones, inv = mesh.skeleton.boneInverses;
    var pos = {}, idx = {};
    bones.forEach(function (b, i) {
      var k = b.name.replace(/^mixamorig:?/, '');
      idx[k] = i;
      pos[k] = new T.Vector3().setFromMatrixPosition(inv[i].clone().invert());
    });
    var V = T.Vector3;
    var up = new V().subVectors(pos.Head, pos.Hips).normalize();
    var fwd;
    if (pos.LeftEye && pos.Head) fwd = new V().subVectors(pos.LeftEye, pos.Head);
    else fwd = new V().subVectors(pos.LeftToeBase, pos.LeftFoot);
    fwd.addScaledVector(up, -fwd.dot(up)).normalize();
    var height = pos.Head.distanceTo(pos.Hips);
    var child = { Arm: 'ForeArm', ForeArm: 'Hand', UpLeg: 'Leg', Leg: 'Foot' };
    var bm = mesh.bindMatrix, nm = new T.Matrix3().getNormalMatrix(bm);
    var P = geo.attributes.position, N = geo.attributes.normal, SI = geo.attributes.skinIndex, SW = geo.attributes.skinWeight;
    var keys = bones.map(function (b) { return b.name.replace(/^mixamorig:?/, ''); });
    var region = new Array(n);
    var p = new V(), q = new V(), d = new V(), a = new V();
    for (var i = 0; i < n; i++) {
      var best = 0, bw = -1;
      for (var j = 0; j < 4; j++) { var w = SW.getComponent(i, j); if (w > bw) { bw = w; best = SI.getComponent(i, j); } }
      var full = keys[best] || '';
      var side = /^Left/.test(full) ? 'Left' : /^Right/.test(full) ? 'Right' : '';
      var k = full.replace(/^(Left|Right)/, '');
      p.fromBufferAttribute(P, i).applyMatrix4(bm);
      q.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
      var f = q.dot(fwd);
      var t = 0;
      if (child[k] && pos[full] && pos[side + child[k]]) {
        d.subVectors(pos[side + child[k]], pos[full]);
        a.subVectors(p, pos[full]);
        t = a.dot(d) / d.lengthSq();
      }
      var hy = a.subVectors(p, pos.Hips).dot(up) / height; // altura relativa a la cadera (0 cadera, 1 cabeza)
      var r = null;
      if (k === 'Hips') r = f < -0.15 ? 'glutes' : (f > 0.3 && hy > -0.02 ? 'abs' : null);
      else if (k === 'Spine') r = f > 0.1 ? 'abs' : f < -0.1 ? 'lowback' : null;
      else if (k === 'Spine1') r = f > 0.1 ? 'abs' : f < -0.1 ? (hy > 0.38 ? 'lats' : 'lowback') : 'lats';
      else if (k === 'Spine2') r = f > 0.05 ? (hy > 0.5 ? 'chest' : 'abs') : (hy > 0.72 ? 'traps' : 'lats');
      else if (k === 'Neck') r = f < 0 ? 'traps' : null;
      else if (k === 'Shoulder') r = f > 0.35 ? 'chest' : f < -0.05 ? 'traps' : (q.dot(up) > 0.4 ? 'traps' : 'deltF');
      else if (k === 'Arm') r = t < 0.3 ? (f >= 0 ? 'deltF' : 'deltB') : (f >= 0 ? 'biceps' : 'triceps');
      else if (k === 'ForeArm') r = 'forearm';
      else if (k === 'UpLeg') r = f < -0.05 ? (t < 0.25 ? 'glutes' : 'hams') : 'quads';
      else if (k === 'Leg') r = f < 0.1 ? 'calves' : null;
      region[i] = r;
    }
    S.regionOf = region;
    S.yaw0 = -Math.atan2(fwd.x, fwd.z);
  }

  function tintBase() {
    var T = S.three;
    S.base = new T.Color(S.dark ? '#8E8E96' : '#E9E9EC');
    if (S.joints) S.joints.material.color.set(S.dark ? '#6E6E78' : '#CDCDD3');
  }

  function paint(L) {
    var T = S.three, geo = S.surface.geometry, C = geo.attributes.color, R = S.regionOf;
    var cols = {}, tmp = new T.Color();
    Object.keys(L).forEach(function (k) {
      var v = Math.max(0, Math.min(1, +L[k] || 0));
      if (v < 0.04) return;
      var hue = (42 - 40 * Math.pow(v, 0.8)) / 360;
      var c = new T.Color().setHSL(hue, 0.88, S.dark ? 0.56 : 0.52, T.SRGBColorSpace);
      cols[k] = S.base.clone().lerp(c, Math.min(1, 0.35 + v * 0.75));
    });
    for (var i = 0; i < C.count; i++) {
      var c = (R[i] && cols[R[i]]) || S.base;
      C.setXYZ(i, c.r, c.g, c.b);
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
    if (S.mixer) S.mixer.update(dt);
    draw();
    S.raf = requestAnimationFrame(loop);
  }

  function draw() { if (S.ready && S.el) S.renderer.render(S.scene, S.camera); }

  window.Body3D = { sync: sync, state: S };
})();
