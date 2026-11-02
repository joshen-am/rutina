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
        if (S.joints) S.joints.material = new T.MeshStandardMaterial({ color: 0xcfcfd4, roughness: 0.38, metalness: 0.0 });
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
    S.base = new T.Color(S.dark ? '#9A9AA3' : '#E2E2E7');
    if (S.joints) S.joints.material.color.set(S.dark ? '#71717A' : '#C4C4CB');
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
    if (!S.drag && Math.abs(S.vel) > 0.05) { S.pivot.rotation.y += S.vel * dt; S.vel *= Math.pow(0.04, dt); }
    if (S.exKey) {
      S.ext += dt;
      setPose(sample(S.ex, S.ext));
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
      CONTACT.forEach(function (c) { if (B[c[0]]) { mPos(B[c[0]], p); lo2 = Math.min(lo2, p.y - c[1]); } });
      var dy = S.floorY - lo2;
      var hm = mPos(B.Hips, new T.Vector3()); hm.y += dy;
      B.Hips.position.copy(B.Hips.parent.worldToLocal(S.model.localToWorld(hm)));
      S.model.updateMatrixWorld(true);
    }
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
  function sample(ex, t) {
    var K = ex.keys, n = K.length, T = ex.def.t || 1;
    if (ex.def.loop === 'hold' || n === 1) {
      var P0 = JSON.parse(JSON.stringify(K[0])); P0.spine = [P0.spine[0] + 1.6 * Math.sin(t * 2.1), P0.spine[1], P0.spine[2]]; return P0;
    }
    var u = t / T, i, j, f;
    if (ex.def.loop === 'cycle') { u = u % n; i = Math.floor(u); j = (i + 1) % n; f = ex.def.smooth ? u - i : ease(u - i); }
    else { u = u % (2 * (n - 1)); if (u < n - 1) { i = Math.floor(u); j = i + 1; f = ease(u - i); } else { u -= n - 1; i = n - 1 - Math.floor(u); j = i - 1; f = ease(u - Math.floor(u)); } }
    return mix(K[i], K[j], f, ex.dirs[i], ex.dirs[j]);
  }

  function setMode(k) {
    var T = S.three;
    S.exKey = k;
    document.body.classList.toggle('ex3d-on', !!k);
    if (!k) {
      S.ex = null; S.pivot.rotation.y = S.yaw0; S.vel = 0;
      if (S.shadow) S.shadow.visible = false;
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
    var steps = def.loop === 'hold' ? 1 : 16, total = def.loop === 'hold' ? 0 : (def.t || 1) * (def.loop === 'cycle' ? keys.length : 2 * (keys.length - 1));
    for (var s = 0; s <= steps; s++) {
      setPose(sample(S.ex, total * s / steps));
      FRAMEB.forEach(function (n) { if (!S.B[n]) return; S.B[n].getWorldPosition(p); box.expandByPoint(p); foot.expandByPoint(S.model.worldToLocal(p.clone())); });
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
    S.shadow.position.set(fc.x, S.floorY + 0.002, fc.z);
    S.shadow.scale.set(Math.max(0.5, fs.x * 1.1), Math.max(0.5, fs.z * 1.1), 1);
    S.shadow.visible = true;
    setPose(sample(S.ex, 0));
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

  function debugPose(k, t) { if (!S.ready) return false; if (k !== S.exKey) setMode(k); S.ext = t; setPose(sample(S.ex, t)); paint(S.ex.def.loads || {}); draw(); return true; }

  window.Body3D = { sync: sync, state: S, debug: debugPose };
})();
