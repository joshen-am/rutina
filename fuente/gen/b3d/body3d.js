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
    var ek = el.getAttribute('data-ex') || '';
    if (!(window.KS_EX && window.KS_EX[ek])) ek = '';
    if (ek !== (S.exKey || '')) setMode(ek);
    var dk = el.getAttribute('data-dark') === '1';
    if (dk !== S.dark) { S.dark = dk; tintBase(); S.loadsStr = null; }
    var ls = S.exKey ? JSON.stringify(S.ex.def.loads || {}) : (el.getAttribute('data-loads') || '{}');
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
    if (S.exKey) { exCamera(); draw(); return; }
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
      scene.environmentIntensity = 0.7;
      var key = new T.DirectionalLight(0xffffff, 1.9); key.position.set(-1.4, 2.8, 2.4); scene.add(key);
      var rim = new T.DirectionalLight(0xffffff, 1.4); rim.position.set(2.2, 1.8, -2.4); scene.add(rim);
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
        if (S.joints) S.joints.material = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.0 });
        S.model = model; exInit(T);
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
        S.floorY = box.min.y + 0.004; S.restPos = model.position.clone();
        S.io = new IntersectionObserver(function (es) { S.visible = es.some(function (e) { return e.isIntersecting; }); if (S.visible) start(); });
        S.ro = new ResizeObserver(function () { resize(); });
        bindDrag(canvas);
        document.addEventListener('visibilitychange', function () { if (!document.hidden) start(); });
        S.ready = true; S.loading = false;
        sync();
        requestAnimationFrame(function () { canvas.style.opacity = '1'; });
        window.__b3ready = true;
      }, undefined, function (e) { try { console.error('body3d', e && e.message ? e.message : e); } catch (er) {} S.failed = true; });
    }).catch(function () { S.failed = true; });
  }

  /* ----- regiones ----- */
  function prepGeo(T, mesh) {
    var geo = mesh.geometry;
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
    if (!geo.attributes.color) geo.setAttribute('color', new T.BufferAttribute(new Float32Array(geo.attributes.position.count * 3), 3));
  }


  function prepSurface(T) {
    var mesh = S.surface, geo = mesh.geometry;
    prepGeo(T, mesh);
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
    var bm = mesh.bindMatrix, nm = new T.Matrix3().getNormalMatrix(bm);
    var P = geo.attributes.position, N = geo.attributes.normal, SI = geo.attributes.skinIndex, SW = geo.attributes.skinWeight;
    var keys = bones.map(function (b) { return b.name.replace(/^mixamorig:?/, ''); });
    // músculos como manchas suaves: elipsoides anclados a las articulaciones, filtrados por hueso y por hacia dónde mira la piel
    var Z = fwd.z >= 0 ? 1 : -1;
    var RK = ['chest', 'deltF', 'deltB', 'biceps', 'triceps', 'forearm', 'abs', 'lowback', 'traps', 'lats', 'glutes', 'quads', 'hams', 'calves'];
    var RI = {}; RK.forEach(function (k, i) { RI[k] = i; });
    var TORSO = { Hips: 1, Spine: 1, Spine1: 1, Spine2: 1, Neck: 1, Shoulder: 1 }, ARM = { Arm: 1, ForeArm: 1, Shoulder: 1 }, LEG = { UpLeg: 1, Leg: 1, Hips: 1 };
    var E = [];
    function el(r, c, rad, face, bones, side) { E.push({ r: RI[r], c: c, rad: rad, face: face, bones: bones, side: side || 0 }); }
    var sw = Math.abs(pos.LeftArm.x - pos.Hips.x);
    [1, -1].forEach(function (s) {
      var P = function (k) { return pos[(s > 0 ? 'Left' : 'Right') + k]; };
      var A = P('Arm'), FA = P('ForeArm'), HA = P('Hand'), UL = P('UpLeg'), L = P('Leg'), F = P('Foot');
      el('chest', [pos.Hips.x + s * sw * 0.42, pos.Spine2.y + 0.05, pos.Spine2.z], [sw * 0.46, 0.085, 0.4], 'f', TORSO, s);
      el('lats', [pos.Hips.x + s * sw * 0.62, pos.Spine1.y + 0.02, pos.Spine1.z], [sw * 0.32, 0.15, 0.4], 'b', TORSO, s);
      el('deltF', [A.x + s * 0.012, A.y + 0.012, A.z], [0.082, 0.085, 0.4], 'f', ARM, s);
      el('deltB', [A.x + s * 0.012, A.y + 0.012, A.z], [0.082, 0.085, 0.4], 'b', ARM, s);
      var ua = [A.x + (FA.x - A.x) * 0.55, A.y + (FA.y - A.y) * 0.55, A.z], ul = Math.abs(FA.x - A.x);
      el('biceps', ua, [ul * 0.4, 0.055, 0.4], 'f', ARM, s);
      el('triceps', ua, [ul * 0.44, 0.06, 0.4], 'b', ARM, s);
      el('forearm', [FA.x + (HA.x - FA.x) * 0.38, FA.y, FA.z], [Math.abs(HA.x - FA.x) * 0.5, 0.06, 0.4], null, ARM, s);
      el('glutes', [UL.x + s * 0.005, pos.Hips.y - 0.065, pos.Hips.z], [0.1, 0.105, 0.4], 'b', LEG, s);
      var th = [UL.x + (L.x - UL.x) * 0.48, UL.y + (L.y - UL.y) * 0.48, UL.z], tl = Math.abs(UL.y - L.y);
      el('quads', th, [0.09, tl * 0.44, 0.4], 'f', LEG, s);
      el('hams', [th[0], th[1] - tl * 0.03, th[2]], [0.085, tl * 0.4, 0.4], 'b', LEG, s);
      el('calves', [L.x, L.y + (F.y - L.y) * 0.3, L.z], [0.065, Math.abs(L.y - F.y) * 0.27, 0.4], 'b', { Leg: 1 }, s);
    });
    el('abs', [pos.Hips.x, pos.Spine.y + 0.02, pos.Spine.z], [sw * 0.46, 0.15, 0.4], 'f', TORSO, 0);
    el('lowback', [pos.Hips.x, pos.Spine.y - 0.025, pos.Spine.z], [sw * 0.5, 0.11, 0.4], 'b', TORSO, 0);
    el('traps', [pos.Hips.x, pos.Spine2.y + 0.125, pos.Spine2.z], [sw * 0.95, 0.12, 0.4], 'b', TORSO, 0);
    function weigh(mesh, allow) {
      var geo = mesh.geometry, n = geo.attributes.position.count, bm = mesh.bindMatrix, nm = new T.Matrix3().getNormalMatrix(bm);
      var P = geo.attributes.position, N = geo.attributes.normal, SI = geo.attributes.skinIndex, SW = geo.attributes.skinWeight;
    var K = RK.length, W = new Float32Array(n * K);
    var p = new V(), q = new V();
    function sst(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
    for (var i = 0; i < n; i++) {
      var best = 0, bw = -1;
      for (var j = 0; j < 4; j++) { var w = SW.getComponent(i, j); if (w > bw) { bw = w; best = SI.getComponent(i, j); } }
      var full = keys[best] || '', side = /^Left/.test(full) ? 1 : /^Right/.test(full) ? -1 : 0, bk = full.replace(/^(Left|Right)/, '');
      p.fromBufferAttribute(P, i).applyMatrix4(bm);
      q.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
      var nz = q.z * Z, vside = side || ((p.x - pos.Hips.x) >= 0 ? 1 : -1);
      for (var e = 0; e < E.length; e++) {
        var D = E[e];
        if (!D.bones[bk]) continue;
        if (allow && !allow[RK[D.r]]) continue;
        if (D.side && D.side !== vside) continue;
        var dx = (p.x - D.c[0]) / D.rad[0], dy = (p.y - D.c[1]) / D.rad[1], dz = (p.z - D.c[2]) / D.rad[2];
        var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        var wv = 1 - sst(0.5, 1.0, d);
        if (wv <= 0) continue;
        if (D.face === 'f') wv *= sst(-0.25, 0.3, nz); else if (D.face === 'b') wv *= sst(-0.25, 0.3, -nz);
        var o = i * K + D.r; if (wv > W[o]) W[o] = wv;
      }
    }
    // suaviza los bordes sobre la malla (vecinos por triángulo)
    var idx = geo.index ? geo.index.array : null;
    if (idx) {
      var deg = new Uint32Array(n + 1);
      for (var t = 0; t < idx.length; t++) deg[idx[t] + 1] += 2;
      for (var t2 = 0; t2 < n; t2++) deg[t2 + 1] += deg[t2];
      var nb = new Uint32Array(deg[n]), fill = deg.slice(0, n);
      for (var f = 0; f < idx.length; f += 3) {
        var A0 = idx[f], B0 = idx[f + 1], C0 = idx[f + 2];
        nb[fill[A0]++] = B0; nb[fill[A0]++] = C0; nb[fill[B0]++] = A0; nb[fill[B0]++] = C0; nb[fill[C0]++] = A0; nb[fill[C0]++] = B0;
      }
      var tmpW = new Float32Array(n * K);
      for (var it = 0; it < 3; it++) {
        for (var v = 0; v < n; v++) {
          var s0 = deg[v], s1 = deg[v + 1], cnt = s1 - s0;
          for (var k2 = 0; k2 < K; k2++) {
            var acc = W[v * K + k2] * 2;
            for (var u = s0; u < s1; u++) acc += W[nb[u] * K + k2];
            tmpW[v * K + k2] = acc / (cnt + 2);
          }
        }
        W.set(tmpW);
      }
    }
      return W;
    }
    S.rw = weigh(S.surface); S.rk = RK;
    if (S.joints) { prepGeo(T, S.joints); S.jrw = weigh(S.joints, { abs: 1, lowback: 1, deltF: 1, deltB: 1 }); }
    var region = new Array(n);
    S.regionOf = region;
    S.yaw0 = -Math.atan2(fwd.x, fwd.z);
  }

  function tintBase() {
    var T = S.three;
    S.base = new T.Color(S.dark ? '#9A9AA3' : '#E2E2E7');
    S.jbase = new T.Color(S.dark ? '#71717A' : '#C4C4CB');
  }

  function paint(L) {
    var T = S.three, K = S.rk.length, act = [];
    S.rk.forEach(function (k, ri) {
      var v = Math.max(0, Math.min(1, +L[k] || 0));
      if (v < 0.04) return;
      var hue = (40 - 38 * Math.pow(v, 0.8)) / 360;
      var c = new T.Color().setHSL(hue, 0.88, S.dark ? 0.57 : 0.53, T.SRGBColorSpace);
      act.push({ ri: ri, c: c, a: Math.min(1, 0.45 + v * 0.6) });
    });
    var tmp = new T.Color();
    function one(mesh, W, base) {
      if (!mesh || !W) return;
      var C = mesh.geometry.attributes.color;
      for (var i = 0; i < C.count; i++) {
        tmp.copy(base);
        for (var j = 0; j < act.length; j++) {
          var w = W[i * K + act[j].ri];
          if (w > 0.003) tmp.lerp(act[j].c, Math.min(1, w * 1.3) * act[j].a);
        }
        C.setXYZ(i, tmp.r, tmp.g, tmp.b);
      }
      C.needsUpdate = true;
    }
    one(S.surface, S.rw, S.base); one(S.joints, S.jrw, S.jbase || S.base);
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
    if (!S.drag && Math.abs(S.vel) > 0.05) { S.pivot.rotation.y += S.vel * dt; S.vel *= Math.pow(0.04, dt); }
    if (S.exKey) {
      S.ext += dt;
      var Px = sample(S.ex, S.ext);
      setPoseFull(Px);
      follow(Px, dt);
    } else {
      if (!S.drag && Math.abs(S.vel) <= 0.05) S.pivot.rotation.y += 0.32 * dt;
      if (S.mixer) S.mixer.update(dt);
    }
    draw();
    S.raf = requestAnimationFrame(loop);
  }

  function draw() { if (S.ready && S.el) S.renderer.render(S.scene, S.camera); }

  /* ----- ejercicios: poses clave, IK de dos huesos e interpolación ----- */
  var LIMBS = [['lLeg', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'lFoot', 1], ['rLeg', 'RightUpLeg', 'RightLeg', 'RightFoot', 'rFoot', -1],
               ['lArm', 'LeftArm', 'LeftForeArm', 'LeftHand', 'lHand', 1], ['rArm', 'RightArm', 'RightForeArm', 'RightHand', 'rHand', -1]];
  var CTRL = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'RightShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand',
              'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase'];
  var CONTACT = [['LeftToeBase', 0.02], ['RightToeBase', 0.02], ['LeftFoot', 0.08], ['RightFoot', 0.08], ['LeftHand', 0.03], ['RightHand', 0.03],
                 ['LeftForeArm', 0.045], ['RightForeArm', 0.045], ['LeftLeg', 0.06], ['RightLeg', 0.06], ['Head', 0.1], ['Hips', 0.1], ['Spine2', 0.11], ['Spine', 0.1]];
  var FRAMEB = ['HeadTop_End', 'Head', 'LeftHandMiddle4', 'RightHandMiddle4', 'LeftToe_End', 'RightToe_End', 'LeftLeg', 'RightLeg', 'Hips', 'LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm', 'Spine2', 'LeftFoot', 'RightFoot'];
  var _v = [], _q = [];

  function exInit(T) {
    S.B = {};
    S.model.traverse(function (o) { if (o.isBone) S.B[o.name.replace(/^mixamorig:?/, '')] = o; });
    if (!S.B.Hips) return;
    S.hipsRest = S.B.Hips.position.clone();
    S.scale = new T.Vector3(); S.B.Hips.parent.getWorldScale(S.scale); S.scale = S.scale.x / S.model.getWorldScale(new T.Vector3()).x;
    S.d0 = {}; S.len = {};
    LIMBS.forEach(function (L) {
      var up = S.B[L[1]], lo = S.B[L[2]], end = S.B[L[3]];
      S.d0[L[1]] = lo.position.clone().normalize(); S.d0[L[2]] = end.position.clone().normalize();
      S.len[L[1]] = lo.position.length() * S.scale; S.len[L[2]] = end.position.length() * S.scale;
    });
    for (var i = 0; i < 12; i++) { _v.push(new T.Vector3()); _q.push(new T.Quaternion()); }
    S.qModelInv = new T.Quaternion();
  }

  function mPos(b, out) { b.getWorldPosition(out); return S.model.worldToLocal(out); }
  function mQuat(b, out) { b.getWorldQuaternion(out); S.model.getWorldQuaternion(S.qModelInv).invert(); return out.premultiply(S.qModelInv); }
  function eul(a, out, k) { var T = S.three, d = Math.PI / 180; k = k || 1; return out.setFromEuler(new T.Euler(a[0] * d * k, a[1] * d * k, a[2] * d * k, 'YXZ')); }

  // resuelve la pose completa sobre el esqueleto
  function solve(P) {
    var T = S.three, B = S.B; if (!B || !B.Hips) return;
    CTRL.forEach(function (n) { if (B[n]) B[n].quaternion.identity(); });
    eul(P.hips.r, B.Hips.quaternion);
    var hp = P.hips.p || [0, 0.5, 0];
    var target = _v[0].set(hp[0], S.floorY + hp[1], hp[2]);
    B.Hips.position.copy(B.Hips.parent.worldToLocal(S.model.localToWorld(target.clone())));
    var sp = [P.spine[0] / 3, P.spine[1] / 3, P.spine[2] / 3];
    ['Spine', 'Spine1', 'Spine2'].forEach(function (n) { eul(sp, B[n].quaternion); });
    if (P.neck) { eul(P.neck, B.Neck.quaternion); eul(P.head, B.Head.quaternion); }
    else { var hd = [P.head[0] / 2, P.head[1] / 2, P.head[2] / 2]; eul(hd, B.Neck.quaternion); eul(hd, B.Head.quaternion); }
    eul(P.sh, B.LeftShoulder.quaternion); eul([P.sh[0], -P.sh[1], -P.sh[2]], B.RightShoulder.quaternion);
    S.model.updateMatrixWorld(true);
    var Fq = mQuat(B.Hips, _q[0]).clone(), FqI = Fq.clone().invert();
    LIMBS.forEach(function (L) {
      var spec = P[L[0]]; if (!spec) return;
      var up = B[L[1]], lo = B[L[2]], end = B[L[3]], side = L[5];
      var F = spec.w ? new T.Quaternion() : Fq, FI = spec.w ? new T.Quaternion() : FqI;
      var u1, u2;
      if (spec.ik) {
        var R = mPos(up, new T.Vector3()), Tg = new T.Vector3(spec.ik[0], S.floorY + spec.ik[1], spec.ik[2]);
        var a = S.len[L[1]], b = S.len[L[2]];
        var D = new T.Vector3().subVectors(Tg, R), d = Math.min(Math.max(D.length(), Math.abs(a - b) + 1e-3), a + b - 1e-3);
        var u = D.normalize();
        var x = (a * a - b * b + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a * a - x * x));
        var pole = new T.Vector3(spec.pole[0], spec.pole[1], spec.pole[2]).normalize();
        var w = pole.addScaledVector(u, -pole.dot(u)); if (w.lengthSq() < 1e-6) w.set(0, 0, 1); w.normalize();
        var K = R.clone().addScaledVector(u, x).addScaledVector(w, h), E = R.clone().addScaledVector(u, d);
        u1 = K.clone().sub(R).normalize(); u2 = E.sub(K).normalize();
      } else {
        u1 = new T.Vector3(spec.a[0], spec.a[1], spec.a[2]).normalize().applyQuaternion(F);
        u2 = new T.Vector3(spec.b[0], spec.b[1], spec.b[2]).normalize().applyQuaternion(F);
      }
      var q1 = F.clone().multiply(new T.Quaternion().setFromUnitVectors(S.d0[L[1]], u1.clone().applyQuaternion(FI)));
      var q2 = F.clone().multiply(new T.Quaternion().setFromUnitVectors(S.d0[L[2]], u2.clone().applyQuaternion(FI)));
      if (spec.tw) q2.premultiply(new T.Quaternion().setFromAxisAngle(u2, spec.tw * side * Math.PI / 180));
      var pq = mQuat(up.parent, new T.Quaternion());
      up.quaternion.copy(pq.invert().multiply(q1));
      lo.quaternion.copy(q1.clone().invert().multiply(q2));
      var e = P[L[4]], q3 = null;
      if (L[0].indexOf('Leg') > 0) {
        if (e === 'flat') q3 = new T.Quaternion();
        else if (typeof e === 'number') q3 = eul([e, 0, 0], new T.Quaternion());
      } else if (e === 'flat') q3 = eul([0, -90 * side, 0], new T.Quaternion());
      if (q3) end.quaternion.copy(q2.clone().invert().multiply(q3));
    });
    S.model.updateMatrixWorld(true);
  }

  // partes que deben quedar apoyadas en el suelo en una pose (P.touch); altura de la articulación cuando apoya
  var TOUCH = { toes: [['LeftToeBase', 0.02], ['RightToeBase', 0.02]], knees: [['LeftLeg', 0.065], ['RightLeg', 0.065]],
    hands: [['LeftHand', 0.035], ['RightHand', 0.035]], forearms: [['LeftForeArm', 0.05], ['RightForeArm', 0.05], ['LeftHand', 0.035], ['RightHand', 0.035]],
    hips: [['Hips', 0.11]], back: [['Spine2', 0.13]], chest: [['Spine2', 0.08]], head: [['Head', 0.1]] };
  var ARMB = { LeftForeArm: 'lArm', LeftHand: 'lArm', RightForeArm: 'rArm', RightHand: 'rArm' };
  function touchList(P) {
    if (!P.touch) return [];
    var out = [], seen = {};
    P.touch.forEach(function (t) {
      var m = String(t).split(':'), L = TOUCH[m[0]];
      if (!L) { var c0 = CONTACT.filter(function (c) { return c[0] === m[0]; })[0]; L = [[m[0], m[1] != null ? +m[1] : (c0 ? c0[1] : 0.05)]]; }
      L.forEach(function (c) { if (!seen[c[0]]) { seen[c[0]] = 1; out.push(c); } });
    });
    return out;
  }
  function touches(P, n) { return touchList(P).some(function (c) { return c[0] === n; }); }
  // un brazo libre (sin IK y sin apoyo declarado) no levanta el cuerpo si roza el suelo: se dobla él
  function freeArm(P, n) { var k = ARMB[n]; return k && P && P[k] && !P[k].ik && !touches(P, n); }
  // la mano o el pie con IK está donde se pidió: si roza el suelo no debe levantar todo el cuerpo
  var IKEND = { LeftFoot: 'lLeg', LeftToeBase: 'lLeg', RightFoot: 'rLeg', RightToeBase: 'rLeg', LeftHand: 'lArm', RightHand: 'rArm' };
  function ikEnd(P, n) { var k = IKEND[n]; return k && P && P[k] && P[k].ik; }
  function lowest(P, noIk) {
    var T = S.three, lo = Infinity, p = new T.Vector3();
    CONTACT.forEach(function (c) { if (S.B[c[0]] && !freeArm(P, c[0]) && !(noIk && ikEnd(P, c[0]))) { mPos(S.B[c[0]], p); lo = Math.min(lo, p.y - c[1]); } });
    return lo - (S.floorY + (S.matTop || 0));
  }
  // errores de una pose: apoyos que no tocan, manos o pies que no llegan a su punto, partes que atraviesan el suelo
  function poseRes(P, iks) {
    var T = S.three, p = new T.Vector3(), out = [], fl = S.floorY + (S.matTop || 0);
    solve(P);
    var base = P.ground ? lowest(P) : 0;
    touchList(P).forEach(function (c) { if (S.B[c[0]]) { mPos(S.B[c[0]], p); out.push((p.y - fl - base - c[1]) * 2); } });
    iks.forEach(function (L) { var t = P[L[0]].ik; mPos(S.B[L[3]], p); out.push(p.x - t[0], (p.y - S.floorY - t[1]) * 1.5, p.z - t[2]); });
    if (!P.ground) CONTACT.forEach(function (c) { if (S.B[c[0]] && !freeArm(P, c[0]) && !ikEnd(P, c[0])) { mPos(S.B[c[0]], p); var h = p.y - fl - c[1]; out.push(h < 0 ? h * 3 : 0); } });
    var pr = (S.ex && S.ex.def.props) || {};
    if (!P.ground && !pr.wall && !pr.door && !touchList(P).length) out.push(Math.max(0, unbalance(fl) - 0.02) * 3);
    return out;
  }
  // de pie: el centro de masa debe caer sobre los pies que apoyan (si no, el cuerpo se ve a punto de caerse)
  var MASS = [['Hips', 3], ['Spine', 2], ['Spine2', 3], ['Head', 1], ['LeftUpLeg', 1], ['RightUpLeg', 1], ['LeftLeg', 1.5], ['RightLeg', 1.5], ['LeftFoot', 0.5], ['RightFoot', 0.5],
              ['LeftArm', 0.5], ['RightArm', 0.5], ['LeftForeArm', 0.4], ['RightForeArm', 0.4], ['LeftHand', 0.2], ['RightHand', 0.2]];
  var SUPB = [['LeftToeBase', 0.02], ['RightToeBase', 0.02], ['LeftFoot', 0.11], ['RightFoot', 0.11], ['LeftToe_End', 0.01], ['RightToe_End', 0.01], ['LeftHand', 0.035], ['RightHand', 0.035],
              ['LeftForeArm', 0.05], ['RightForeArm', 0.05], ['LeftLeg', 0.065], ['RightLeg', 0.065], ['Hips', 0.11], ['Spine2', 0.13], ['Head', 0.1]];
  function unbalance(fl) {
    var T = S.three, p = new T.Vector3(), pts = [], cm = [0, 0], w = 0;
    SUPB.forEach(function (c) { var b = S.B[c[0]]; if (!b) return; mPos(b, p); if (p.y - fl - c[1] < 0.03) pts.push([p.x, p.z]); });
    MASS.forEach(function (c) { var b = S.B[c[0]]; if (!b) return; mPos(b, p); cm[0] += p.x * c[1]; cm[1] += p.z * c[1]; w += c[1]; });
    if (!pts.length) return 0;
    cm = [cm[0] / w, cm[1] / w];
    pts.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    var cr = function (o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }, lo = [], up = [];
    pts.forEach(function (q) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); });
    pts.slice().reverse().forEach(function (q) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); });
    var H = pts.length < 3 ? pts : lo.slice(0, -1).concat(up.slice(0, -1));
    var seg = function (a, b) { var dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((cm[0] - a[0]) * dx + (cm[1] - a[1]) * dz) / L)); return Math.hypot(cm[0] - a[0] - t * dx, cm[1] - a[1] - t * dz); };
    if (H.length === 1) return seg(H[0], H[0]);
    if (H.length === 2) return seg(H[0], H[1]);
    var inside = true, d = 9;
    for (var i = 0; i < H.length; i++) { var a = H[i], b = H[(i + 1) % H.length]; if ((b[0] - a[0]) * (cm[1] - a[1]) - (b[1] - a[1]) * (cm[0] - a[0]) < 0) inside = false; d = Math.min(d, seg(a, b)); }
    return inside ? 0 : d;
  }
  // Levenberg-Marquardt sobre la cadera (posición y dos giros) para que la pose se sostenga en sus apoyos
  function fitHips(P0) {
    var P = JSON.parse(JSON.stringify(P0)); delete P._seg;
    if (!P.hips.p) { P.hips.p = [0, 0.5, 0]; P.ground = 1; }
    var p0 = P.hips.p.slice(), r0 = P.hips.r.slice();
    var iks = LIMBS.filter(function (L) { return P[L[0]] && P[L[0]].ik; });
    var np = P.ground ? [0, 2, 3, 4] : [0, 1, 2, 3, 4], eps = [0.004, 0.004, 0.004, 0.6, 0.6], reg = [0.25, 0.25, 0.25, 0.004, 0.004];
    var x = [0, 0, 0, 0, 0], lam = 0.01;
    function at(x) { P.hips.p = [p0[0] + x[0], p0[1] + x[1], p0[2] + x[2]]; P.hips.r = [r0[0] + x[3], r0[1], r0[2] + x[4]]; var v = poseRes(P, iks); np.forEach(function (i) { v.push(x[i] * reg[i]); }); return v; }
    function sq(v) { return v.reduce(function (a, b) { return a + b * b; }, 0); }
    var f = at(x), E = sq(f);
    if (!touchList(P).length && !iks.length) return [0, 0, 0, 0, 0];
    for (var it = 0; it < 8; it++) {
      var J = np.map(function (i) { var y = x.slice(); y[i] += eps[i]; var g = at(y); return g.map(function (gv, k) { return (gv - f[k]) / eps[i]; }); });
      var m = np.length, A = [], b = [];
      for (var a = 0; a < m; a++) { A.push([]); b.push(-J[a].reduce(function (s2, v, k) { return s2 + v * f[k]; }, 0)); for (var c = 0; c < m; c++) A[a].push(J[a].reduce(function (s2, v, k) { return s2 + v * J[c][k]; }, 0)); }
      var ok = false;
      for (var tries = 0; tries < 4 && !ok; tries++) {
        var M = A.map(function (row, i) { return row.map(function (v, j) { return v + (i === j ? lam * (A[i][i] + 1e-6) : 0); }); }), d = gauss(M, b.slice());
        var y = x.slice(); np.forEach(function (i, k) { y[i] += d[k]; });
        var g2 = at(y), E2 = sq(g2);
        if (E2 < E) { x = y; f = g2; E = E2; lam = Math.max(1e-4, lam * 0.3); ok = true; } else lam *= 8;
      }
      if (!ok || E < 1e-6) break;
    }
    return x;
  }
  function gauss(M, b) {
    var n = b.length;
    for (var i = 0; i < n; i++) {
      var mx = i; for (var k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[mx][i])) mx = k;
      var t = M[i]; M[i] = M[mx]; M[mx] = t; var tb = b[i]; b[i] = b[mx]; b[mx] = tb;
      if (Math.abs(M[i][i]) < 1e-12) continue;
      for (var k2 = i + 1; k2 < n; k2++) { var q = M[k2][i] / M[i][i]; for (var j = i; j < n; j++) M[k2][j] -= q * M[i][j]; b[k2] -= q * b[i]; }
    }
    var xs = new Array(n).fill(0);
    for (var i2 = n - 1; i2 >= 0; i2--) { var sm = b[i2]; for (var j2 = i2 + 1; j2 < n; j2++) sm -= M[i2][j2] * xs[j2]; xs[i2] = Math.abs(M[i2][i2]) < 1e-12 ? 0 : sm / M[i2][i2]; }
    return xs;
  }
  // tabla de ajustes a lo largo de cada tramo de la animación (se calcula una vez por ejercicio)
  var FITF = [0, 0.25, 0.5, 0.75, 1];
  // huella de un ejercicio: si cambia su definición, el ajuste precalculado (exfit.js) deja de valer
  function exHash(def) {
    var str = JSON.stringify([def.keys, def.loop, def.smooth, def.props || null]), h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36);
  }
  function buildFit(ex, key) {
    var bk = key && window.KS_FIT && window.KS_FIT[key];
    if (bk && bk.h === exHash(ex.def)) return bk.f;
    S.fitCache = S.fitCache || {};
    if (key && S.fitCache[key] && S.fitCache[key].h === exHash(ex.def)) return S.fitCache[key].f;
    var f0 = buildFit0(ex);
    if (key) S.fitCache[key] = { h: exHash(ex.def), f: f0 };
    return f0;
  }
  function buildFit0(ex) {
    var K = ex.keys, n = K.length, def = ex.def, segs = [];
    if (def.loop === 'hold' || n === 1) segs.push([0, 0]);
    else if (def.loop === 'cycle') { if (def.smooth) return {}; for (var i = 0; i < n; i++) segs.push([i, (i + 1) % n]); }
    else for (var j = 0; j < n - 1; j++) segs.push([j, j + 1]);
    var fit = {};
    segs.forEach(function (sg, si) {
      var any = K[sg[0]].touch || K[sg[1]].touch || (K[sg[0]].hips.p && K[sg[1]].hips.p); if (!any) return;
      fit[si] = FITF.map(function (f) { return fitHips(mix(K[sg[0]], K[sg[1]], f, ex.dirs[sg[0]], ex.dirs[sg[1]])); });
    });
    return fit;
  }
  function applyFit(P) {
    var tb = P._seg != null && S.ex && S.ex.fit && S.ex.fit[P._seg]; if (!tb) return false;
    var x = Math.min(1, Math.max(0, P._f || 0)) * (tb.length - 1), i0 = Math.min(tb.length - 2, Math.floor(x)), u = x - i0, a = tb[i0], b = tb[i0 + 1];
    var c = a.map(function (v, i) { return v + (b[i] - v) * u; });
    P.hips.p = [P.hips.p[0] + c[0], P.hips.p[1] + c[1], P.hips.p[2] + c[2]]; P.hips.r = [P.hips.r[0] + c[3], P.hips.r[1], P.hips.r[2] + c[4]];
    return true;
  }
  // brazos libres que atraviesan el suelo, o manos que deben apoyar: el brazo se dobla hasta el suelo
  function clampArms(P) {
    var T = S.three, fl = S.floorY + (S.matTop || 0), ch = false;
    LIMBS.forEach(function (L) {
      var sp = P[L[0]]; if (!sp || sp.ik || L[0].indexOf('Arm') < 0) return;
      var sh = mPos(S.B[L[1]], new T.Vector3()), el = mPos(S.B[L[2]], new T.Vector3()), hd = mPos(S.B[L[3]], new T.Vector3());
      var tH = touches(P, L[3]), pen = Math.max(fl + 0.035 - hd.y, fl + 0.05 - el.y);
      if (!(pen > 0.004 || (tH && Math.abs(hd.y - fl - 0.035) > 0.008))) return;
      var ty = tH ? fl + 0.035 : Math.max(hd.y, fl + 0.035);
      var line = hd.clone().sub(sh).normalize(), pole = el.clone().sub(sh); pole.addScaledVector(line, -pole.dot(line));
      if (touches(P, L[2])) pole.y -= 0.3; else if (el.y < fl + 0.046) pole.y += 0.3;
      if (pole.lengthSq() < 1e-6) pole.set(0, 1, 0);
      P[L[0]] = { ik: [hd.x, ty - S.floorY, hd.z], pole: [pole.x, pole.y, pole.z] }; ch = true;
    });
    if (ch) solve(P);
  }
  // la cadera se acomoda para que manos y pies lleguen a su apoyo, y el cuerpo queda siempre tocando el suelo
  function setPose(P0) {
    var T = S.three, P = JSON.parse(JSON.stringify(P0)), p = new T.Vector3();
    if (!P.hips.p) { P.hips.p = [0, 0.5, 0]; P.ground = 1; }
    var fitted = applyFit(P);
    var iks = LIMBS.filter(function (L) { return P[L[0]] && P[L[0]].ik; });
    for (var it = 0; it < 7; it++) {
      solve(P);
      var c = [0, 0, 0], n = 0;
      iks.forEach(function (L) {
        var t = P[L[0]].ik; mPos(S.B[L[3]], p);
        var e = [t[0] - p.x, S.floorY + t[1] - p.y, t[2] - p.z];
        if (!fitted && Math.abs(e[0]) + Math.abs(e[1]) + Math.abs(e[2]) > 0.006) { c[0] += e[0]; c[1] += e[1]; c[2] += e[2]; }
        n++;
      });
      var g = lowest(P, 1), up = g < -0.002 ? -g : 0;
      if (!up && !(Math.abs(c[0]) + Math.abs(c[1]) + Math.abs(c[2]))) break;
      if (n) P.hips.p = [P.hips.p[0] + c[0] / n * 0.85, P.hips.p[1] + c[1] / n * 0.85, P.hips.p[2] + c[2] / n * 0.85];
      P.hips.p[1] += up;
    }
    solve(P);
    var g2 = lowest(P);
    if (g2 < 0) g2 = Math.min(0, lowest(P, 1));
    if (Math.abs(g2) > 0.001) {   // si nada toca el suelo, baja todo (incluidos los apoyos) hasta tocarlo
      P.hips.p[1] -= g2;
      if (g2 > 0) iks.forEach(function (L) { P[L[0]].ik[1] -= g2; });
      solve(P);
    }
    clampArms(P);
  }

  function setPoseFull(P) { setPose(P); syncProps(); }
  // la cabeza, los hombros y los brazos libres siguen al cuerpo con un leve retraso: el movimiento se siente menos mecánico
  function follow(P, dt) {
    var B = S.B, a = 1 - Math.exp(-dt / 0.11);
    var list = ['Neck', 'Head', 'LeftShoulder', 'RightShoulder', 'Spine2'];
    LIMBS.forEach(function (L) { if (P[L[0]] && !P[L[0]].ik && L[0].indexOf('Arm') > 0) list.push(L[1], L[2], L[3]); });
    S.lag = S.lag || {};
    list.forEach(function (n) {
      var b = B[n]; if (!b) return;
      var prev = S.lag[n];
      if (prev && S.lagKey === S.exKey) { prev.slerp(b.quaternion, a); b.quaternion.copy(prev); }
      else S.lag[n] = b.quaternion.clone();
    });
    S.lagKey = S.exKey;
    S.model.updateMatrixWorld(true); syncProps();
  }
  // de una pose con IK a direcciones (para mezclar poses con tipos distintos)
  function toDirs(P) {
    setPose(P);
    var T = S.three, B = S.B, out = {};
    var FqI = mQuat(B.Hips, new T.Quaternion()).invert();
    LIMBS.forEach(function (L) {
      var a = mPos(B[L[2]], new T.Vector3()).sub(mPos(B[L[1]], new T.Vector3())).normalize().applyQuaternion(FqI);
      var b = mPos(B[L[3]], new T.Vector3()).sub(mPos(B[L[2]], new T.Vector3())).normalize().applyQuaternion(FqI);
      out[L[0]] = { a: [a.x, a.y, a.z], b: [b.x, b.y, b.z] };
    });
    return out;
  }

  function lerpV(a, b, f) { return a.map(function (x, i) { return x + (b[i] - x) * f; }); }
  function mix(A, Bk, f, dA, dB) {
    var o = { hips: { r: lerpV(A.hips.r, Bk.hips.r, f) }, spine: lerpV(A.spine, Bk.spine, f), head: lerpV(A.head, Bk.head, f), sh: lerpV(A.sh, Bk.sh, f), ground: A.ground || Bk.ground };
    if (A.neck || Bk.neck) o.neck = lerpV(A.neck || [0, 0, 0], Bk.neck || [0, 0, 0], f);
    if (A.touch && Bk.touch) { var tb = touchList(Bk).map(function (c) { return c[0]; }); o.touch = touchList(A).filter(function (c) { return tb.indexOf(c[0]) >= 0; }).map(function (c) { return c[0] + ':' + c[1]; }); }
    if (A.hips.p && Bk.hips.p) o.hips.p = lerpV(A.hips.p, Bk.hips.p, f);
    LIMBS.forEach(function (L) {
      var a = A[L[0]], b = Bk[L[0]];
      if (a.ik && b.ik) o[L[0]] = { ik: lerpV(a.ik, b.ik, f), pole: lerpV(a.pole, b.pole, f) };
      else if (a.a && b.a && !!a.w === !!b.w) o[L[0]] = { a: lerpV(a.a, b.a, f), b: lerpV(a.b, b.b, f), w: a.w };
      else { var x = dA[L[0]], y = dB[L[0]]; o[L[0]] = { a: lerpV(x.a, y.a, f), b: lerpV(x.b, y.b, f) }; }
      var ea = A[L[4]], eb = Bk[L[4]];
      o[L[4]] = (typeof ea === 'number' && typeof eb === 'number') ? ea + (eb - ea) * f : (typeof ea === 'number' && eb === 'flat') ? ea * (1 - f) : (ea === 'flat' && typeof eb === 'number') ? eb * f : (f < 0.5 ? ea : eb);
    });
    return o;
  }
  function ease(u) { var t = Math.min(1, Math.max(0, (u - 0.14) / 0.72)); return t * t * (3 - 2 * t); }
  function breathe(P, t) { P.spine = [P.spine[0] + 1.2 * Math.sin(t * 2.2), P.spine[1], P.spine[2]]; P.sh = [P.sh[0], P.sh[1], P.sh[2] + 1.5 * Math.sin(t * 2.2)]; return P; }
  function sample(ex, t) { var P = sample0(ex, t); if (ex.def.loop !== 'hold') breathe(P, t); placeProps(P); return P; }
  function loopLen(def, n) { var T = def.t || 1, dw = def.dwell || [0, 0]; return def.loop === 'hold' ? 4 : def.loop === 'cycle' ? T * n : (T * 2 + dw[0] + dw[1]) * (n - 1); }
  function sample0(ex, t) {
    var K = ex.keys, n = K.length, T = ex.def.t || 1;
    if (ex.def.loop === 'hold' || n === 1) {
      var P0 = JSON.parse(JSON.stringify(K[0])); P0._seg = 0; P0._f = 0; P0.spine = [P0.spine[0] + 1.6 * Math.sin(t * 2.1), P0.spine[1], P0.spine[2]]; P0.sh = [P0.sh[0], P0.sh[1], P0.sh[2] + 2 * Math.sin(t * 2.1)]; return P0;
    }
    var u = t / T, i, j, f;
    if (ex.def.loop === 'cycle') {
      u = u % n; i = Math.floor(u); j = (i + 1) % n; f = u - i;
      if (!ex.def.smooth) { var oc = mix(K[i], K[j], ease(f), ex.dirs[i], ex.dirs[j]); oc._seg = i; oc._f = ease(f); return oc; }
      if (ex.def.smooth) {   // movimiento continuo (círculos): curva suave entre las cuatro poses vecinas
        var h = (i + n - 1) % n, k2 = (j + 1) % n;
        var a = mix(K[h], K[i], 0.5 + 0.5 * f, ex.dirs[h], ex.dirs[i]), b = mix(K[j], K[k2], 0.5 * f, ex.dirs[j], ex.dirs[k2]);
        return mix(a, b, f * f * (3 - 2 * f), ex.dirs[i], ex.dirs[j]);
      }
      f = ease(f);
    }
    else {
      // ida y vuelta: la ida (bajar) un poco más lenta que la vuelta
      var tp = ex.def.tempo || [1.12, 0.88], dw = ex.def.dwell || [0, 0], seg = T * (tp[0] + tp[1]) + dw[0] + dw[1];
      var w2 = t % (seg * (n - 1)), si = Math.floor(w2 / seg), r2 = w2 - si * seg;
      if (r2 < dw[0]) { i = si; j = si + 1; f = 0; }
      else if ((r2 -= dw[0]) < T * tp[0]) { i = si; j = si + 1; f = ease(r2 / (T * tp[0])); }
      else if ((r2 -= T * tp[0]) < dw[1]) { i = si; j = si + 1; f = 1; }
      else { r2 -= dw[1]; i = si + 1; j = si; f = ease(r2 / (T * tp[1])); }
    }
    var o2 = mix(K[i], K[j], f, ex.dirs[i], ex.dirs[j]);
    if (i < j) { o2._seg = i; o2._f = f; } else { o2._seg = j; o2._f = 1 - f; }
    return o2;
  }


  /* ----- utilería del ejercicio ----- */
  function mat3(T, c, o) { return new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0 }, o || {})); }
  function dumbbell(T) {
    var g = new T.Group();
    var steel = mat3(T, 0xc9cbd1, { metalness: 0.85, roughness: 0.28 }), rub = mat3(T, 0x2b2c31, { roughness: 0.55 });
    var handle = new T.Mesh(new T.CylinderGeometry(0.0145, 0.0145, 0.135, 20), steel); handle.rotation.x = Math.PI / 2; g.add(handle);
    [-1, 1].forEach(function (s) {
      var head = new T.Mesh(new T.CylinderGeometry(0.043, 0.043, 0.05, 6), rub); head.rotation.x = Math.PI / 2; head.position.z = s * 0.087; g.add(head);
      var cap = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 0.054, 16), steel); cap.rotation.x = Math.PI / 2; cap.position.z = s * 0.087; g.add(cap);
    });
    g.traverse(function (o) { o.castShadow = false; });
    return g;
  }
  function ensureProps() {
    var T = S.three;
    if (S.props) return S.props;
    var P = S.props = {};
    P.dbL = dumbbell(T); P.dbR = dumbbell(T); P.dbC = dumbbell(T);
    S.model.add(P.dbL); S.model.add(P.dbR); S.model.add(P.dbC);
    P.wallMat = mat3(T, 0xf2f2f4, { roughness: 0.95, emissive: 0x202024 });
    P.wall = new T.Mesh(new T.BoxGeometry(1.5, 2.15, 0.05), P.wallMat); S.model.add(P.wall);
    P.door = new T.Group();
    P.doorMat = mat3(T, 0xd9d9de, { roughness: 0.7 });
    [-1, 1].forEach(function (s) { var post = new T.Mesh(new T.BoxGeometry(0.07, 2.1, 0.12), P.doorMat); post.position.set(s * 0.5, 1.05, 0); post.name = s < 0 ? 'R' : 'L'; P.door.add(post); });
    var head = new T.Mesh(new T.BoxGeometry(1.07, 0.07, 0.12), P.doorMat); head.position.y = 2.1; P.door.add(head);
    S.model.add(P.door);
    P.matMat = mat3(T, 0xd5d8dc, { roughness: 0.95 });
    P.mat = new T.Mesh(new T.BoxGeometry(1, 0.008, 1), P.matMat); S.model.add(P.mat);
    hideProps();
    return P;
  }
  function hideProps() { var P = S.props; if (!P) return; [P.dbL, P.dbR, P.dbC, P.wall, P.door, P.mat].forEach(function (o) { o.visible = false; }); }
  function setupProps(def, foot) {
    var T = S.three, P = ensureProps(); hideProps();
    var pr = def.props || {};
    var dk = S.dark;
    P.wallMat.color.set(dk ? '#3a3a40' : '#f0f0f2'); P.wallMat.emissive.set(dk ? '#1c1c20' : '#7c7c82'); P.doorMat.color.set(dk ? '#45454c' : '#d6d6db'); P.matMat.color.set(dk ? '#3a3e44' : '#cfd5da');
    S.dbMode = pr.db || null;
    if (pr.db === 'both') { P.dbL.visible = P.dbR.visible = true; }
    if (pr.db === 'center') P.dbC.visible = true;
    if (pr.wall) { P.wall.visible = true; P.wall.position.set(pr.wall.x || 0, S.floorY + 1.075, pr.wall.z + (pr.wall.z > 0 ? 0.025 : -0.025)); }
    if (pr.door) {
      P.door.visible = true; P.door.position.set(0, S.floorY, pr.door.z);
      P.door.children.forEach(function (c) { if (c.name) c.position.x = (c.name === 'L' ? 1 : -1) * pr.door.x; else c.scale.x = (pr.door.x * 2 + 0.07) / 1.07; });
    }
    var floorish = def.mat != null ? !!def.mat : S.exHigh < 0.72;
    if (floorish) {
      var c = foot.getCenter(new T.Vector3()), z = foot.getSize(new T.Vector3());
      P.mat.visible = true; P.mat.position.set(c.x, S.floorY + 0.004, c.z);
      P.mat.scale.set(Math.min(2.0, Math.max(0.62, z.x + 0.3)), 1, Math.min(2.0, Math.max(0.62, z.z + 0.34)));
    }
    S.matTop = floorish ? 0.008 : 0;
  }
  // coloca las mancuernas en las manos (en cada cuadro, después de la pose)
  function placeProps() { S.wantProps = true; }
  function gripPoint(side, out) {
    var T = S.three, B = S.B, h = B[side > 0 ? 'LeftHand' : 'RightHand'];
    return S.model.worldToLocal(h.localToWorld(out.set(side * 0.075 / S.scale, -0.018 / S.scale, 0)));
  }
  function syncProps() {
    var P = S.props; if (!P || !S.dbMode) return;
    var T = S.three, B = S.B, q = new T.Quaternion(), mq = S.model.getWorldQuaternion(new T.Quaternion()).invert();
    if (S.dbMode === 'both') {
      [[P.dbL, 1, 'LeftHand'], [P.dbR, -1, 'RightHand']].forEach(function (a) {
        gripPoint(a[1], a[0].position);
        B[a[2]].getWorldQuaternion(q); a[0].quaternion.copy(q.premultiply(mq));
      });
    } else if (S.dbMode === 'center') {
      var l = gripPoint(1, new T.Vector3()), rr = gripPoint(-1, new T.Vector3());
      P.dbC.position.copy(l).add(rr).multiplyScalar(0.5);
      var el = mPos(B.LeftForeArm, new T.Vector3()).add(mPos(B.RightForeArm, new T.Vector3())).multiplyScalar(0.5);
      var dir = P.dbC.position.clone().sub(el).normalize();
      P.dbC.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), dir);
      P.dbC.position.addScaledVector(dir, 0.05);
    }
  }

  function setMode(k) {
    var T = S.three;
    S.exKey = k;
    document.body.classList.toggle('ex3d-on', !!k);
    if (!k) {
      S.ex = null; S.pivot.rotation.y = S.yaw0; S.vel = 0;
      if (S.shadow) S.shadow.visible = false;
      hideProps(); S.dbMode = null; S.matTop = 0;
      S.loadsStr = null; resize(); return;
    }
    var def = window.KS_EX[k];
    var keys = def.keys.map(function (p) { return JSON.parse(JSON.stringify(p)); });
    S.ex = { def: def, keys: keys, dirs: keys.map(toDirs) };
    S.ex.fit = buildFit(S.ex, k);
    S.ext = 0; S.vel = 0;
    S.pivot.rotation.y = S.yaw0 + (def.view || 0) * Math.PI / 180 + (window.B3_YAW || 0);
    // encuadre: todas las poses de la animación
    S.pivot.updateMatrixWorld(true);
    var box = new T.Box3(), p = new T.Vector3(), foot = new T.Box3();
    S.matTop = 0; S.exLow = Infinity; S.exHigh = -Infinity;
    var steps = def.loop === 'hold' ? 1 : 16, total = def.loop === 'hold' ? 0 : loopLen(def, keys.length);
    for (var s = 0; s <= steps; s++) {
      setPose(sample(S.ex, total * s / steps));
      FRAMEB.forEach(function (n) { if (!S.B[n]) return; S.B[n].getWorldPosition(p); box.expandByPoint(p); foot.expandByPoint(S.model.worldToLocal(p.clone())); });
      var hy0 = mPos(S.B.Hips, new T.Vector3()).y - S.floorY; S.exLow = Math.min(S.exLow, hy0); S.exHigh = Math.max(S.exHigh, hy0);
    }
    box.expandByScalar(0.09); box.min.y = Math.min(box.min.y, S.pivot.localToWorld(new T.Vector3(0, S.floorY, 0)).y);
    S.exBox = box;
    if (!S.shadow) {
      var cv = document.createElement('canvas'); cv.width = cv.height = 128;
      var g = cv.getContext('2d'), gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
      gr.addColorStop(0, 'rgba(0,0,0,0.26)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.09)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      S.shadow = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: new T.CanvasTexture(cv), transparent: true, depthWrite: false }));
      S.shadow.rotation.x = -Math.PI / 2; S.shadow.renderOrder = -1; S.model.add(S.shadow);
    }
    var fc = foot.getCenter(new T.Vector3()), fs = foot.getSize(new T.Vector3());
    setupProps(def, foot);
    S.shadow.position.set(fc.x, S.floorY + (S.matTop || 0) + 0.002, fc.z);
    S.shadow.scale.set(Math.max(0.5, fs.x * 1.1), Math.max(0.5, fs.z * 1.1), 1);
    S.shadow.visible = true;
    setPoseFull(sample(S.ex, 0));
    S.loadsStr = null;
    exCamera();
  }

  function exCamera() {
    var T = S.three, box = S.exBox; if (!box || !S.camera) return;
    var fo = S.ex && S.ex.def.focus;   // [y mín, y máx] en metros: acercar la cámara a una parte del cuerpo
    if (fo) { box = box.clone(); box.min.y = Math.max(box.min.y, S.floorY + fo[0]); box.max.y = Math.min(box.max.y, S.floorY + fo[1]); }
    var c = box.getCenter(new T.Vector3()), sz = box.getSize(new T.Vector3());
    var el = ((S.ex && S.ex.def.elev) || 6) * Math.PI / 180, vfov = T.MathUtils.degToRad(S.camera.fov);
    var needH = sz.y * Math.cos(el) + sz.z * Math.sin(el) * 0.6, needW = sz.x;
    var dist = Math.max(needH / (2 * Math.tan(vfov / 2)), needW / (2 * Math.tan(vfov / 2) * S.camera.aspect)) + sz.z * 0.5;
    S.camera.position.set(c.x, c.y + Math.sin(el) * dist, c.z + Math.cos(el) * dist);
    S.camera.lookAt(c);
    S.camera.updateProjectionMatrix();
  }

  function debugPose(k, t) { if (!S.ready) return false; if (k !== S.exKey) setMode(k); S.ext = t; setPoseFull(sample(S.ex, t)); paint(S.ex.def.loads || {}); draw(); return true; }

  function metrics(k) {
    if (!S.ready) return null; if (k !== S.exKey) setMode(k);
    var T = S.three, def = S.ex.def, total = def.loop === 'hold' ? 0.01 : loopLen(def, S.ex.keys.length);
    var out = { float: 0, pen: 0, ik: 0, at: 0, who: '' }, p = new T.Vector3();
    for (var i = 0; i < 24; i++) {
      var P = sample(S.ex, total * i / 24); setPoseFull(P);
      var lo = Infinity, who = ''; CONTACT.forEach(function (c) { if (S.B[c[0]]) { mPos(S.B[c[0]], p); if (p.y - c[1] < lo) { lo = p.y - c[1]; who = c[0]; } } });
      var g = lo - (S.floorY + (S.matTop || 0));
      if (g > out.float) { out.float = g; out.at = i; }
      if (g < out.pen) { out.pen = g; out.who = who; }
      var fl = S.floorY + (S.matTop || 0);
      touchList(P).forEach(function (c) { mPos(S.B[c[0]], p); var gp = p.y - fl - c[1]; if (Math.abs(gp) > Math.abs(out.gap || 0)) { out.gap = gp; out.gapWho = c[0] + '@' + i; } });
      LIMBS.forEach(function (L) { var sp = P[L[0]]; if (sp && sp.ik) { mPos(S.B[L[3]], p); var e = p.distanceTo(new T.Vector3(sp.ik[0], S.floorY + sp.ik[1], sp.ik[2])); out.ik = Math.max(out.ik, e); } });
    }
    // recorrido: cuánto se mueve la articulación que más se mueve
    var pts = {}, names = ['Head', 'Hips', 'LeftHand', 'RightHand', 'LeftFoot', 'RightFoot', 'LeftForeArm', 'RightForeArm', 'LeftLeg', 'RightLeg', 'Spine2'];
    for (var j = 0; j < 24; j++) { setPoseFull(sample(S.ex, total * j / 24)); names.forEach(function (nm) { (pts[nm] = pts[nm] || []).push(mPos(S.B[nm], new T.Vector3())); }); }
    out.amp = 0; out.ampj = '';
    names.forEach(function (nm) { var b = new T.Box3().setFromPoints(pts[nm]), d = b.getSize(new T.Vector3()).length(); if (d > out.amp) { out.amp = d; out.ampj = nm; } });
    out.amp = Math.round(out.amp * 100) / 100;
    out.float = Math.round(out.float * 1000) / 1000; out.pen = Math.round(out.pen * 1000) / 1000; out.ik = Math.round(out.ik * 1000) / 1000;
    return out;
  }
  window.Body3D = { sync: sync, state: S, debug: debugPose, metrics: metrics,
    bake: function (k) { var e = window.KS_EX[k]; setMode(k); return { h: exHash(e), f: JSON.parse(JSON.stringify(S.ex.fit, function (kk, v) { return typeof v === 'number' ? Math.round(v * 10000) / 10000 : v; })) }; }, loopLen: function (k) { var e = window.KS_EX[k]; return loopLen(e, e.keys.length); } };
})();
