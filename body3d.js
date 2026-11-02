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
      setPoseFull(sample(S.ex, S.ext));
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
  function setPose(P) {
    var T = S.three, B = S.B; if (!B || !B.Hips) return;
    CTRL.forEach(function (n) { if (B[n]) B[n].quaternion.identity(); });
    eul(P.hips.r, B.Hips.quaternion);
    var hp = P.hips.p || [0, 0.5, 0];
    var target = _v[0].set(hp[0], S.floorY + hp[1], hp[2]);
    B.Hips.position.copy(B.Hips.parent.worldToLocal(S.model.localToWorld(target.clone())));
    var sp = [P.spine[0] / 3, P.spine[1] / 3, P.spine[2] / 3];
    ['Spine', 'Spine1', 'Spine2'].forEach(function (n) { eul(sp, B[n].quaternion); });
    var hd = [P.head[0] / 2, P.head[1] / 2, P.head[2] / 2];
    eul(hd, B.Neck.quaternion); eul(hd, B.Head.quaternion);
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
    if (P.ground || !P.hips.p) {
      var lo2 = Infinity, p = new T.Vector3();
      lo2 = Infinity;
      CONTACT.forEach(function (c) { if (B[c[0]]) { mPos(B[c[0]], p); lo2 = Math.min(lo2, p.y - c[1]); } });
      var dy = S.floorY + (S.matTop || 0) - lo2;
      var hm = mPos(B.Hips, new T.Vector3()); hm.y += dy;
      B.Hips.position.copy(B.Hips.parent.worldToLocal(S.model.localToWorld(hm)));
      S.model.updateMatrixWorld(true);
    }
  }

  function setPoseFull(P) { setPose(P); syncProps(); }
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
  function sample0(ex, t) {
    var K = ex.keys, n = K.length, T = ex.def.t || 1;
    if (ex.def.loop === 'hold' || n === 1) {
      var P0 = JSON.parse(JSON.stringify(K[0])); P0.spine = [P0.spine[0] + 1.6 * Math.sin(t * 2.1), P0.spine[1], P0.spine[2]]; P0.sh = [P0.sh[0], P0.sh[1], P0.sh[2] + 2 * Math.sin(t * 2.1)]; return P0;
    }
    var u = t / T, i, j, f;
    if (ex.def.loop === 'cycle') {
      u = u % n; i = Math.floor(u); j = (i + 1) % n; f = u - i;
      if (ex.def.smooth) {   // movimiento continuo (círculos): curva suave entre las cuatro poses vecinas
        var h = (i + n - 1) % n, k2 = (j + 1) % n;
        var a = mix(K[h], K[i], 0.5 + 0.5 * f, ex.dirs[h], ex.dirs[i]), b = mix(K[j], K[k2], 0.5 * f, ex.dirs[j], ex.dirs[k2]);
        return mix(a, b, f * f * (3 - 2 * f), ex.dirs[i], ex.dirs[j]);
      }
      f = ease(f);
    }
    else {
      // ida y vuelta: la ida (bajar) un poco más lenta que la vuelta
      var tp = ex.def.tempo || [1.12, 0.88], seg = T * (tp[0] + tp[1]), w2 = t % (seg * (n - 1)), si = Math.floor(w2 / seg), r2 = w2 - si * seg;
      if (r2 < T * tp[0]) { i = si; j = si + 1; f = ease(r2 / (T * tp[0])); } else { i = si + 1; j = si; f = ease((r2 - T * tp[0]) / (T * tp[1])); }
    }
    return mix(K[i], K[j], f, ex.dirs[i], ex.dirs[j]);
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
      P.mat.scale.set(Math.min(1.1, Math.max(0.62, z.x + 0.28)), 1, Math.min(2.0, Math.max(0.62, z.z + 0.34)));
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
    S.ext = 0; S.vel = 0;
    S.pivot.rotation.y = S.yaw0 + (def.view || 0) * Math.PI / 180 + (window.B3_YAW || 0);
    // encuadre: todas las poses de la animación
    S.pivot.updateMatrixWorld(true);
    var box = new T.Box3(), p = new T.Vector3(), foot = new T.Box3();
    S.matTop = 0; S.exLow = Infinity; S.exHigh = -Infinity;
    var steps = def.loop === 'hold' ? 1 : 16, total = def.loop === 'hold' ? 0 : (def.t || 1) * (def.loop === 'cycle' ? keys.length : 2 * (keys.length - 1));
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
    var c = box.getCenter(new T.Vector3()), sz = box.getSize(new T.Vector3());
    var el = ((S.ex && S.ex.def.elev) || 6) * Math.PI / 180, vfov = T.MathUtils.degToRad(S.camera.fov);
    var needH = sz.y * Math.cos(el) + sz.z * Math.sin(el) * 0.6, needW = sz.x;
    var dist = Math.max(needH / (2 * Math.tan(vfov / 2)), needW / (2 * Math.tan(vfov / 2) * S.camera.aspect)) + sz.z * 0.5;
    S.camera.position.set(c.x, c.y + Math.sin(el) * dist, c.z + Math.cos(el) * dist);
    S.camera.lookAt(c);
    S.camera.updateProjectionMatrix();
  }

  function debugPose(k, t) { if (!S.ready) return false; if (k !== S.exKey) setMode(k); S.ext = t; setPoseFull(sample(S.ex, t)); paint(S.ex.def.loads || {}); draw(); return true; }

  window.Body3D = { sync: sync, state: S, debug: debugPose };
})();
