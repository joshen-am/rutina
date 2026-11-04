/* keystone · cómo se mueve cada ejercicio, con el mismo cuerpo 3D.
   Cada ejercicio es una lista de poses clave; el cuerpo pasa de una a otra con suavidad.
   Coordenadas en metros: y hacia arriba desde el suelo, z hacia adelante del cuerpo, x hacia su izquierda.
   Una pierna o un brazo se pone de dos formas:
     { ik: [x, y, z], pole: [x, y, z] }  → el tobillo o la muñeca van a ese punto (rodilla/codo hacia pole)
     { a: [x, y, z], b: [x, y, z], w }   → dirección del muslo/brazo (a) y de la pierna/antebrazo (b),
                                           en el marco de la cadera (o del mundo si w = 1)
   hips.p = posición de la cadera (y desde el suelo; si falta, el cuerpo se apoya solo en el suelo),
   hips.r = giro de la cadera en grados [x, y, z]; spine y head = flexión en grados [x, y, z]. */
(function () {
  'use strict';
  var A = 0.105;                    // altura del tobillo con el pie plano
  var DOWN = { a: [0.22, -1, 0.02], b: [0.12, -1, 0.14] };   // brazo relajado al costado (izquierdo)
  function m(v) { return [-v[0], v[1], v[2]]; }
  function mirLimb(l) {
    if (!l) return l;
    var o = {};
    for (var k in l) o[k] = Array.isArray(l[k]) ? m(l[k]) : l[k];
    return o;
  }
  // pose con lado izquierdo y lado derecho; si falta el derecho, se copia en espejo
  function P(o) {
    var p = {
      hips: { p: o.p, r: o.r || [0, 0, 0] }, spine: o.spine || [0, 0, 0], head: o.head || [0, 0, 0], sh: o.sh || [0, 0, 0], neck: o.neck, touch: o.touch,
      lLeg: o.lLeg, rLeg: o.rLeg || mirLimb(o.lLeg), lArm: o.lArm || DOWN, rArm: o.rArm || mirLimb(o.lArm || DOWN),
      lFoot: o.lFoot != null ? o.lFoot : 'flat', rFoot: o.rFoot != null ? o.rFoot : (o.lFoot != null ? o.lFoot : 'flat'),
      lHand: o.lHand || 'follow', rHand: o.rHand || o.lHand || 'follow', ground: !!o.ground
    };
    return p;
  }
  var STAND_LEG = { ik: [0.1, A, 0.0], pole: [0.15, 0, 1] };
  function stand(o) { o = o || {}; return P(Object.assign({ p: [0, 1.06, 0], lLeg: STAND_LEG }, o)); }
  function swapLR(o) {   // la misma pose con los lados cambiados
    var q = JSON.parse(JSON.stringify(o));
    q.lLeg = mirLimb(o.rLeg); q.rLeg = mirLimb(o.lLeg); q.lArm = mirLimb(o.rArm); q.rArm = mirLimb(o.lArm);
    q.lFoot = o.rFoot; q.rFoot = o.lFoot; q.lHand = o.rHand; q.rHand = o.lHand;
    q.hips.r = [o.hips.r[0], -o.hips.r[1], -o.hips.r[2]]; q.spine = [o.spine[0], -o.spine[1], -o.spine[2]]; q.head = [o.head[0], -o.head[1], -o.head[2]];
    if (o.hips.p) q.hips.p = m(o.hips.p);
    if (o.touch) q.touch = o.touch.map(function (t) { return /^Left/.test(t) ? t.replace(/^Left/, 'Right') : t.replace(/^Right/, 'Left'); });
    return q;
  }

  /* apoyos repetidos */
  var Q_HIPS = { p: [0, 0.56, -0.02], r: [84, 0, 0] };            // en cuatro apoyos
  var Q_KNEE = { ik: [0.1, 0.07, -0.44], pole: [0, -1, 0.2] };      // rodilla al suelo, empeine atrás
  var Q_HAND = { ik: [0.17, 0.05, 0.46], pole: [0, 0, -1] };        // mano bajo el hombro
  var SUP = { r: [-90, 0, 0] };                                      // boca arriba, cabeza hacia -z
  var ARMS_FLOOR = { a: [0.28, -1, -0.02], b: [0.2, -1, -0.02] };   // brazos en el suelo junto al cuerpo
  var PRONE = { r: [90, 0, 0] };                                     // boca abajo, cabeza hacia +z
  var LEGS_LONG = { a: [0.06, -1, 0], b: [0.02, -1, 0] };            // piernas estiradas en línea con el tronco
  var LEGS_PRONE = { a: [0.06, -1, 0.08], b: [0.02, -1, 0.02] };    // boca abajo: los muslos bajan hasta que las rodillas tocan el suelo
  var LEGS_PRONE_K = { a: [0.06, -1, 0.14], b: [0.02, -1, 0.02] };  // igual, con el pecho levantado sobre los antebrazos

  var EX = {
    marcha: { view: 35, loop: 'pingpong', t: 0.7, loads: { quads: 0.5, abs: 0.25 }, keys: [
      P({ p: [0, 1.06, 0], lLeg: { a: [0.05, -0.35, 1], b: [0, -1, -0.08] }, lFoot: 'follow', rLeg: { ik: [-0.1, A, 0], pole: [0, 0, 1] },
          lArm: { a: [0.15, -0.9, -0.4], b: [0.12, -1, -0.15] }, rArm: { a: [-0.12, -0.85, 0.5], b: [-0.05, -0.35, 1] } }),
      null] },
    circulos_brazos: { view: 56, elev: 6, loop: 'cycle', smooth: 1, t: 0.42, loads: { deltF: 0.6, deltB: 0.6, traps: 0.3 }, keys: [
      stand({ lArm: { a: [1, 0.34, 0], b: [1, 0.34, 0] } }), stand({ lArm: { a: [1, 0, 0.34], b: [1, 0, 0.34] } }),
      stand({ lArm: { a: [1, -0.34, 0], b: [1, -0.34, 0] } }), stand({ lArm: { a: [1, 0, -0.34], b: [1, 0, -0.34] } })] },
    // gato: la espalda se redondea hacia el techo y la cabeza baja; vaca: la espalda se hunde y la mirada sube
    gato_vaca: { view: 84, elev: 12, loop: 'pingpong', t: 1.6, dwell: [0.3, 0.3], loads: { abs: 0.45, lowback: 0.5 }, keys: [
      P({ touch: ['knees', 'hands', 'toes'], p: [0, 0.58, -0.02], r: [94, 0, 0], spine: [26, 0, 0], head: [16, 0, 0], lLeg: Q_KNEE, lFoot: 122, lArm: Q_HAND, lHand: 'flat' }),
      P({ touch: ['knees', 'hands', 'toes'], p: [0, 0.52, -0.02], r: [78, 0, 0], spine: [-30, 0, 0], head: [-34, 0, 0], lLeg: Q_KNEE, lFoot: 122, lArm: Q_HAND, lHand: 'flat' })] },
    // las manos van en la cintura y se mueven con ella; desde arriba y de tres cuartos se ve que la cadera dibuja un círculo
    circulos_cadera: { view: 34, elev: 22, loop: 'cycle', smooth: 1, t: 0.6, loads: { glutes: 0.35, abs: 0.35, lowback: 0.35 }, keys: [[0.09, 0], [0, 0.09], [-0.09, 0], [0, -0.09]].map(function (d) {
      return stand({ p: [d[0], 1.04, d[1]], r: [d[1] * 110, 0, -d[0] * 110], spine: [-d[1] * 150, 0, d[0] * 150], lLeg: { ik: [0.13, A, 0], pole: [0.2, 0, 1] },
        lArm: { ik: [0.2 + d[0] * 0.85, 1.05, -0.01 + d[1] * 0.85], pole: [1, -0.2, -0.7] }, rArm: { ik: [-0.2 + d[0] * 0.85, 1.05, -0.01 + d[1] * 0.85], pole: [-1, -0.2, -0.7] } });
    }) },
    // de pie frente a la pared, un poco inclinado y con las palmas planas a la altura del hombro; con los brazos estirados
    // solo se separan los omóplatos (el pecho se aleja) y se juntan (el pecho se acerca). Se mira desde atrás y de lado
    escapular_pared: { view: 122, elev: 10, loop: 'pingpong', t: 1.0, dwell: [0.35, 0.35], loads: { traps: 0.55, chest: 0.3, deltF: 0.3 }, props: { wall: { z: 0.66 } }, keys: [
      stand({ p: [0, 1.045, 0.01], r: [9, 0, 0], spine: [10, 0, 0], head: [6, 0, 0], sh: [0, -26, 0], lArm: { ik: [0.2, 1.34, 0.625], pole: [0.3, -1, 0] }, lHand: 'wall' }),
      stand({ p: [0, 1.04, 0.1], r: [11, 0, 0], spine: [-5, 0, 0], head: [-2, 0, 0], sh: [0, 28, 0], lArm: { ik: [0.2, 1.34, 0.625], pole: [0.3, -1, 0] }, lHand: 'wall' })] },
    sentadilla: { view: 62, loop: 'pingpong', t: 1.4, loads: { quads: 0.8, glutes: 0.7, hams: 0.3 }, keys: [
      stand({ lLeg: { ik: [0.13, A, 0.02], pole: [0.35, 0, 1] }, lArm: { a: [0.2, -1, 0.15], b: [0.15, -1, 0.3] } }),
      stand({ p: [0, 0.6, -0.22], r: [32, 0, 0], spine: [8, 0, 0], head: [-18, 0, 0], lLeg: { ik: [0.13, A, 0.02], pole: [0.35, 0, 1] }, lArm: { a: [0.15, -0.2, 1], b: [0.12, -0.1, 1] } })] },
    puente: { view: 82, elev: 16, loop: 'pingpong', t: 1.2, loads: { glutes: 0.85, hams: 0.45, lowback: 0.25 }, keys: [
      P(Object.assign({ touch: ['back', 'hips', 'head', 'hands'], p: [0, 0.13, 0], lLeg: { ik: [0.13, A, 0.42], pole: [0.1, 1, 0.3] }, lArm: { a: [0.3, -0.12, 1], b: [0.25, -0.08, 1], w: 1 } }, SUP)),
      // arriba: hombros y cabeza en el suelo, el cuello se dobla (mentón al pecho) y la cadera sube hasta la línea hombro-rodilla
      P({ touch: ['LeftShoulder:0.1', 'RightShoulder:0.1', 'head', 'hands'], p: [0, 0.34, -0.04], r: [-126, 0, 0], neck: [24, 0, 0], head: [6, 0, 0], lLeg: { ik: [0.13, A, 0.42], pole: [0.1, 1, 0.3] }, lArm: { a: [0.3, -0.12, 1], b: [0.25, -0.08, 1], w: 1 } })] },
    // de lado a una pared, con la mano en ella; la pierna de afuera (la más cerca de la cámara) va adelante y atrás
    balanceo_pierna: { view: 84, elev: 6, loop: 'pingpong', t: 0.75, tempo: [1, 1], loads: { hams: 0.4, quads: 0.35, glutes: 0.35 }, props: { wall: { side: 1, x: 0.6 } }, keys: [
      stand({ r: [-4, 0, 0], spine: [2, 0, 0], lLeg: { ik: [0.11, A, 0], pole: [0.1, 0, 1] }, rLeg: { a: [-0.05, -0.72, 0.7], b: [-0.05, -0.8, 0.6] }, rFoot: 'follow',
        lArm: { ik: [0.555, 1.32, 0.02], pole: [0.6, -1, -0.4] }, lHand: 'wallSide', rArm: { ik: [-0.17, 1.0, 0.02], pole: [-1, 0, -0.6] } }),
      stand({ r: [5, 0, 0], spine: [-3, 0, 0], lLeg: { ik: [0.11, A, 0], pole: [0.1, 0, 1] }, rLeg: { a: [-0.05, -0.86, -0.5], b: [-0.05, -0.95, -0.3] }, rFoot: 'follow',
        lArm: { ik: [0.555, 1.32, 0.02], pole: [0.6, -1, -0.4] }, lHand: 'wallSide', rArm: { ik: [-0.17, 1.0, 0.02], pole: [-1, 0, -0.6] } })] },
    flex_rodillas: { view: 80, elev: 12, loop: 'pingpong', t: 1.2, loads: { chest: 0.8, triceps: 0.6, deltF: 0.5 }, keys: [
      P({ touch: ['hands', 'knees'], p: [0, 0.46, -0.06], r: [62, 0, 0], lLeg: { ik: [0.1, 0.08, -0.84], pole: [0, -1, 0] }, lFoot: 122, lArm: { ik: [0.26, 0.05, 0.46], pole: [0.6, 0, -1] }, lHand: 'flat' }),
      P({ touch: ['hands', 'knees'], p: [0, 0.16, -0.0], r: [84, 0, 0], head: [-10, 0, 0], lLeg: { ik: [0.1, 0.08, -0.84], pole: [0, -1, 0] }, lFoot: 122, lArm: { ik: [0.26, 0.05, 0.46], pole: [0.6, 0, -1] }, lHand: 'flat' })] },
    // frente al borde de un marco de puerta (la jamba queda delante del hombro izquierdo), la punta de los pies junto a la base:
    // el cuerpo recto se deja caer hacia atrás con el brazo estirado y vuelve tirando del codo hacia atrás, pegado al cuerpo
    remo_marco: { view: -118, elev: 10, loop: 'pingpong', t: 1.1, tempo: [1.25, 0.75], dwell: [0.15, 0.35], loads: { lats: 0.75, traps: 0.5, biceps: 0.55, deltB: 0.45 }, props: { door: { x: 0.42, z: 0.5, cx: -0.27 } }, keys: [
      stand({ p: [0, 0.985, -0.07], r: [-21, 0, 0], lLeg: { ik: [0.11, A, 0.25], pole: [0.1, 0, 1] }, rArm: { a: [-0.2, -1, -0.12], b: [-0.12, -1, -0.05] },
        lArm: { ik: [0.15, 1.24, 0.41], pole: [0.3, -1, -0.2] } }),
      stand({ p: [0, 1.045, 0.14], r: [-7, 0, 0], lLeg: { ik: [0.11, A, 0.25], pole: [0.1, 0, 1] }, rArm: { a: [-0.2, -1, -0.05], b: [-0.12, -1, 0.05] },
        lArm: { ik: [0.15, 1.24, 0.41], pole: [0.35, -1, -1] } })] },
    laterales: { view: 12, loop: 'pingpong', t: 1.1, loads: { deltF: 0.6, deltB: 0.5, traps: 0.35 }, props: { db: 'both' }, keys: [
      stand({ lArm: { a: [0.2, -1, 0.08], b: [0.22, -1, 0.16] } }), stand({ lArm: { a: [1, -0.08, 0.14], b: [1, -0.02, 0.26] } })] },
    curl: { view: 58, loop: 'pingpong', t: 1.0, loads: { biceps: 0.85, forearm: 0.45 }, props: { db: 'both' }, keys: [
      stand({ lArm: { a: [0.14, -1, 0.02], b: [0.1, -1, 0.08], tw: 80 } }), stand({ lArm: { a: [0.14, -1, 0.08], b: [0.06, 0.85, 0.52], tw: 80 } })] },
    // un brazo: el codo apunta al techo y queda quieto; solo el antebrazo baja detrás de la cabeza. La otra mano, en la cintura
    triceps: { view: 34, elev: 8, loop: 'pingpong', t: 1.1, loads: { triceps: 0.85, deltF: 0.25 }, props: { db: 'left' }, keys: [
      stand({ head: [6, 0, 0], lArm: { a: [0.08, 1, 0.1], b: [-0.2, -0.7, -0.68] }, rArm: { ik: [-0.17, 1.0, 0.02], pole: [-1, 0, -0.6] } }),
      stand({ head: [2, 0, 0], lArm: { a: [0.08, 1, 0.08], b: [-0.06, 1, 0.05] }, rArm: { ik: [-0.17, 1.0, 0.02], pole: [-1, 0, -0.6] } })] },
    ytw: { view: 58, elev: 30, loop: 'cycle', t: 0.9, loads: { traps: 0.7, deltB: 0.6, lowback: 0.35 }, keys: [
      P({ touch: ['chest', 'hips', 'knees'], ground: 1, r: [90, 0, 0], head: [-10, 0, 0], lLeg: LEGS_PRONE, lFoot: 120, lArm: { a: [0.55, 1, -0.28], b: [0.55, 1, -0.28] } }),
      P({ touch: ['chest', 'hips', 'knees'], ground: 1, r: [90, 0, 0], head: [-10, 0, 0], lLeg: LEGS_PRONE, lFoot: 120, lArm: { a: [1, 0.04, -0.32], b: [1, 0.04, -0.32] } }),
      P({ touch: ['chest', 'hips', 'knees'], ground: 1, r: [90, 0, 0], head: [-10, 0, 0], lLeg: LEGS_PRONE, lFoot: 120, lArm: { a: [0.85, -0.15, -0.38], b: [0.25, 0.95, -0.25] } })] },
    deadbug: { view: 70, elev: 26, loop: 'pingpong', t: 1.3, loads: { abs: 0.85, lowback: 0.3 }, keys: [
      P({ touch: ['back', 'hips', 'head'], ground: 1, r: [-90, 0, 0], lLeg: { a: [0.06, -1, 0.22], b: [0.03, -1, 0.2] }, lFoot: 'follow', rLeg: { a: [-0.06, 0, 1], b: [-0.02, -1, 0.02] }, rFoot: 'follow',
          lArm: { a: [0.1, 0.1, 1], b: [0.1, 0.1, 1] }, rArm: { a: [-0.12, 1, 0.25], b: [-0.1, 1, 0.25] } }),
      null] },
    plancha: { view: 76, elev: 14, loop: 'pingpong', t: 1.1, tempo: [1, 0.9], dwell: [0.5, 2.2], loads: { abs: 0.8, deltF: 0.4, glutes: 0.3 }, keys: [
      P({ touch: ['hips', 'forearms', 'toes'], ground: 1, r: [64, 0, 0], lLeg: { a: [0.06, -0.06, -1], b: [0.02, -0.03, -1], w: 1 }, lFoot: 70, lArm: { a: [0.1, -1, 0.04], b: [-0.05, -0.02, 1], w: 1 } }),
      P({ touch: ['forearms', 'toes'], ground: 1, r: [84, 0, 0], lLeg: LEGS_LONG, lFoot: 70, lArm: { a: [0.1, -1, 0.04], b: [-0.05, -0.02, 1], w: 1 } })] },
    chin_tuck: { view: 86, focus: [1.05, 1.85], loop: 'pingpong', t: 0.9, dwell: [0.4, 1.0], loads: { traps: 0.4 }, keys: [
      stand({ neck: [32, 0, 0], head: [-34, 0, 0], spine: [6, 0, 0] }), stand({ neck: [-18, 0, 0], head: [22, 0, 0], spine: [-3, 0, 0] })] },
    // espalda, cabeza y brazos contra la pared: de W (codos abajo) a Y (brazos arriba) sin despegar antebrazos ni manos
    angeles: { view: 38, elev: 8, loop: 'pingpong', t: 1.4, tempo: [1, 1], dwell: [0.2, 0.3], loads: { traps: 0.6, deltB: 0.45, lats: 0.3 }, props: { wall: { z: -0.2 } }, keys: [
      stand({ p: [0, 1.055, -0.05], head: [-4, 0, 0], lArm: { a: [1, -0.3, -0.12], b: [0.12, 1, -0.1] }, lHand: 'wall' }),
      stand({ p: [0, 1.06, -0.05], head: [-4, 0, 0], lArm: { a: [0.52, 1, -0.1], b: [0.32, 1, -0.08] }, lHand: 'wall' })] },
    // en el vano de la puerta, brazos a 90° con los antebrazos y las palmas contra el marco; un paso adelante abre el pecho
    pecho_marco: { view: 148, elev: 12, loop: 'pingpong', t: 1.1, tempo: [1, 0.9], dwell: [0.5, 2.2], loads: { chest: 0.6, deltF: 0.4 }, props: { door: { x: 0.47, z: 0.12 } }, keys: [
      stand({ p: [0, 1.055, -0.1], lLeg: { ik: [0.1, A, -0.04], pole: [0.1, 0, 1] }, rLeg: { ik: [-0.1, A, -0.16], pole: [0, 0, 1] },
        lArm: { ik: [0.47, 1.72, 0.02], pole: [1, -0.25, 0] }, lHand: 'wall' }),
      stand({ p: [0, 1.0, 0.13], r: [9, 0, 0], spine: [-6, 0, 0], lLeg: { ik: [0.1, A, 0.4], pole: [0.1, 0, 1] }, rLeg: { ik: [-0.1, A, -0.2], pole: [0, 0, 1] }, rFoot: 'flat',
        lArm: { ik: [0.47, 1.72, 0.02], pole: [1, -0.25, 0] }, lHand: 'wall' })] },
    flexor_cadera: { view: 80, loop: 'pingpong', t: 1.1, tempo: [1, 0.9], dwell: [0.5, 2.2], loads: { quads: 0.55, glutes: 0.3 }, keys: [
      P({ touch: ['RightLeg'], p: [0, 0.6, -0.2], r: [6, 0, 0], lLeg: { ik: [0.12, A, 0.42], pole: [0.1, 0, 1] }, rLeg: { ik: [-0.1, 0.09, -0.56], pole: [0, -1, 0.2] }, rFoot: 122,
        lArm: { ik: [0.12, 0.62, 0.36], pole: [1, -0.4, -0.5] } }),
      P({ touch: ['RightLeg'], p: [0, 0.54, 0.0], r: [-12, 0, 0], spine: [-4, 0, 0], lLeg: { ik: [0.12, A, 0.42], pole: [0.1, 0, 1] }, rLeg: { ik: [-0.1, 0.09, -0.56], pole: [0, -1, 0.2] }, rFoot: 122,
        lArm: { ik: [0.12, 0.62, 0.36], pole: [1, -0.4, -0.5] } })] },
    // el pie de atrás se levanta un poco al dar el paso (no se arrastra) y vuelve igual; abajo y arriba hay una pausa corta
    zancada_atras: { view: 80, loop: 'cycle', t: 0.62, loads: { quads: 0.8, glutes: 0.7, hams: 0.3 }, keys: [
      stand({ lLeg: { ik: [0.11, A, 0.04], pole: [0.15, 0, 1] }, lArm: { ik: [0.17, 1.0, 0.02], pole: [1, 0, -0.6] } }),
      P({ p: [0, 0.9, -0.1], r: [3, 0, 0], lLeg: { ik: [0.11, A, 0.05], pole: [0.15, 0, 1] }, rLeg: { ik: [-0.11, A + 0.09, -0.36], pole: [0, -0.2, 1] }, rFoot: 24,
        lArm: { ik: [0.17, 0.86, -0.06], pole: [1, 0, -0.6] } }),
      P({ p: [0, 0.58, -0.22], r: [4, 0, 0], lLeg: { ik: [0.11, A, 0.06], pole: [0.15, 0, 1] }, rLeg: { ik: [-0.11, 0.17, -0.66], pole: [0, -0.3, 1] }, rFoot: 46,
        lArm: { ik: [0.17, 0.54, 0.0], pole: [1, 0, -0.6] } }),
      null] },
    // la mancuerna va en la mano del lado de la pierna que sube atrás
    pm_rumano: { view: 82, loop: 'pingpong', t: 1.5, loads: { hams: 0.8, glutes: 0.7, lowback: 0.4 }, props: { db: 'right' }, keys: [
      stand({ lLeg: { ik: [0.09, A, 0.02], pole: [0, 0, 1] }, rLeg: { a: [-0.06, -1, -0.12], b: [-0.03, -1, -0.32] }, rFoot: 'follow' }),
      P({ p: [0, 1.0, 0.0], r: [76, 0, 0], head: [-14, 0, 0], lLeg: { ik: [0.09, A, 0.04], pole: [0, 0, 1] }, rLeg: { a: [-0.06, -1, 0.04], b: [-0.03, -1, 0.04] }, rFoot: 'follow',
        lArm: { a: [0.15, -1, 0.05], b: [0.1, -1, 0.05], w: 1 } })] },
    // en una pierna frente a la pared, con la palma en ella para el equilibrio; el talón sube lo que da el pie (unos 5 cm)
    talones_suelo: { view: 124, elev: 8, loop: 'pingpong', t: 0.9, dwell: [0.15, 0.6], loads: { calves: 0.9 }, props: { wall: { z: 0.6 } }, keys: [
      stand({ lLeg: { ik: [0.09, A, 0.02], pole: [0, 0, 1] }, rLeg: { a: [-0.05, -1, 0.04], b: [-0.02, -0.55, -0.84] }, rFoot: 'follow', rArm: { ik: [-0.17, 1.32, 0.565], pole: [-0.4, -1, 0] }, rHand: 'wall', lArm: { ik: [0.17, 1.0, 0.02], pole: [1, 0, -0.6] } }),
      stand({ p: [0, 1.087, 0.06], lLeg: { ik: [0.09, 0.147, 0.078], pole: [0, 0, 1] }, lFoot: 30, rLeg: { a: [-0.05, -1, 0.04], b: [-0.02, -0.55, -0.84] }, rFoot: 'follow', rArm: { ik: [-0.17, 1.33, 0.565], pole: [-0.4, -1, 0] }, rHand: 'wall', lArm: { ik: [0.17, 1.05, 0.02], pole: [1, 0, -0.6] } })] },
    plancha_lateral: { view: 8, elev: 8, loop: 'pingpong', t: 1.1, tempo: [1, 0.9], dwell: [0.5, 2.2], loads: { abs: 0.8, glutes: 0.35, deltF: 0.3 }, keys: [
      P({ touch: ['RightForeArm', 'RightHand', 'RightLeg:0.07', 'RightFoot:0.05'], ground: 1, r: [0, 0, 56], lLeg: { a: [1, -0.1, 0.02], b: [1, -0.04, 0.02], w: 1 }, rLeg: { a: [1, -0.1, -0.02], b: [1, -0.04, -0.02], w: 1 }, lFoot: 'follow', rArm: { a: [0, -1, 0.04], b: [0.02, 0.05, 1], w: 1 }, lArm: { a: [0.3, -1, 0.1], b: [0.2, -1, 0.4] } }),
      P({ touch: ['RightForeArm', 'RightHand', 'RightFoot:0.05'], ground: 1, r: [0, 0, 64], lLeg: LEGS_LONG, lFoot: 'follow', rArm: { a: [0, -1, 0.04], b: [0.02, 0.05, 1], w: 1 }, lArm: { a: [0, 1, 0], b: [0, 1, 0], w: 1 } })] },
    bird_dog: { view: 78, elev: 14, loop: 'pingpong', t: 1.4, loads: { abs: 0.55, glutes: 0.55, lowback: 0.5, deltF: 0.3 }, keys: [
      P({ touch: ['LeftLeg', 'LeftToeBase', 'RightHand'], p: [0, 0.55, -0.02], r: [86, 0, 0], head: [-6, 0, 0], lLeg: Q_KNEE, lFoot: 122, rLeg: { a: [-0.06, -1, -0.04], b: [-0.03, -1, -0.04] }, rFoot: 'follow',
          rArm: mirLimb(Q_HAND), rHand: 'flat', lArm: { a: [0.12, 1, -0.05], b: [0.1, 1, -0.05] } }),
      null] },
    crunch_invertido: { view: 80, elev: 18, loop: 'pingpong', t: 1.2, loads: { abs: 0.85 }, keys: [
      P({ touch: ['back', 'hips', 'head', 'hands'], ground: 1, r: [-90, 0, 0], lLeg: { a: [0.06, 0, 1], b: [0.03, -1, 0.04] }, lFoot: 'follow', lArm: ARMS_FLOOR }),
      // las rodillas van hacia el pecho y la cadera se despega un poco; las piernas no pasan por encima de la cabeza
      P({ touch: ['back', 'head', 'hands'], ground: 1, r: [-100, 0, 0], spine: [-10, 0, 0], lLeg: { a: [0.06, 0.6, 0.8], b: [0.03, -0.72, 0.7] }, lFoot: 'follow', lArm: ARMS_FLOOR })] },
    hollow: { view: 80, elev: 18, loop: 'pingpong', t: 1.1, tempo: [1, 0.9], dwell: [0.5, 2.2], loads: { abs: 0.9 }, keys: [
      P(Object.assign({ touch: ['back', 'hips', 'head', 'hands'], ground: 1, lLeg: LEGS_LONG, lFoot: 'follow', lArm: ARMS_FLOOR }, SUP)),
      P({ touch: ['hips', 'Spine:0.11'], ground: 1, r: [-90, 0, 0], spine: [30, 0, 0], head: [14, 0, 0], lLeg: { a: [0.05, -0.35, 0.95], b: [0.03, -1, 0.15] }, lFoot: 'follow', lArm: { a: [0.18, -1, 0.42], b: [0.12, -1, 0.42] } })] },
    // boca abajo sobre los antebrazos; los muslos bajan un poco más para que las rodillas queden en el mat
    esfinge: { view: 78, elev: 14, loop: 'pingpong', t: 1.1, tempo: [1, 0.9], dwell: [0.5, 2.2], loads: { lowback: 0.5, abs: 0.2 }, keys: [
      P({ touch: ['chest', 'hips', 'knees', 'forearms'], ground: 1, r: [90, 0, 0], head: [8, 0, 0], lLeg: LEGS_PRONE_K, lFoot: 120, lArm: { a: [0.45, -0.04, 0.6], b: [-0.1, -0.02, 1], w: 1 } }),
      P({ touch: ['hips', 'knees', 'forearms'], ground: 1, r: [90, 0, 0], spine: [-38, 0, 0], head: [-10, 0, 0], lLeg: LEGS_PRONE_K, lFoot: 120, lArm: { a: [0.08, -1, 0.38], b: [0.05, 0.0, 1], w: 1 } })] },
    // la bajada es lenta (3–5 s) y la subida rápida, como pide el ejercicio
    flex_suelo: { view: 80, elev: 10, loop: 'pingpong', t: 1.6, tempo: [1.5, 0.5], dwell: [0.3, 0.2], loads: { chest: 0.85, triceps: 0.6, deltF: 0.5, abs: 0.35 }, keys: [
      P({ touch: ['hands', 'toes'], p: [0, 0.6, 0.0], r: [64, 0, 0], lLeg: LEGS_LONG, lFoot: 72, lArm: { ik: [0.26, 0.05, 0.47], pole: [0.6, 0, -1] }, lHand: 'flat' }),
      P({ touch: ['hands', 'toes'], p: [0, 0.24, 0.02], r: [82, 0, 0], head: [-8, 0, 0], lLeg: LEGS_LONG, lFoot: 72, lArm: { ik: [0.26, 0.05, 0.47], pole: [0.6, 0, -1] }, lHand: 'flat' })] },
    jalon_suelo: { view: 58, elev: 30, loop: 'pingpong', t: 1.2, loads: { lats: 0.75, traps: 0.6, deltB: 0.45 }, keys: [
      P({ touch: ['chest', 'hips', 'knees'], ground: 1, r: [90, 0, 0], head: [-10, 0, 0], lLeg: LEGS_PRONE, lFoot: 120, lArm: { a: [0.45, 1, -0.25], b: [0.4, 1, -0.25] } }),
      P({ touch: ['chest', 'hips', 'knees'], ground: 1, r: [90, 0, 0], head: [-14, 0, 0], lLeg: LEGS_PRONE, lFoot: 120, lArm: { a: [0.95, -0.25, -0.3], b: [0.2, 0.95, -0.25] } })] },
    flex_pica: { view: 82, elev: 8, loop: 'pingpong', t: 1.4, loads: { deltF: 0.8, triceps: 0.6, traps: 0.35 }, keys: [
      P({ touch: ['hands', 'toes'], p: [0, 0.86, -0.04], r: [138, 0, 0], head: [-20, 0, 0], lLeg: { ik: [0.12, 0.14, -0.58], pole: [0, 0, 1] }, lFoot: 40, lArm: { ik: [0.24, 0.05, 0.6], pole: [0.5, 0, -1] }, lHand: 'flat' }),
      P({ touch: ['hands', 'toes'], p: [0, 0.72, 0.05], r: [152, 0, 0], head: [-36, 0, 0], lLeg: { ik: [0.12, 0.14, -0.58], pole: [0, 0, 1] }, lFoot: 40, lArm: { ik: [0.24, 0.05, 0.6], pole: [0.6, 0.3, -1] }, lHand: 'flat' })] },
    fondo_suelo: { view: 80, elev: 10, loop: 'pingpong', t: 1.2, loads: { triceps: 0.85, deltF: 0.4, chest: 0.3 }, keys: [
      P({ touch: ['hands'], p: [0, 0.36, -0.02], r: [-26, 0, 0], lLeg: { ik: [0.13, A, 0.56], pole: [0.1, 1, 0.2] }, lArm: { ik: [0.18, 0.05, -0.3], pole: [0.2, 0, -1] }, lHand: 'flat' }),
      P({ touch: ['hands'], p: [0, 0.14, 0.03], r: [-38, 0, 0], lLeg: { ik: [0.13, A, 0.56], pole: [0.1, 1, 0.2] }, lArm: { ik: [0.18, 0.05, -0.3], pole: [0.2, 0.3, -1] }, lHand: 'flat' })] },
    elev_piernas: { view: 80, elev: 18, loop: 'pingpong', t: 1.5, loads: { abs: 0.85 }, keys: [
      P({ touch: ['back', 'hips', 'head', 'hands'], ground: 1, r: [-90, 0, 0], lLeg: { a: [0.04, -1, 0.1], b: [0.03, -1, 0.1] }, lFoot: 'follow', lArm: ARMS_FLOOR }),
      P({ touch: ['back', 'hips', 'head', 'hands'], ground: 1, r: [-90, 0, 0], lLeg: { a: [0.04, -0.05, 1], b: [0.03, -0.05, 1] }, lFoot: 'follow', lArm: ARMS_FLOOR })] },
    zancada_estatica: { view: 80, loop: 'pingpong', t: 1.3, loads: { quads: 0.8, glutes: 0.65 }, keys: [
      P({ p: [0, 0.94, -0.04], lLeg: { ik: [0.11, A, 0.36], pole: [0.1, 0, 1] }, rLeg: { ik: [-0.11, 0.17, -0.42], pole: [0, 0, 1] }, rFoot: 46, lArm: { ik: [0.17, 0.92, -0.02], pole: [1, 0, -0.6] } }),
      P({ p: [0, 0.6, -0.08], lLeg: { ik: [0.11, A, 0.36], pole: [0.1, 0, 1] }, rLeg: { ik: [-0.11, 0.17, -0.42], pole: [0, -0.3, 1] }, rFoot: 46, lArm: { ik: [0.17, 0.58, -0.06], pole: [1, 0, -0.6] } })] },
    // la mancuerna va al pecho, vertical, con las dos manos bajo el disco de arriba y los codos abajo
    sumo: { view: 34, elev: 8, loop: 'pingpong', t: 1.4, loads: { quads: 0.7, glutes: 0.75, hams: 0.3 }, props: { db: 'center' }, keys: [
      stand({ p: [0, 1.0, 0], lLeg: { ik: [0.3, A, 0.02], pole: [1, 0, 0.7] }, lArm: { ik: [0.045, 1.2, 0.2], pole: [0.7, -1, -0.2] } }),
      stand({ p: [0, 0.6, -0.06], r: [12, 0, 0], spine: [-6, 0, 0], lLeg: { ik: [0.3, A, 0.02], pole: [1, 0, 0.7] }, lArm: { ik: [0.045, 0.83, 0.2], pole: [0.7, -1, -0.2] } })] },
    puente_isquios: { view: 82, elev: 16, loop: 'pingpong', t: 1.2, loads: { hams: 0.85, glutes: 0.6 }, keys: [
      P(Object.assign({ touch: ['back', 'hips', 'head', 'hands'], p: [0, 0.13, 0], lLeg: { ik: [0.13, A, 0.66], pole: [0.1, 1, 0.3] }, lArm: { a: [0.3, -0.12, 1], b: [0.25, -0.08, 1], w: 1 } }, SUP)),
      P({ touch: ['LeftShoulder:0.1', 'RightShoulder:0.1', 'head', 'hands'], p: [0, 0.3, -0.04], r: [-118, 0, 0], neck: [18, 0, 0], head: [4, 0, 0], lLeg: { ik: [0.13, A, 0.66], pole: [0.1, 1, 0.3] }, lArm: { a: [0.3, -0.12, 1], b: [0.25, -0.08, 1], w: 1 } })] },
    puente_una2: { view: 82, elev: 16, loop: 'pingpong', t: 1.2, loads: { glutes: 0.9, hams: 0.5 }, keys: [
      P(Object.assign({ touch: ['back', 'hips', 'head', 'hands'], p: [0, 0.13, 0], lLeg: { ik: [0.13, A, 0.42], pole: [0.1, 1, 0.3] }, rLeg: { a: [-0.05, -1, 0.35], b: [-0.03, -1, 0.35] }, rFoot: 'follow', lArm: { a: [0.3, -0.12, 1], b: [0.25, -0.08, 1], w: 1 } }, SUP)),
      P({ touch: ['LeftShoulder:0.1', 'RightShoulder:0.1', 'head', 'hands'], p: [0, 0.34, -0.04], r: [-126, 0, 0], neck: [24, 0, 0], head: [6, 0, 0], lLeg: { ik: [0.13, A, 0.42], pole: [0.1, 1, 0.3] }, rLeg: { a: [-0.05, -1, 0.0], b: [-0.03, -1, 0.0] }, rFoot: 'follow', lArm: { a: [0.3, -0.12, 1], b: [0.25, -0.08, 1], w: 1 } })] },
    // la espalda baja deslizando por la pared hasta que los muslos quedan casi horizontales y las rodillas sobre los tobillos
    sentadilla_pared: { view: 64, elev: 10, mat: 0, loop: 'pingpong', t: 1.1, tempo: [1, 0.9], dwell: [0.5, 2.4], loads: { quads: 0.85, glutes: 0.45 }, props: { wall: { z: -0.45 } }, keys: [
      P({ p: [0, 0.87, -0.32], r: [-6, 0, 0], lLeg: { ik: [0.12, A, 0.14], pole: [0.2, 0, 1] }, lArm: DOWN }),
      P({ p: [0, 0.56, -0.31], lLeg: { ik: [0.12, A, 0.14], pole: [0.2, 0, 1] }, lArm: { a: [0.22, -1, 0.15], b: [0.1, -0.5, 1] } })] },
    curl_martillo: { view: 30, loop: 'cycle', t: 0.9, loads: { biceps: 0.7, deltF: 0.55, deltB: 0.4, forearm: 0.45 }, props: { db: 'both' }, keys: [
      stand({ lArm: { a: [0.18, -1, 0.04], b: [0.14, -1, 0.1] } }), stand({ lArm: { a: [0.14, -1, 0.08], b: [0.06, 0.85, 0.52] } }),
      stand({ lArm: { a: [0.18, -1, 0.04], b: [0.14, -1, 0.1] } }), stand({ lArm: { a: [1, -0.08, 0.14], b: [1, -0.02, 0.26] } })] },
  };
  // poses que se completan con la otra mitad en espejo
  // marcha: rodilla arriba, los dos pies abajo, la otra rodilla, los dos pies abajo
  var MA = EX.marcha.keys[0], MN = stand({ lArm: { a: [0.18, -1, 0.04], b: [0.12, -1, 0.12] } });
  EX.marcha.keys = [MA, MN, swapLR(MA), MN]; EX.marcha.loop = 'cycle'; EX.marcha.t = 0.42;
  EX.marcha.pass = [1, 3];   // con los dos pies abajo el cuerpo no frena: de una rodilla pasa a la otra
  // zancada: de pie, el paso con el pie en el aire, abajo, y de vuelta por el mismo paso
  EX.zancada_atras.keys[3] = EX.zancada_atras.keys[1]; EX.zancada_atras.pass = [1, 3];
  // brazo y pierna contrarios, pasando por la posición neutra entre un lado y el otro
  var BD_N = P({ touch: ['knees', 'hands', 'toes'], p: [0, 0.55, -0.02], r: [86, 0, 0], head: [-6, 0, 0], lLeg: Q_KNEE, lFoot: 122, lArm: Q_HAND, lHand: 'flat' });
  var DB_N = P({ touch: ['back', 'hips', 'head'], ground: 1, r: [-90, 0, 0], lLeg: { a: [0.06, 0, 1], b: [0.02, -1, 0.02] }, lFoot: 'follow', lArm: { a: [0.1, 0.1, 1], b: [0.1, 0.1, 1] } });
  EX.bird_dog.keys = [EX.bird_dog.keys[0], BD_N, swapLR(EX.bird_dog.keys[0]), BD_N]; EX.bird_dog.loop = 'cycle'; EX.bird_dog.t = 1.0;
  EX.deadbug.keys = [EX.deadbug.keys[0], DB_N, swapLR(EX.deadbug.keys[0]), DB_N]; EX.deadbug.loop = 'cycle'; EX.deadbug.t = 1.0;
  window.KS_EX = EX;
})();
