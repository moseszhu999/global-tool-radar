import bpy
import hashlib
import importlib.util
import json
import math
import os
import sys

# Radar Scout 3D Hero v5
# Controlled A/B from v4 method direction.
# Only head proportions + eye/socket alignment are allowed to change.
# v2 body, ears, hair, tablet, energy tail, materials, lighting, camera,
# renderer and production authority remain frozen.

HERE = os.path.dirname(os.path.abspath(__file__))
V2_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v2.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v2', V2_PATH)
v2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v2)


def args_after_double_dash():
    argv = sys.argv
    return argv[argv.index('--') + 1:] if '--' in argv else []


def parse_args():
    args = args_after_double_dash()
    if len(args) != 3:
        raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def gaussian2(x, z, cx, cz, sx, sz):
    return math.exp(-(((x-cx)/sx)**2 + ((z-cz)/sz)**2) * 0.5)


def build_head_v5(name, material):
    # More authored silhouette than v4: narrower cranium, slightly taller face,
    # stronger lower-face taper. Front is -Y.
    center = (0.0, 0.015, 2.72)
    rx, ry, rz = 0.905, 0.805, 0.985
    lat_steps = 80
    lon_steps = 128
    verts = []
    faces = []

    for i in range(lat_steps + 1):
        theta = math.pi * i / lat_steps
        st = math.sin(theta)
        ct = math.cos(theta)
        for j in range(lon_steps):
            phi = 2.0 * math.pi * j / lon_steps
            cp = math.cos(phi)
            sp = math.sin(phi)
            nx = st * cp
            ny = st * sp
            nz = ct

            x = rx * nx
            y = ry * ny
            z = rz * nz

            lower = max(0.0, (-nz - 0.02) / 0.98)
            x *= 1.0 - 0.245 * min(1.0, lower)

            # More deliberate temporal/zygomatic silhouette.
            upper_temple = gaussian2(abs(nx), nz, 0.70, 0.22, 0.18, 0.33)
            x *= 1.0 - 0.075 * upper_temple

            if ny < -0.16:
                fx = x / rx
                fz = z / rz

                # Forehead is broad but flatter than the v2/v4 sphere read.
                forehead = gaussian2(fx, fz, 0.0, 0.48, 0.50, 0.30)
                y -= 0.060 * forehead

                # Stronger integrated brow ledge.
                brow_l = gaussian2(fx, fz, -0.43, 0.19, 0.20, 0.13)
                brow_r = gaussian2(fx, fz,  0.43, 0.19, 0.20, 0.13)
                y -= 0.082 * (brow_l + brow_r)

                # Deeper continuous sockets, tuned around the adjusted v5 eyes.
                socket_l = gaussian2(fx, fz, -0.42, 0.015, 0.235, 0.215)
                socket_r = gaussian2(fx, fz,  0.42, 0.015, 0.235, 0.215)
                y += 0.145 * (socket_l + socket_r)

                # Malar plane is stronger and slightly lower, producing a readable
                # brow -> socket -> cheek break under the same studio lighting.
                cheek_l = gaussian2(fx, fz, -0.40, -0.24, 0.25, 0.19)
                cheek_r = gaussian2(fx, fz,  0.40, -0.24, 0.25, 0.19)
                y -= 0.108 * (cheek_l + cheek_r)

                # Narrower central bridge / muzzle so the eyes remain the identity anchor.
                bridge = gaussian2(fx, fz, 0.0, -0.08, 0.13, 0.30)
                nose_tip = gaussian2(fx, fz, 0.0, -0.26, 0.115, 0.105)
                y -= 0.064 * bridge + 0.090 * nose_tip

                # Gentle perioral recession and a forward chin plane.
                perioral = gaussian2(fx, fz, 0.0, -0.43, 0.30, 0.12)
                y += 0.027 * perioral
                chin = gaussian2(fx, fz, 0.0, -0.64, 0.25, 0.16)
                y -= 0.086 * chin

                # Jaw corners turn back slightly to avoid a round toy muzzle.
                jaw_l = gaussian2(fx, fz, -0.48, -0.52, 0.22, 0.22)
                jaw_r = gaussian2(fx, fz,  0.48, -0.52, 0.22, 0.22)
                y += 0.046 * (jaw_l + jaw_r)

            verts.append((center[0] + x, center[1] + y, center[2] + z))

    for i in range(lat_steps):
        for j in range(lon_steps):
            nj = (j + 1) % lon_steps
            a = i * lon_steps + j
            b = i * lon_steps + nj
            c = (i + 1) * lon_steps + nj
            d = (i + 1) * lon_steps + j
            faces.append((a, b, c, d))

    mesh = bpy.data.meshes.new(name + 'Mesh')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    subd = obj.modifiers.new('HeadSurfaceSubdiv', 'SUBSURF')
    subd.subdivision_type = 'CATMULL_CLARK'
    subd.levels = 1
    subd.render_levels = 1
    obj['sourceAuthoringMethod'] = 'CONTINUOUS_CUSTOM_DENSE_MESH'
    obj['facialPrimitiveOverlays'] = False
    obj['baseTopology'] = f'{lat_steps + 1}x{lon_steps}'
    return obj


def geometry_v5(scene):
    skin = bpy.data.materials['ScoutSkin']
    for name in ['ScoutHead', 'ScoutNose', 'ScoutSmile']:
        obj = bpy.data.objects.get(name)
        if obj is not None:
            bpy.data.objects.remove(obj, do_unlink=True)

    head = build_head_v5('ScoutHeadContinuousV5', skin)

    # Eye/socket alignment is part of this bounded variable. Preserve materials,
    # pupils and glints as children-by-coordinate, moving/scaling the whole eye stack.
    for side in ('L', 'R'):
        eye = bpy.data.objects.get(f'ScoutEye{side}')
        pupil = bpy.data.objects.get(f'ScoutPupil{side}')
        glint = bpy.data.objects.get(f'ScoutEyeGlint{side}')
        if eye is not None:
            eye.location.y += 0.055   # seat deeper toward the authored socket
            eye.location.z -= 0.018
            eye.scale.x *= 0.965
            eye.scale.y *= 0.93
            eye.scale.z *= 1.015
        if pupil is not None:
            pupil.location.y += 0.055
            pupil.location.z -= 0.018
            pupil.scale.x *= 0.965
            pupil.scale.y *= 0.93
            pupil.scale.z *= 1.015
        if glint is not None:
            glint.location.y += 0.055
            glint.location.z -= 0.018

    scene['heroVersion'] = 'v5'
    scene['controlledVariable'] = 'HEAD_PROPORTION_AND_EYE_SOCKET_ALIGNMENT'
    scene['sourceMethodInheritedFromV4'] = 'CONTINUOUS_CUSTOM_DENSE_MESH'
    scene['facialPrimitiveOverlays'] = False
    scene['v2BodyFrozen'] = True
    scene['v2HairFrozen'] = True
    scene['v2EarsFrozen'] = True
    scene['v2TabletFrozen'] = True
    scene['v2EnergyTailFrozen'] = True
    scene['materialsInheritedFromV1'] = True
    scene['lightingInheritedFromV1'] = True
    scene['cameraInheritedFromV1'] = True
    return head


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def main():
    output_png, output_blend, output_receipt = parse_args()
    for p in (output_png, output_blend, output_receipt):
        os.makedirs(os.path.dirname(p), exist_ok=True)

    v2.v1.clear_scene()
    scene = bpy.context.scene
    v2.v1.build_scene(scene)
    v2.geometry_v2(scene)
    head = geometry_v5(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)

    if not os.path.isfile(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')
    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)

    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v5',
        'assetName': 'Radar Scout 3D Static Hero v5',
        'sourceReference': 'Radar Scout Character Bible Board.png',
        'sourceReferenceRole': 'ART_DIRECTION_REFERENCE',
        'comparisonBaseline': 'v4_method_direction_and_v2_visual_baseline',
        'controlledVariable': 'HEAD_PROPORTION_AND_EYE_SOCKET_ALIGNMENT',
        'headSourceAuthoringMethod': 'CONTINUOUS_CUSTOM_DENSE_MESH',
        'facialPrimitiveOverlays': False,
        'v2BodyFrozen': True,
        'v2HairFrozen': True,
        'v2EarsFrozen': True,
        'v2TabletFrozen': True,
        'v2EnergyTailFrozen': True,
        'renderSucceeded': True,
        'fileName': os.path.basename(output_png),
        'fileFormat': 'PNG',
        'width': width,
        'height': height,
        'channels': channels,
        'alphaPresent': channels == 4,
        'fileSizeBytes': os.path.getsize(output_png),
        'sha256': sha256_file(output_png),
        'blendSource': output_blend,
        'blendSha256': sha256_file(output_blend),
        'blenderExecutable': sys.argv[0],
        'blenderVersion': bpy.app.version_string,
        'renderMode': 'background_cli',
        'renderEngine': scene.render.engine,
        'cameraName': scene.camera.name if scene.camera else None,
        'cameraIntent': 'CHARACTER_BIBLE_3_4_FRONT_HERO',
        'outputTransparent': bool(scene.render.film_transparent),
        'heroPixelsAuthority': 'BLENDER_RENDER',
        'remotionRedrawAllowed': False,
        'heroAssetRedrawn': False,
        'headObjectName': head.name,
        'headVertexCount': len(head.data.vertices),
        'headPolygonCount': len(head.data.polygons),
        'objectCount': len(bpy.data.objects),
        'materialCount': len(bpy.data.materials),
        'canonicalCandidateModified': False,
        'staticHeroVisualGate': 'PENDING_CONTROLLER_REVIEW',
        'humanSelectedForCanonical': False,
        'riggingPerformed': False,
        'animationPerformed': False,
        'publicationAllowed': False,
        'publicationPerformed': False,
        'analyticsObserved': False,
    }
    with open(output_receipt, 'w', encoding='utf-8') as f:
        json.dump(receipt, f, indent=2)
        f.write('\n')
    print(json.dumps(receipt, indent=2))


if __name__ == '__main__':
    main()
