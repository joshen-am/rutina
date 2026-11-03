"""Copia el motor 3D y sus archivos a b3d/t/ para las pruebas (exmetrics, exshot, exgif, bake...).
Ejecutar después de cambiar body3d.js, exercises.js o exfit.js, y después de un build (usa vendor/three de la raíz)."""
import os, shutil
H = os.path.dirname(os.path.abspath(__file__))
T = os.path.join(H, 't'); ROOT = os.path.join(H, '..', '..', '..')
os.makedirs(os.path.join(T, 'vendor', 'three'), exist_ok=True)
for f in ['body3d.js', 'exercises.js', 'exfit.js']:
    shutil.copy(os.path.join(H, f), os.path.join(T, f))
for f in ['three.module.min.js', 'GLTFLoader.js', 'BufferGeometryUtils.js', 'RoomEnvironment.js', 'body.glb']:
    shutil.copy(os.path.join(ROOT, 'vendor', 'three', f), os.path.join(T, 'vendor', 'three', f))
print('ok')
